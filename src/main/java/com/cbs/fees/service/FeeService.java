package com.cbs.fees.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
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
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
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
    private final FeeEngine feeEngine;
    private final AccountPostingService accountPostingService;
    private final CurrentActorProvider currentActorProvider;

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
                        accountPostingService.postDebitAgainstGl(
                                account,
                                TransactionType.FEE_DEBIT,
                                result.getTotalAmount(),
                                buildChargeNarration(fee, triggerEvent),
                                TransactionChannel.SYSTEM,
                                buildPostingRef(triggerRef, fee.getFeeCode(), "CHARGE"),
                                buildChargeLegs(fee, result, account),
                                "FEE_ENGINE",
                                buildSourceRef(triggerEvent, triggerRef, fee.getFeeCode())
                        );

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
            accountPostingService.postDebitAgainstGl(
                    account,
                    TransactionType.FEE_DEBIT,
                    result.getTotalAmount(),
                    buildChargeNarration(fee, fee.getTriggerEvent()),
                    TransactionChannel.SYSTEM,
                    buildPostingRef(triggerRef, feeCode, "CHARGE"),
                    buildChargeLegs(fee, result, account),
                    "FEE_ENGINE",
                    buildSourceRef(fee.getTriggerEvent(), triggerRef, feeCode)
            );

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
    public FeeChargeLog waiveFee(Long chargeLogId, String reason) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(chargeLogId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", chargeLogId));
        String waivedBy = currentActorProvider.getCurrentActor();

        if (!"CHARGED".equals(chargeLog.getStatus())) {
            throw new BusinessException("Fee is not in CHARGED status", "FEE_NOT_CHARGED");
        }

        Account account = accountRepository.findById(chargeLog.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", chargeLog.getAccountId()));
        FeeDefinition fee = feeDefinitionRepository.findByFeeCode(chargeLog.getFeeCode())
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "feeCode", chargeLog.getFeeCode()));
        accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.ADJUSTMENT,
                chargeLog.getTotalAmount(),
                "Fee waiver " + chargeLog.getFeeCode(),
                TransactionChannel.SYSTEM,
                buildPostingRef(chargeLog.getTriggerRef(), chargeLog.getFeeCode(), "WAIVE"),
                buildWaiverLegs(fee, chargeLog, account),
                "FEE_ENGINE",
                buildSourceRef(chargeLog.getTriggerEvent(), chargeLog.getTriggerRef(), chargeLog.getFeeCode())
        );

        chargeLog.setWasWaived(true);
        chargeLog.setWaivedBy(waivedBy);
        chargeLog.setWaiverReason(reason);
        chargeLog.setStatus("WAIVED");
        feeChargeLogRepository.save(chargeLog);

        log.info("Fee waived: chargeId={}, code={}, amount={}, by={}", chargeLogId, chargeLog.getFeeCode(),
                chargeLog.getTotalAmount(), waivedBy);
        return chargeLog;
    }

    /**
     * Reverse a previously charged fee — credits the customer's account and marks the charge as REVERSED.
     */
    @Transactional
    public FeeChargeLog reverseFeeCharge(Long chargeLogId) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(chargeLogId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", chargeLogId));

        if (!"CHARGED".equals(chargeLog.getStatus())) {
            throw new BusinessException("Only CHARGED fees can be reversed (current status: " + chargeLog.getStatus() + ")",
                    "FEE_NOT_REVERSIBLE");
        }

        Account account = accountRepository.findById(chargeLog.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", chargeLog.getAccountId()));
        FeeDefinition fee = feeDefinitionRepository.findByFeeCode(chargeLog.getFeeCode())
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "feeCode", chargeLog.getFeeCode()));

        // Credit the customer's account (reverse the original debit)
        accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.ADJUSTMENT,
                chargeLog.getTotalAmount(),
                "Fee reversal " + chargeLog.getFeeCode(),
                TransactionChannel.SYSTEM,
                buildPostingRef(chargeLog.getTriggerRef(), chargeLog.getFeeCode(), "REVERSE"),
                buildWaiverLegs(fee, chargeLog, account), // Reuse waiver legs — same DR/CR pattern
                "FEE_ENGINE",
                buildSourceRef(chargeLog.getTriggerEvent(), chargeLog.getTriggerRef(), chargeLog.getFeeCode())
        );

        chargeLog.setStatus("REVERSED");
        feeChargeLogRepository.save(chargeLog);

        log.info("Fee reversed: chargeId={}, code={}, amount={}, by={}", chargeLogId, chargeLog.getFeeCode(),
                chargeLog.getTotalAmount(), currentActorProvider.getCurrentActor());
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

    public Page<FeeChargeLog> getAllCharges(org.springframework.data.domain.Pageable pageable) {
        return feeChargeLogRepository.findAll(pageable);
    }

    @Transactional
    public FeeDefinition updateFeeDefinition(FeeDefinition fee) {
        FeeDefinition existing = feeDefinitionRepository.findById(fee.getId())
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "id", fee.getId()));
        // Copy all updatable fields — calcType, tiers, GL codes, tax, applicability, status, dates
        if (fee.getFeeName() != null) existing.setFeeName(fee.getFeeName());
        if (fee.getFeeCategory() != null) existing.setFeeCategory(fee.getFeeCategory());
        if (fee.getTriggerEvent() != null) existing.setTriggerEvent(fee.getTriggerEvent());
        if (fee.getCalculationType() != null) existing.setCalculationType(fee.getCalculationType());
        // Calculation amounts — allow explicit null to clear optional fields
        existing.setFlatAmount(fee.getFlatAmount());
        existing.setPercentage(fee.getPercentage());
        existing.setMinFee(fee.getMinFee());
        existing.setMaxFee(fee.getMaxFee());
        if (fee.getCurrencyCode() != null) existing.setCurrencyCode(fee.getCurrencyCode());
        // Tier config (JSONB) — replace wholesale when provided
        if (fee.getTierConfig() != null) existing.setTierConfig(fee.getTierConfig());
        // Applicability
        if (fee.getApplicableProducts() != null) existing.setApplicableProducts(fee.getApplicableProducts());
        if (fee.getApplicableChannels() != null) existing.setApplicableChannels(fee.getApplicableChannels());
        if (fee.getApplicableCustomerTypes() != null) existing.setApplicableCustomerTypes(fee.getApplicableCustomerTypes());
        // Tax
        if (fee.getTaxApplicable() != null) existing.setTaxApplicable(fee.getTaxApplicable());
        if (fee.getTaxRate() != null) existing.setTaxRate(fee.getTaxRate());
        if (fee.getTaxCode() != null) existing.setTaxCode(fee.getTaxCode());
        // GL codes
        if (fee.getFeeIncomeGlCode() != null) existing.setFeeIncomeGlCode(fee.getFeeIncomeGlCode());
        if (fee.getTaxGlCode() != null) existing.setTaxGlCode(fee.getTaxGlCode());
        // Waiver
        if (fee.getWaivable() != null) existing.setWaivable(fee.getWaivable());
        if (fee.getWaiverAuthorityLevel() != null) existing.setWaiverAuthorityLevel(fee.getWaiverAuthorityLevel());
        // Status and validity
        if (fee.getIsActive() != null) existing.setIsActive(fee.getIsActive());
        if (fee.getEffectiveFrom() != null) existing.setEffectiveFrom(fee.getEffectiveFrom());
        existing.setEffectiveTo(fee.getEffectiveTo()); // allow clearing end date
        log.info("Fee definition updated: id={}, code={}", existing.getId(), existing.getFeeCode());
        return feeDefinitionRepository.save(existing);
    }

    public FeeDefinition getFeeById(Long id) {
        return feeDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "id", id));
    }

    public List<FeeChargeLog> getPendingWaivers() {
        return feeChargeLogRepository.findByStatusOrderByChargedAtDesc("PENDING");
    }

    /** All waiver-related charge logs: PENDING, WAIVED, and REJECTED. */
    public List<FeeChargeLog> getAllWaivers() {
        return feeChargeLogRepository.findByStatusInOrderByChargedAtDesc(
                java.util.List.of("PENDING", "WAIVED", "REJECTED"));
    }

    public Page<FeeChargeLog> getFeeChargeHistory(String feeCode, Pageable pageable) {
        return feeChargeLogRepository.findByFeeCodeOrderByChargedAtDesc(feeCode, pageable);
    }

    @Transactional
    public FeeChargeLog rejectWaiver(Long chargeLogId, String reason) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(chargeLogId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", chargeLogId));
        if (!"PENDING".equals(chargeLog.getStatus()) && !"CHARGED".equals(chargeLog.getStatus())) {
            throw new BusinessException(
                    "Waiver rejection requires PENDING or CHARGED status (current: " + chargeLog.getStatus() + ")",
                    "FEE_WAIVER_NOT_REJECTABLE");
        }
        chargeLog.setStatus("REJECTED");
        chargeLog.setWaiverReason(reason);
        chargeLog.setWaivedBy(currentActorProvider.getCurrentActor());
        log.info("Waiver rejected: chargeId={}, code={}, reason={}", chargeLogId, chargeLog.getFeeCode(), reason);
        return feeChargeLogRepository.save(chargeLog);
    }

    public java.util.Map<String, Object> createBulkPostingJob(String feeId, String scheduledDate) {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", "BFJ-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        result.put("feeId", feeId);
        result.put("feeName", feeDefinitionRepository.findById(Long.valueOf(feeId)).map(FeeDefinition::getFeeName).orElse("Unknown"));
        result.put("affectedAccounts", accountRepository.count());
        result.put("totalAmount", BigDecimal.ZERO);
        result.put("processedCount", 0);
        result.put("failedCount", 0);
        result.put("status", "PENDING");
        result.put("scheduledDate", scheduledDate);
        result.put("createdAt", java.time.Instant.now().toString());
        return result;
    }

    public List<java.util.Map<String, Object>> getBulkJobs() {
        return List.of();
    }

    public java.util.Map<String, Object> previewBulkPost(String feeId) {
        long accountCount = accountRepository.count();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("feeId", feeId);
        result.put("feeName", feeDefinitionRepository.findById(Long.valueOf(feeId)).map(FeeDefinition::getFeeName).orElse("Unknown"));
        result.put("affectedAccounts", accountCount);
        result.put("totalAmount", 0);
        result.put("sampleAccounts", List.of());
        return result;
    }

    private List<AccountPostingService.GlPostingLeg> buildChargeLegs(FeeDefinition fee, FeeEngine.FeeResult result, Account account) {
        List<AccountPostingService.GlPostingLeg> legs = new ArrayList<>();
        if (result.getFeeAmount().compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requireGlCode(fee.getFeeIncomeGlCode(), "fee income", fee.getFeeCode()),
                    AccountPostingService.EntrySide.CREDIT,
                    result.getFeeAmount(),
                    account.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fee income " + fee.getFeeCode(),
                    account.getId(),
                    account.getCustomer() != null ? account.getCustomer().getId() : null
            ));
        }
        if (result.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requireGlCode(fee.getTaxGlCode(), "tax", fee.getFeeCode()),
                    AccountPostingService.EntrySide.CREDIT,
                    result.getTaxAmount(),
                    account.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fee tax " + fee.getFeeCode(),
                    account.getId(),
                    account.getCustomer() != null ? account.getCustomer().getId() : null
            ));
        }
        return legs;
    }

    private List<AccountPostingService.GlPostingLeg> buildWaiverLegs(FeeDefinition fee, FeeChargeLog chargeLog, Account account) {
        List<AccountPostingService.GlPostingLeg> legs = new ArrayList<>();
        if (chargeLog.getFeeAmount().compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requireGlCode(fee.getFeeIncomeGlCode(), "fee income", fee.getFeeCode()),
                    AccountPostingService.EntrySide.DEBIT,
                    chargeLog.getFeeAmount(),
                    account.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fee income reversal " + fee.getFeeCode(),
                    account.getId(),
                    account.getCustomer() != null ? account.getCustomer().getId() : null
            ));
        }
        if (chargeLog.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requireGlCode(fee.getTaxGlCode(), "tax", fee.getFeeCode()),
                    AccountPostingService.EntrySide.DEBIT,
                    chargeLog.getTaxAmount(),
                    account.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fee tax reversal " + fee.getFeeCode(),
                    account.getId(),
                    account.getCustomer() != null ? account.getCustomer().getId() : null
            ));
        }
        return legs;
    }

    private String requireGlCode(String glCode, String purpose, String feeCode) {
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("Fee " + feeCode + " is missing " + purpose + " GL code",
                    "MISSING_FEE_GL_CODE");
        }
        return glCode;
    }

    private String buildChargeNarration(FeeDefinition fee, String triggerEvent) {
        return "Fee charge " + fee.getFeeCode() + (StringUtils.hasText(triggerEvent) ? " for " + triggerEvent : "");
    }

    private String buildPostingRef(String triggerRef, String feeCode, String suffix) {
        String base = StringUtils.hasText(triggerRef) ? triggerRef : feeCode;
        String value = base + ":" + suffix;
        return value.length() <= 50 ? value : value.substring(0, 50);
    }

    private String buildSourceRef(String triggerEvent, String triggerRef, String feeCode) {
        if (StringUtils.hasText(triggerRef)) {
            return triggerRef;
        }
        if (StringUtils.hasText(triggerEvent)) {
            return triggerEvent + ":" + feeCode;
        }
        return feeCode;
    }
}
