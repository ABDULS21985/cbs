package com.cbs.billing.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.billing.entity.*;
import com.cbs.billing.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BillPaymentService {

    private final BillerRepository billerRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    // ========================================================================
    // BILLER MANAGEMENT
    // ========================================================================

    @Transactional
    public Biller createBiller(Biller biller) {
        if (billerRepository.findByBillerCode(biller.getBillerCode()).isPresent()) {
            throw new BusinessException("Biller code already exists: " + biller.getBillerCode(), "DUPLICATE_BILLER");
        }
        Biller saved = billerRepository.save(biller);
        log.info("Biller created: code={}, name={}, category={}", saved.getBillerCode(), saved.getBillerName(), saved.getBillerCategory());
        return saved;
    }

    public List<Biller> getAllActiveBillers() {
        return billerRepository.findByIsActiveTrueOrderByBillerNameAsc();
    }

    public List<Biller> getBillersByCategory(BillerCategory category) {
        return billerRepository.findByBillerCategoryAndIsActiveTrue(category);
    }

    public Biller getBiller(Long id) {
        return billerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "id", id));
    }

    // ========================================================================
    // BILL PAYMENT
    // ========================================================================

    @Transactional
    public BillPayment payBill(Long debitAccountId, String billerCode, String billerCustomerId,
                                 String billerCustomerName, BigDecimal amount) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        Biller biller = billerRepository.findByBillerCode(billerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", billerCode));

        if (!Boolean.TRUE.equals(biller.getIsActive())) {
            throw new BusinessException("Biller is not active", "BILLER_INACTIVE");
        }

        // Validate biller customer ID format
        if (biller.getCustomerIdRegex() != null && !billerCustomerId.matches(biller.getCustomerIdRegex())) {
            throw new BusinessException("Invalid biller customer ID format", "INVALID_BILLER_CUSTOMER_ID");
        }

        // Validate amount range
        if (biller.getMinAmount() != null && amount.compareTo(biller.getMinAmount()) < 0) {
            throw new BusinessException("Amount below biller minimum: " + biller.getMinAmount(), "BELOW_MIN_AMOUNT");
        }
        if (biller.getMaxAmount() != null && amount.compareTo(biller.getMaxAmount()) > 0) {
            throw new BusinessException("Amount exceeds biller maximum: " + biller.getMaxAmount(), "EXCEEDS_MAX_AMOUNT");
        }

        // Calculate fee
        BigDecimal fee = biller.calculateFee(amount);
        BigDecimal totalAmount = "CUSTOMER".equals(biller.getFeeBearer()) ? amount.add(fee) : amount;

        if (debitAccount.getAvailableBalance().compareTo(totalAmount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }

        String paymentRef = "BIL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        BillPayment payment = BillPayment.builder()
                .paymentRef(paymentRef)
                .biller(biller).debitAccount(debitAccount).customer(debitAccount.getCustomer())
                .billerCustomerId(billerCustomerId).billerCustomerName(billerCustomerName)
                .billAmount(amount).feeAmount(fee).totalAmount(totalAmount)
                .currencyCode(biller.getCurrencyCode())
                .status("PROCESSING").build();

        // Debit account
        accountPostingService.postDebit(
                debitAccount,
                TransactionType.DEBIT,
                totalAmount,
                "Bill payment " + paymentRef + " to " + billerCode,
                TransactionChannel.SYSTEM,
                "BILL:" + paymentRef + ":DR");

        // Credit biller settlement account if local
        if (biller.getSettlementAccount() != null) {
            Account settlement = biller.getSettlementAccount();
            accountPostingService.postCredit(
                    settlement,
                    TransactionType.CREDIT,
                    amount,
                    "Bill settlement " + paymentRef + " from " + debitAccount.getAccountNumber(),
                    TransactionChannel.SYSTEM,
                    "BILL:" + paymentRef + ":CR");
            payment.setStatus("COMPLETED");
            payment.setBillerConfirmationRef("CONF-" + paymentRef);
        } else {
            payment.setStatus("COMPLETED"); // Simplified; production would route to biller API
        }

        BillPayment saved = billPaymentRepository.save(payment);
        log.info("Bill payment completed: ref={}, biller={}, amount={}, fee={}", paymentRef, billerCode, amount, fee);
        return saved;
    }

    public BillPayment getPayment(Long id) {
        return billPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BillPayment", "id", id));
    }

    public Page<BillPayment> getCustomerPayments(Long customerId, Pageable pageable) {
        return billPaymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }
}
