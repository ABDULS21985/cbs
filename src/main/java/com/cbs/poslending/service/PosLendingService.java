package com.cbs.poslending.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.poslending.entity.PosLoan;
import com.cbs.poslending.repository.PosLoanRepository;
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
public class PosLendingService {

    private final PosLoanRepository posLoanRepository;

    @Transactional
    public PosLoan originate(PosLoan loan) {
        loan.setPosLoanNumber("POS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        loan.setFinancedAmount(loan.getPurchaseAmount().subtract(loan.getDownPayment()));

        if (loan.getFinancedAmount().signum() <= 0) throw new BusinessException("Financed amount must be positive");

        // Calculate monthly payment
        if (loan.getIsZeroInterest()) {
            loan.setMonthlyPayment(loan.getFinancedAmount().divide(BigDecimal.valueOf(loan.getTermMonths()), 4, RoundingMode.HALF_UP));
        } else {
            BigDecimal effectiveRate = loan.getInterestRate();
            if (loan.getPromotionalRate() != null && loan.getPromotionalEndDate() != null && loan.getPromotionalEndDate().isAfter(LocalDate.now())) {
                effectiveRate = loan.getPromotionalRate();
            }
            double r = effectiveRate.doubleValue() / 1200.0;
            double pmt = loan.getFinancedAmount().doubleValue() * (r * Math.pow(1 + r, loan.getTermMonths())) / (Math.pow(1 + r, loan.getTermMonths()) - 1);
            loan.setMonthlyPayment(BigDecimal.valueOf(pmt).setScale(4, RoundingMode.HALF_UP));
        }

        if (loan.getDeferredPaymentMonths() > 0) loan.setStatus("DEFERRED");
        else loan.setStatus("APPROVED");

        loan.setMaturityDate(LocalDate.now().plusMonths(loan.getTermMonths() + loan.getDeferredPaymentMonths()));
        PosLoan saved = posLoanRepository.save(loan);
        log.info("POS loan originated: number={}, merchant={}, amount={}, term={}m, zero_interest={}",
                saved.getPosLoanNumber(), saved.getMerchantName(), saved.getFinancedAmount(), saved.getTermMonths(), saved.getIsZeroInterest());
        return saved;
    }

    @Transactional
    public PosLoan disburseToMerchant(String posLoanNumber) {
        PosLoan loan = getByNumber(posLoanNumber);
        if (loan.getDisbursedToMerchant()) throw new BusinessException("Already disbursed to merchant");
        loan.setDisbursedToMerchant(true);
        loan.setDisbursementDate(LocalDate.now());
        loan.setStatus("ACTIVE");
        loan.setUpdatedAt(Instant.now());
        log.info("POS loan disbursed to merchant: loan={}, merchant={}, amount={}", posLoanNumber, loan.getMerchantId(), loan.getFinancedAmount());
        return posLoanRepository.save(loan);
    }

    @Transactional
    public PosLoan processReturn(String posLoanNumber) {
        PosLoan loan = getByNumber(posLoanNumber);
        loan.setStatus("RETURNED");
        loan.setSettlementDate(LocalDate.now());
        loan.setUpdatedAt(Instant.now());
        log.info("POS loan returned: loan={}", posLoanNumber);
        return posLoanRepository.save(loan);
    }

    public List<PosLoan> getByCustomer(Long customerId) { return posLoanRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<PosLoan> getByMerchant(String merchantId) { return posLoanRepository.findByMerchantIdAndStatusOrderByCreatedAtDesc(merchantId, "ACTIVE"); }

    private PosLoan getByNumber(String number) {
        return posLoanRepository.findByPosLoanNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("PosLoan", "posLoanNumber", number));
    }
}
