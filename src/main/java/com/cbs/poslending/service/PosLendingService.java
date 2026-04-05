package com.cbs.poslending.service;

import com.cbs.common.audit.CurrentActorProvider;
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

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PosLendingService {

    private static final BigDecimal MAX_LOAN_AMOUNT = new BigDecimal("500000");
    private static final int MAX_TERM_MONTHS = 60;

    private final PosLoanRepository posLoanRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PosLoan originate(PosLoan loan) {
        // Input validation
        if (loan.getCustomerId() == null) {
            throw new BusinessException("customerId is required", "MISSING_CUSTOMER_ID");
        }
        if (loan.getPurchaseAmount() == null || loan.getPurchaseAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("purchaseAmount must be positive", "INVALID_PURCHASE_AMOUNT");
        }
        if (loan.getDownPayment() == null) {
            loan.setDownPayment(BigDecimal.ZERO);
        }
        if (loan.getTermMonths() == null || loan.getTermMonths() <= 0) {
            throw new BusinessException("termMonths must be positive", "INVALID_TERM");
        }
        if (loan.getTermMonths() > MAX_TERM_MONTHS) {
            throw new BusinessException("termMonths cannot exceed " + MAX_TERM_MONTHS, "TERM_TOO_LONG");
        }

        // Credit check: basic eligibility
        if (loan.getPurchaseAmount().compareTo(MAX_LOAN_AMOUNT) > 0) {
            throw new BusinessException("Purchase amount exceeds maximum loan limit of " + MAX_LOAN_AMOUNT, "EXCEEDS_LIMIT");
        }

        // Duplicate loan check: same customer + same merchant + same day
        List<PosLoan> existing = posLoanRepository.findByCustomerIdOrderByCreatedAtDesc(loan.getCustomerId());
        boolean duplicate = existing.stream()
                .anyMatch(e -> loan.getMerchantId() != null && loan.getMerchantId().equals(e.getMerchantId())
                        && "APPROVED".equals(e.getStatus())
                        && e.getCreatedAt() != null
                        && e.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate().equals(LocalDate.now()));
        if (duplicate) {
            throw new BusinessException("Duplicate POS loan: customer already has an approved loan with this merchant today", "DUPLICATE_LOAN");
        }

        loan.setPosLoanNumber("POS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        loan.setFinancedAmount(loan.getPurchaseAmount().subtract(loan.getDownPayment()));

        if (loan.getFinancedAmount().signum() <= 0) {
            throw new BusinessException("Financed amount must be positive", "INVALID_FINANCED_AMOUNT");
        }

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
        log.info("AUDIT: POS loan originated by {}: number={}, merchant={}, amount={}, term={}m, zero_interest={}",
                currentActorProvider.getCurrentActor(), saved.getPosLoanNumber(), saved.getMerchantName(),
                saved.getFinancedAmount(), saved.getTermMonths(), saved.getIsZeroInterest());
        return saved;
    }

    @Transactional
    public PosLoan disburseToMerchant(String posLoanNumber) {
        PosLoan loan = getByNumber(posLoanNumber);
        if (loan.getDisbursedToMerchant()) {
            throw new BusinessException("Already disbursed to merchant", "ALREADY_DISBURSED");
        }
        if (!"APPROVED".equals(loan.getStatus()) && !"DEFERRED".equals(loan.getStatus())) {
            throw new BusinessException("Loan must be APPROVED or DEFERRED to disburse; current status: " + loan.getStatus(), "INVALID_STATE");
        }
        loan.setDisbursedToMerchant(true);
        loan.setDisbursementDate(LocalDate.now());
        loan.setStatus("ACTIVE");
        loan.setUpdatedAt(Instant.now());
        log.info("AUDIT: POS loan disbursed by {}: loan={}, merchant={}, amount={}",
                currentActorProvider.getCurrentActor(), posLoanNumber, loan.getMerchantId(), loan.getFinancedAmount());
        return posLoanRepository.save(loan);
    }

    @Transactional
    public PosLoan processReturn(String posLoanNumber) {
        PosLoan loan = getByNumber(posLoanNumber);
        if (!"ACTIVE".equals(loan.getStatus()) && !"APPROVED".equals(loan.getStatus())) {
            throw new BusinessException("Loan must be ACTIVE or APPROVED to process return; current status: " + loan.getStatus(), "INVALID_STATE");
        }

        loan.setStatus("RETURNED");
        loan.setSettlementDate(LocalDate.now());
        loan.setUpdatedAt(Instant.now());

        // Refund logic: calculate refund amount based on remaining balance
        BigDecimal totalPaid = loan.getMonthlyPayment() != null && loan.getTermMonths() != null
                ? calculatePaidToDate(loan)
                : BigDecimal.ZERO;
        BigDecimal refundAmount = totalPaid.max(BigDecimal.ZERO);
        log.info("AUDIT: POS loan returned by {}: loan={}, refundAmount={}",
                currentActorProvider.getCurrentActor(), posLoanNumber, refundAmount);
        return posLoanRepository.save(loan);
    }

    @Transactional
    public PosLoan processRepayment(String posLoanNumber, BigDecimal amount) {
        PosLoan loan = getByNumber(posLoanNumber);
        if (!"ACTIVE".equals(loan.getStatus())) {
            throw new BusinessException("Loan must be ACTIVE for repayment; current status: " + loan.getStatus(), "INVALID_STATE");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Repayment amount must be positive", "INVALID_AMOUNT");
        }

        loan.setUpdatedAt(Instant.now());
        PosLoan saved = posLoanRepository.save(loan);
        log.info("AUDIT: POS loan repayment by {}: loan={}, amount={}",
                currentActorProvider.getCurrentActor(), posLoanNumber, amount);
        return saved;
    }

    public List<PosLoan> getByCustomer(Long customerId) {
        return posLoanRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<PosLoan> getByMerchant(String merchantId) {
        return posLoanRepository.findByMerchantIdAndStatusOrderByCreatedAtDesc(merchantId, "ACTIVE");
    }

    private PosLoan getByNumber(String number) {
        return posLoanRepository.findByPosLoanNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("PosLoan", "posLoanNumber", number));
    }

    private BigDecimal calculatePaidToDate(PosLoan loan) {
        if (loan.getDisbursementDate() == null || loan.getMonthlyPayment() == null) return BigDecimal.ZERO;
        long monthsSinceDisbursement = java.time.temporal.ChronoUnit.MONTHS.between(loan.getDisbursementDate(), LocalDate.now());
        if (monthsSinceDisbursement <= 0) return BigDecimal.ZERO;
        return loan.getMonthlyPayment().multiply(BigDecimal.valueOf(monthsSinceDisbursement));
    }
}
