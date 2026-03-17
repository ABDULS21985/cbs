package com.cbs.fees.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.engine.FeeEngine;
import com.cbs.fees.entity.*;
import com.cbs.fees.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FeeService {

    private final FeeDefinitionRepository feeDefinitionRepository;
    private final FeeChargeLogRepository feeChargeLogRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final FeeEngine feeEngine;

    /**
     * Charges a fee triggered by a business event.
     * Looks up all active fee definitions for the trigger event,
     * calculates using the FeeEngine, debits the account, and logs.
     */
    @Transactional
    public List<FeeEngine.FeeResult> chargeEventFees(String triggerEvent, Long accountId,
                                                        BigDecimal transactionAmount, String triggerRef) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        List<FeeDefinition> applicableFees = feeDefinitionRepository.findByTriggerEvent(triggerEvent, LocalDate.now());

        return applicableFees.stream()
                .filter(fee -> isApplicableToAccount(fee, account))
                .map(fee -> {
                    FeeEngine.FeeResult result = feeEngine.calculate(fee, transactionAmount);

                    if (result.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                        accountPostingService.postDebit(
                                account,
                                TransactionType.FEE_DEBIT,
                                result.getTotalAmount(),
                                "Fee charge " + fee.getFeeCode(),
                                TransactionChannel.SYSTEM,
                                triggerRef != null ? "FEE:" + fee.getFeeCode() + ":" + triggerRef : null);

                        FeeChargeLog chargeLog = FeeChargeLog.builder()
                                .feeCode(fee.getFeeCode())
                                .accountId(accountId).customerId(account.getCustomer().getId())
                                .baseAmount(transactionAmount)
                                .feeAmount(result.getFeeAmount())
                                .taxAmount(result.getTaxAmount())
                                .totalAmount(result.getTotalAmount())
                                .currencyCode(result.getCurrencyCode())
                                .triggerEvent(triggerEvent).triggerRef(triggerRef)
                                .triggerAmount(transactionAmount)
                                .status("CHARGED").build();
                        feeChargeLogRepository.save(chargeLog);

                        log.info("Fee charged: code={}, account={}, amount={}, tax={}, trigger={}",
                                fee.getFeeCode(), account.getAccountNumber(), result.getFeeAmount(),
                                result.getTaxAmount(), triggerEvent);
                    }

                    return result;
                }).toList();
    }

    /**
     * Charges a specific fee by code.
     */
    @Transactional
    public FeeEngine.FeeResult chargeFee(String feeCode, Long accountId, BigDecimal transactionAmount, String triggerRef) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        FeeDefinition fee = feeDefinitionRepository.findByFeeCode(feeCode)
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "feeCode", feeCode));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, transactionAmount);

        if (result.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postDebit(
                    account,
                    TransactionType.FEE_DEBIT,
                    result.getTotalAmount(),
                    "Fee charge " + feeCode,
                    TransactionChannel.SYSTEM,
                    triggerRef != null ? "FEE:" + feeCode + ":" + triggerRef : null);

            FeeChargeLog chargeLog = FeeChargeLog.builder()
                    .feeCode(feeCode).accountId(accountId).customerId(account.getCustomer().getId())
                    .baseAmount(transactionAmount).feeAmount(result.getFeeAmount())
                    .taxAmount(result.getTaxAmount()).totalAmount(result.getTotalAmount())
                    .currencyCode(result.getCurrencyCode())
                    .triggerEvent(fee.getTriggerEvent()).triggerRef(triggerRef)
                    .triggerAmount(transactionAmount).status("CHARGED").build();
            feeChargeLogRepository.save(chargeLog);
        }

        return result;
    }

    /**
     * Preview fee calculation without charging.
     */
    public FeeEngine.FeeResult previewFee(String feeCode, BigDecimal transactionAmount) {
        FeeDefinition fee = feeDefinitionRepository.findByFeeCode(feeCode)
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "feeCode", feeCode));
        return feeEngine.calculate(fee, transactionAmount);
    }

    /**
     * Waive a previously charged fee.
     */
    @Transactional
    public FeeChargeLog waiveFee(Long chargeLogId, String waivedBy, String reason) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(chargeLogId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", chargeLogId));

        if (!"CHARGED".equals(chargeLog.getStatus())) {
            throw new BusinessException("Fee is not in CHARGED status", "FEE_NOT_CHARGED");
        }

        // Refund the fee
        Account account = accountRepository.findById(chargeLog.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", chargeLog.getAccountId()));
        accountPostingService.postCredit(
                account,
                TransactionType.CREDIT,
                chargeLog.getTotalAmount(),
                "Fee waiver " + chargeLog.getFeeCode(),
                TransactionChannel.SYSTEM,
                "FEE:" + chargeLog.getId() + ":WAIVE");

        chargeLog.setWasWaived(true);
        chargeLog.setWaivedBy(waivedBy);
        chargeLog.setWaiverReason(reason);
        chargeLog.setStatus("WAIVED");
        feeChargeLogRepository.save(chargeLog);

        log.info("Fee waived: chargeId={}, code={}, amount={}, by={}", chargeLogId, chargeLog.getFeeCode(),
                chargeLog.getTotalAmount(), waivedBy);
        return chargeLog;
    }

    // ========================================================================
    // FEE DEFINITION CRUD
    // ========================================================================

    @Transactional
    public FeeDefinition createFeeDefinition(FeeDefinition fee) {
        FeeDefinition saved = feeDefinitionRepository.save(fee);
        log.info("Fee definition created: code={}, type={}, trigger={}", fee.getFeeCode(), fee.getCalculationType(), fee.getTriggerEvent());
        return saved;
    }

    public List<FeeDefinition> getAllActiveFees() {
        return feeDefinitionRepository.findByIsActiveTrueOrderByFeeCategoryAscFeeNameAsc();
    }

    public Page<FeeChargeLog> getAccountFeeHistory(Long accountId, Pageable pageable) {
        return feeChargeLogRepository.findByAccountIdOrderByChargedAtDesc(accountId, pageable);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private boolean isApplicableToAccount(FeeDefinition fee, Account account) {
        if (fee.getApplicableProducts() != null && !"ALL".equals(fee.getApplicableProducts())) {
            if (!fee.getApplicableProducts().contains(account.getProduct().getCode())) return false;
        }
        if (fee.getApplicableCustomerTypes() != null && !"ALL".equals(fee.getApplicableCustomerTypes())) {
            if (!fee.getApplicableCustomerTypes().contains(account.getCustomer().getCustomerType().name())) return false;
        }
        return true;
    }
}
