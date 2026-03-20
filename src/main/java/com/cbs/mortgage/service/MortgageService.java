package com.cbs.mortgage.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.mortgage.entity.MortgageLoan;
import com.cbs.mortgage.repository.MortgageLoanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MortgageService {

    private final MortgageLoanRepository mortgageRepository;

    @Transactional
    public MortgageLoan originate(MortgageLoan mortgage) {
        mortgage.setMortgageNumber("MTG-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Calculate LTV
        BigDecimal ltv = mortgage.getPrincipalAmount()
                .divide(mortgage.getPropertyValuation(), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
        mortgage.setLtvAtOrigination(ltv);
        mortgage.setCurrentLtv(ltv);
        mortgage.setCurrentBalance(mortgage.getPrincipalAmount());
        mortgage.setRemainingMonths(mortgage.getTermMonths());

        // LTV policy check
        if (ltv.compareTo(new BigDecimal("95")) > 0) {
            throw new BusinessException("LTV exceeds maximum 95%: " + ltv + "%");
        }

        // Calculate monthly payment (annuity formula)
        if ("CAPITAL_AND_INTEREST".equals(mortgage.getRepaymentType())) {
            mortgage.setMonthlyPayment(calculateAnnuityPayment(
                    mortgage.getPrincipalAmount(), mortgage.getInterestRate(), mortgage.getTermMonths()));
        } else if ("INTEREST_ONLY".equals(mortgage.getRepaymentType())) {
            mortgage.setMonthlyPayment(mortgage.getPrincipalAmount()
                    .multiply(mortgage.getInterestRate()).divide(new BigDecimal("1200"), 4, RoundingMode.HALF_UP));
        }

        mortgage.setStatus("APPLICATION");
        MortgageLoan saved = mortgageRepository.save(mortgage);
        log.info("Mortgage originated: number={}, type={}, amount={}, ltv={}%, term={}m",
                saved.getMortgageNumber(), saved.getMortgageType(), saved.getPrincipalAmount(), ltv, saved.getTermMonths());
        return saved;
    }

    @Transactional
    public MortgageLoan advanceStatus(String mortgageNumber, String newStatus) {
        MortgageLoan m = getByNumber(mortgageNumber);
        String current = m.getStatus();

        // Valid transitions
        Map<String, List<String>> validTransitions = Map.of(
                "APPLICATION", List.of("VALUATION"),
                "VALUATION", List.of("OFFER", "APPLICATION"),
                "OFFER", List.of("LEGAL", "APPLICATION"),
                "LEGAL", List.of("COMPLETION", "APPLICATION"),
                "COMPLETION", List.of("ACTIVE"),
                "ACTIVE", List.of("ARREARS", "REDEEMED", "PORTED"),
                "ARREARS", List.of("ACTIVE", "DEFAULT"),
                "DEFAULT", List.of("FORECLOSURE", "ACTIVE")
        );

        String targetStatus = (newStatus == null || newStatus.isBlank())
                ? validTransitions.getOrDefault(current, List.of()).stream().findFirst()
                        .orElseThrow(() -> new BusinessException("No next status available from " + current))
                : newStatus;

        if (!validTransitions.getOrDefault(current, List.of()).contains(targetStatus)) {
            throw new BusinessException("Invalid transition: " + current + " → " + targetStatus);
        }

        m.setStatus(targetStatus);
        if ("COMPLETION".equals(targetStatus)) m.setCompletionDate(LocalDate.now());
        if ("ACTIVE".equals(targetStatus) && m.getFirstPaymentDate() == null) {
            m.setFirstPaymentDate(LocalDate.now().plusMonths(1).withDayOfMonth(1));
            m.setMaturityDate(m.getFirstPaymentDate().plusMonths(m.getTermMonths()));
        }
        m.setUpdatedAt(Instant.now());
        log.info("Mortgage status advanced: {} → {}, mortgage={}", current, targetStatus, mortgageNumber);
        return mortgageRepository.save(m);
    }

    @Transactional
    public MortgageLoan makeOverpayment(String mortgageNumber, BigDecimal amount) {
        MortgageLoan m = getByNumber(mortgageNumber);
        if (!"ACTIVE".equals(m.getStatus())) throw new BusinessException("Mortgage not active");
        if (amount == null || amount.signum() <= 0) throw new BusinessException("Overpayment amount must be positive");
        if (amount.compareTo(m.getCurrentBalance()) > 0) throw new BusinessException("Overpayment exceeds current balance");

        BigDecimal maxOverpayment = m.getPrincipalAmount()
                .multiply(m.getAnnualOverpaymentPct()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal newYtd = defaultValue(m.getOverpaymentsYtd()).add(amount);

        if (newYtd.compareTo(maxOverpayment) > 0 && m.getEarlyRepaymentCharge() != null) {
            log.warn("Overpayment exceeds annual allowance: ytd={}, max={}, ERC may apply", newYtd, maxOverpayment);
        }

        m.setCurrentBalance(m.getCurrentBalance().subtract(amount));
        m.setOverpaymentsYtd(newYtd);
        m.setCurrentLtv(m.calculateCurrentLtv());
        if (m.getRemainingMonths() != null && m.getRemainingMonths() > 0 && m.getMonthlyPayment() != null && m.getMonthlyPayment().signum() > 0) {
            BigDecimal monthsLeft = m.getCurrentBalance()
                    .divide(m.getMonthlyPayment(), 0, RoundingMode.CEILING);
            m.setRemainingMonths(Math.max(0, monthsLeft.intValue()));
        }
        m.setUpdatedAt(Instant.now());
        log.info("Mortgage overpayment: mortgage={}, amount={}, newBalance={}", mortgageNumber, amount, m.getCurrentBalance());
        return mortgageRepository.save(m);
    }

    @Transactional
    public MortgageLoan revertToSvr(String mortgageNumber) {
        MortgageLoan m = getByNumber(mortgageNumber);
        if (m.getReversionRate() == null) throw new BusinessException("No reversion rate set");
        BigDecimal oldRate = m.getInterestRate();
        m.setInterestRate(m.getReversionRate());
        m.setRateType("VARIABLE");
        if ("CAPITAL_AND_INTEREST".equals(m.getRepaymentType())) {
            m.setMonthlyPayment(calculateAnnuityPayment(m.getCurrentBalance(), m.getInterestRate(), m.getRemainingMonths()));
        }
        m.setUpdatedAt(Instant.now());
        log.info("Mortgage reverted to SVR: mortgage={}, {}% → {}%", mortgageNumber, oldRate, m.getInterestRate());
        return mortgageRepository.save(m);
    }

    public List<MortgageLoan> getFixedRateExpiring() { return mortgageRepository.findFixedRateExpiring(); }
    public List<MortgageLoan> getHighLtvMortgages(BigDecimal maxLtv) { return mortgageRepository.findHighLtvMortgages(maxLtv); }
    public List<MortgageLoan> getByCustomer(Long customerId) { return mortgageRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public MortgageLoan getById(Long id) {
        return mortgageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MortgageLoan", "id", id));
    }

    public List<Map<String, Object>> getLtvHistory(Long id) {
        MortgageLoan mortgage = getById(id);
        List<Map<String, Object>> history = new ArrayList<>();

        history.add(Map.of(
                "date", mortgage.getValuationDate() != null ? mortgage.getValuationDate().toString() : mortgage.getCreatedAt().toString(),
                "ltv", defaultValue(mortgage.getLtvAtOrigination()),
                "outstanding", defaultValue(mortgage.getPrincipalAmount()),
                "propertyValue", defaultValue(mortgage.getPropertyValuation())
        ));

        LocalDate currentDate = mortgage.getUpdatedAt() != null
                ? mortgage.getUpdatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                : LocalDate.now();
        String openingDate = history.get(0).get("date").toString();
        if (!currentDate.toString().equals(openingDate)) {
            history.add(Map.of(
                    "date", currentDate.toString(),
                    "ltv", defaultValue(mortgage.getCurrentLtv()),
                    "outstanding", defaultValue(mortgage.getCurrentBalance()),
                    "propertyValue", defaultValue(mortgage.getPropertyValuation())
            ));
        }

        return history;
    }

    private MortgageLoan getByNumber(String number) {
        return mortgageRepository.findByMortgageNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("MortgageLoan", "mortgageNumber", number));
    }

    private BigDecimal calculateAnnuityPayment(BigDecimal principal, BigDecimal annualRate, int months) {
        double r = annualRate.doubleValue() / 1200.0;
        double pmt = principal.doubleValue() * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        return BigDecimal.valueOf(pmt).setScale(4, RoundingMode.HALF_UP);
    }

    public java.util.List<MortgageLoan> getAllMortgages() {
        return mortgageRepository.findAll();
    }

    private BigDecimal defaultValue(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

}
