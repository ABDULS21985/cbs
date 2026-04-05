package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.entity.FeeCalculationType;
import com.cbs.fees.entity.FeeCategory;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.entity.FeeDefinition;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.fees.repository.FeeDefinitionRepository;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.islamic.repository.IslamicFeeWaiverRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.service.CharityFundService;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.SpelEvaluationException;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.MapAccessor;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicFeeService {

    private final IslamicFeeConfigurationRepository configRepository;
    private final FeeDefinitionRepository feeDefinitionRepository;
    private final FeeChargeLogRepository feeChargeLogRepository;
    private final IslamicFeeWaiverRepository waiverRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final AccountPostingService accountPostingService;
    private final ShariahScreeningService shariahScreeningService;
    private final CharityFundService charityFundService;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final CurrentTenantResolver tenantResolver;
    private final ObjectProvider<LatePenaltyService> latePenaltyServiceProvider;

    private final ExpressionParser spelParser = new SpelExpressionParser();

    public IslamicFeeConfiguration createFee(IslamicFeeRequests.SaveIslamicFeeRequest request) {
        validateFeeRequest(request, true);
        if (configRepository.findByFeeCode(request.getFeeCode()).isPresent()) {
            throw new BusinessException("Islamic fee configuration already exists: " + request.getFeeCode(), "ISLAMIC_FEE_DUPLICATE");
        }

        FeeDefinition baseFee = resolveOrCreateBaseFee(request, null);
        IslamicFeeConfiguration configuration = mapRequestToConfiguration(request, null);
        configuration.setBaseFeeId(baseFee.getId());
        configuration.setTenantId(tenantResolver.getCurrentTenantId());
        configuration.setStatus(resolveInitialStatus(request));
        return configRepository.save(configuration);
    }

    public IslamicFeeConfiguration updateFee(Long feeId, IslamicFeeRequests.SaveIslamicFeeRequest request) {
        IslamicFeeConfiguration existing = getFee(feeId);
        validateFeeRequest(request, false);

        boolean materialChange = changed(existing.getShariahClassification(), request.getShariahClassification())
                || changed(existing.getFeeType(), request.getFeeType())
                || changed(IslamicFeeSupport.money(existing.getFlatAmount()), IslamicFeeSupport.money(request.getFlatAmount()))
                || changed(IslamicFeeSupport.money(existing.getPercentageRate()), IslamicFeeSupport.money(request.getPercentageRate()));

        FeeDefinition baseFee = resolveOrCreateBaseFee(request, existing.getBaseFeeId());
        IslamicFeeConfiguration updated = mapRequestToConfiguration(request, existing);
        updated.setId(existing.getId());
        updated.setBaseFeeId(baseFee.getId());
        updated.setTenantId(existing.getTenantId());
        if (materialChange) {
            updated.setSsbApproved(false);
            updated.setSsbApprovalDate(null);
            updated.setSsbApprovalRef(null);
            updated.setStatus("PENDING_SSB_APPROVAL");
        } else if (!StringUtils.hasText(updated.getStatus())) {
            updated.setStatus(existing.getStatus());
        }
        return configRepository.save(updated);
    }

    public void ssbApproveFee(Long feeId, String approvedBy, String approvalRef) {
        IslamicFeeConfiguration configuration = getFee(feeId);
        configuration.setSsbApproved(true);
        configuration.setSsbApprovalDate(LocalDate.now());
        configuration.setSsbApprovalRef(approvalRef);
        if (!"PROHIBITED".equals(configuration.getShariahClassification())) {
            configuration.setStatus("ACTIVE");
        }
        configRepository.save(configuration);
        log.info("SSB approved Islamic fee {} by {}", configuration.getFeeCode(), approvedBy);
    }

    public void suspendFee(Long feeId, String reason) {
        IslamicFeeConfiguration configuration = getFee(feeId);
        configuration.setStatus("SUSPENDED");
        configRepository.save(configuration);
        log.info("Suspended Islamic fee {} reason={}", configuration.getFeeCode(), reason);
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.FeeCalculationResult calculateFee(Long feeConfigId,
                                                                 IslamicFeeResponses.FeeCalculationContext context) {
        IslamicFeeConfiguration configuration = getFee(feeConfigId);
        return calculateFee(configuration, context);
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.FeeCalculationResult calculateFeeByCode(String feeCode,
                                                                       IslamicFeeResponses.FeeCalculationContext context) {
        return calculateFee(getFeeByCode(feeCode), context);
    }

    public IslamicFeeResponses.LatePenaltyResult chargeLatePaymentFee(Long contractId,
                                                                      Long installmentId,
                                                                      BigDecimal overdueAmount,
                                                                      int daysOverdue) {
        LatePenaltyService latePenaltyService = latePenaltyServiceProvider.getIfAvailable();
        if (latePenaltyService == null) {
            throw new BusinessException("Late penalty service is unavailable", "LATE_PENALTY_SERVICE_UNAVAILABLE");
        }
        return latePenaltyService.processLatePenalty(contractId, installmentId, overdueAmount, daysOverdue);
    }

    public IslamicFeeResponses.FeeChargeResult chargeFee(IslamicFeeRequests.ChargeFeeRequest request) {
        IslamicFeeConfiguration configuration = getFeeByCode(request.getFeeCode());
        ensureChargeable(configuration);
        Account account = accountRepository.findByIdWithProduct(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));
        Long effectiveCustomerId = request.getCustomerId() != null
                ? request.getCustomerId()
                : account.getCustomer() != null ? account.getCustomer().getId() : null;

        IslamicFeeResponses.FeeCalculationContext context = IslamicFeeResponses.FeeCalculationContext.builder()
                .transactionAmount(request.getTransactionAmount())
                .financingAmount(request.getFinancingAmount())
                .accountBalance(request.getAccountBalance())
                .customerSegment(request.getCustomerSegment())
                .tenorMonths(request.getTenorMonths())
                .transferType(request.getTransferType())
                .currencyCode(StringUtils.hasText(request.getCurrencyCode()) ? request.getCurrencyCode() : account.getCurrencyCode())
                .build();
        IslamicFeeResponses.FeeCalculationResult calculation = calculateFee(configuration, context);
        ChargeAdjustment waiverAdjustment = resolvePreChargeWaiver(configuration, request, calculation, effectiveCustomerId);
        if (waiverAdjustment.deferUntil() != null) {
            return buildSuppressedChargeResult(configuration, calculation,
                    "Fee deferred until " + waiverAdjustment.deferUntil(), waiverAdjustment.waiverId(), request.getTriggerRef());
        }
        if (waiverAdjustment.convertedFeeCode() != null) {
            IslamicFeeRequests.ChargeFeeRequest convertedRequest = IslamicFeeRequests.ChargeFeeRequest.builder()
                    .feeCode(waiverAdjustment.convertedFeeCode())
                    .accountId(request.getAccountId())
                    .transactionAmount(request.getTransactionAmount())
                    .financingAmount(request.getFinancingAmount())
                    .accountBalance(request.getAccountBalance())
                    .customerSegment(request.getCustomerSegment())
                    .tenorMonths(request.getTenorMonths())
                    .contractId(request.getContractId())
                    .contractRef(request.getContractRef())
                    .contractTypeCode(request.getContractTypeCode())
                    .installmentId(request.getInstallmentId())
                    .transactionType(request.getTransactionType())
                    .triggerRef(request.getTriggerRef())
                    .narration(request.getNarration())
                    .currencyCode(request.getCurrencyCode())
                    .customerId(request.getCustomerId())
                    .build();
            IslamicFeeResponses.FeeChargeResult convertedResult = chargeFee(convertedRequest);
            consumePreChargeWaiver(waiverAdjustment.waiverId(),
                    convertedResult.getJournalRef() != null ? convertedResult.getJournalRef() : convertedResult.getMessage());
            return convertedResult;
        }
        if (waiverAdjustment.overrideAmount() != null) {
            calculation = overrideCalculatedAmount(calculation, waiverAdjustment.overrideAmount(), waiverAdjustment.message());
        }
        if (calculation.getCalculatedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            if (waiverAdjustment.waiverId() != null) {
                consumePreChargeWaiver(waiverAdjustment.waiverId(),
                        StringUtils.hasText(request.getTriggerRef()) ? request.getTriggerRef() : IslamicFeeSupport.nextRef("IFW"));
                return buildSuppressedChargeResult(configuration, calculation,
                        waiverAdjustment.message() != null ? waiverAdjustment.message() : "Fee waived before charge",
                        waiverAdjustment.waiverId(),
                        request.getTriggerRef());
            }
            throw new BusinessException("Calculated fee amount must be positive", "ISLAMIC_FEE_NON_POSITIVE");
        }

        // Idempotency check: prevent duplicate fee charges for the same trigger
        String idempotencyRef = StringUtils.hasText(request.getTriggerRef()) ? request.getTriggerRef() : null;
        if (idempotencyRef != null && feeChargeLogRepository.existsByTriggerRef(idempotencyRef)) {
            throw new BusinessException(
                    "Fee already charged for trigger: " + idempotencyRef,
                    HttpStatus.CONFLICT,
                    "DUPLICATE_FEE_CHARGE");
        }

        shariahScreeningService.ensureAllowed(shariahScreeningService.preScreenTransaction(
                ShariahScreeningRequest.builder()
                        .transactionRef(request.getTriggerRef())
                        .transactionType(StringUtils.hasText(request.getTransactionType()) ? request.getTransactionType() : "FEE_CHARGE")
                        .amount(calculation.getCalculatedAmount())
                        .currencyCode(calculation.getCurrencyCode())
                        .contractRef(request.getContractRef())
                        .contractTypeCode(request.getContractTypeCode())
                        .customerId(effectiveCustomerId)
                        .purpose(configuration.getDescription())
                        .additionalContext(Map.of(
                                "late_payment_charity", configuration.isCharityRouted(),
                                "has_interest_component", false
                        ))
                        .build()
        ));

        String postingRef = StringUtils.hasText(request.getTriggerRef()) ? request.getTriggerRef() : IslamicFeeSupport.nextRef("IFC");
        String narration = StringUtils.hasText(request.getNarration())
                ? request.getNarration()
                : "Islamic fee charge " + configuration.getFeeCode();
        String glAccount = calculation.getGlAccountCode();
        var journalTxn = accountPostingService.postDebitAgainstGl(
                account,
                TransactionType.FEE_DEBIT,
                calculation.getCalculatedAmount(),
                narration,
                TransactionChannel.SYSTEM,
                postingRef,
                List.of(accountPostingService.balanceLeg(
                        glAccount,
                        AccountPostingService.EntrySide.CREDIT,
                        calculation.getCalculatedAmount(),
                        account.getCurrencyCode(),
                        BigDecimal.ONE,
                        narration,
                        account.getId(),
                        account.getCustomer() != null ? account.getCustomer().getId() : null
                )),
                "ISLAMIC_FEE_ENGINE",
                postingRef
        );

        Long charityEntryId = null;
        if (configuration.isCharityRouted()) {
            charityEntryId = charityFundService.recordPenaltyInflow(
                    configuration.getFeeCode() + ":" + postingRef,
                    calculation.getCalculatedAmount(),
                    request.getContractRef(),
                    request.getContractTypeCode(),
                    effectiveCustomerId,
                    journalTxn.getJournal() != null ? journalTxn.getJournal().getJournalNumber() : null,
                    calculation.getCurrencyCode()
            ).getId();
        }

        FeeChargeLog chargeLog = feeChargeLogRepository.save(FeeChargeLog.builder()
                .feeCode(configuration.getFeeCode())
                .accountId(account.getId())
                .customerId(effectiveCustomerId)
                .baseAmount(IslamicFeeSupport.nvl(request.getTransactionAmount()))
                .feeAmount(calculation.getCalculatedAmount())
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(calculation.getCalculatedAmount())
                .currencyCode(calculation.getCurrencyCode())
                .triggerEvent(StringUtils.hasText(request.getTransactionType()) ? request.getTransactionType() : "FEE_CHARGE")
                .triggerRef(postingRef)
                .triggerAmount(request.getTransactionAmount())
                .journalRef(journalTxn.getJournal() != null ? journalTxn.getJournal().getJournalNumber() : null)
                .islamicFeeConfigurationId(configuration.getId())
                .charityRouted(configuration.isCharityRouted())
                .charityFundEntryId(charityEntryId)
                .contractId(request.getContractId())
                .contractTypeCode(request.getContractTypeCode())
                .installmentId(request.getInstallmentId())
                .notes(calculation.getCalculationBreakdown())
                .status("CHARGED")
                .build());
        if (waiverAdjustment.waiverId() != null) {
            consumePreChargeWaiver(waiverAdjustment.waiverId(), chargeLog.getJournalRef() != null ? chargeLog.getJournalRef() : postingRef);
        }

        return IslamicFeeResponses.FeeChargeResult.builder()
                .feeChargeLogId(chargeLog.getId())
                .chargedAmount(calculation.getCalculatedAmount())
                .journalRef(chargeLog.getJournalRef())
                .charityRouted(configuration.isCharityRouted())
                .charityFundEntryId(charityEntryId)
                .feeCode(configuration.getFeeCode())
                .classification(configuration.getShariahClassification())
                .glAccountCode(glAccount)
                .message(configuration.isCharityRouted()
                        ? "Penalty charged and routed to charity"
                        : "Fee charged successfully")
                .build();
    }

    @Transactional(readOnly = true)
    public IslamicFeeConfiguration getFee(Long feeId) {
        return configRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "id", feeId));
    }

    @Transactional(readOnly = true)
    public IslamicFeeConfiguration getFeeByCode(String feeCode) {
        return configRepository.findByFeeCode(feeCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "feeCode", feeCode));
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> getFeesForProduct(String productCode) {
        String contractType = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .map(template -> template.getContractType().getCode())
                .orElse(null);
        // Use targeted query by status instead of loading all fee configurations
        return configRepository.findByStatusOrderByFeeCodeAsc("ACTIVE").stream()
                .filter(cfg -> cfg.isEffectiveOn(LocalDate.now()))
                .filter(cfg -> IslamicFeeSupport.matchesAny(productCode, cfg.getApplicableProductCodes()))
                .filter(cfg -> IslamicFeeSupport.matchesAny(contractType, cfg.getApplicableContractTypes()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> getFeesForContractType(String contractTypeCode) {
        return configRepository.findAll().stream()
                .filter(cfg -> "ACTIVE".equals(cfg.getStatus()))
                .filter(cfg -> cfg.isEffectiveOn(LocalDate.now()))
                .filter(cfg -> IslamicFeeSupport.matchesAny(contractTypeCode, cfg.getApplicableContractTypes()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> getCharityRoutedFees() {
        return configRepository.findByShariahClassificationOrderByFeeCodeAsc("PENALTY_CHARITY");
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> getFeesPendingSsbApproval() {
        return configRepository.findByStatusOrderByFeeCodeAsc("PENDING_SSB_APPROVAL");
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> getActiveFeesByCategory(String feeCategory) {
        return configRepository.findByFeeCategoryAndStatusOrderByFeeCodeAsc(feeCategory, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeConfiguration> listFees(String category, String classification, String status) {
        return configRepository.findAll().stream()
                .filter(cfg -> !StringUtils.hasText(category) || category.equalsIgnoreCase(cfg.getFeeCategory()))
                .filter(cfg -> !StringUtils.hasText(classification) || classification.equalsIgnoreCase(cfg.getShariahClassification()))
                .filter(cfg -> !StringUtils.hasText(status) || status.equalsIgnoreCase(cfg.getStatus()))
                .toList();
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.ProductFeeSchedule getProductFeeSchedule(String productCode) {
        String productName = productRepository.findByCode(productCode).map(product -> product.getName()).orElse(productCode);
        List<IslamicFeeResponses.ProductFeeSchedule.FeeScheduleEntry> fees = getFeesForProduct(productCode).stream()
                .map(configuration -> IslamicFeeResponses.ProductFeeSchedule.FeeScheduleEntry.builder()
                        .feeCode(configuration.getFeeCode())
                        .feeName(configuration.getName())
                        .feeNameAr(configuration.getNameAr())
                        .feeType(configuration.getFeeType())
                        .amount(configuration.getFlatAmount())
                        .rate(configuration.getPercentageRate())
                        .shariahClassification(configuration.getShariahClassification())
                        .charityRouted(configuration.isCharityRouted())
                        .chargeFrequency(configuration.getChargeFrequency())
                        .chargeTiming(configuration.getChargeTiming())
                        .shariahJustification(configuration.getShariahJustification())
                        .build())
                .toList();
        return IslamicFeeResponses.ProductFeeSchedule.builder()
                .productCode(productCode)
                .productName(productName)
                .fees(fees)
                .build();
    }

    @Transactional(readOnly = true)
    public IslamicFeeConfiguration findApplicableLatePenaltyFee(String contractTypeCode, String productCode) {
        return configRepository.findAll().stream()
                .filter(cfg -> "LATE_PAYMENT".equals(cfg.getFeeCategory()))
                .filter(cfg -> "PENALTY_CHARITY".equals(cfg.getShariahClassification()))
                .filter(cfg -> "ACTIVE".equals(cfg.getStatus()))
                .filter(IslamicFeeConfiguration::isSsbApproved)
                .filter(cfg -> cfg.isEffectiveOn(LocalDate.now()))
                .filter(cfg -> IslamicFeeSupport.matchesAny(contractTypeCode, cfg.getApplicableContractTypes()))
                .filter(cfg -> IslamicFeeSupport.matchesAny(productCode, cfg.getApplicableProductCodes()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No active late penalty configuration found", "LATE_PENALTY_CONFIG_NOT_FOUND"));
    }

    private IslamicFeeResponses.FeeCalculationResult calculateFee(IslamicFeeConfiguration configuration,
                                                                  IslamicFeeResponses.FeeCalculationContext context) {
        BigDecimal amount;
        String breakdown;
        String antiRibaNote = null;
        switch (configuration.getFeeType()) {
            case "FLAT" -> {
                amount = IslamicFeeSupport.money(configuration.getFlatAmount());
                breakdown = "Flat fee: " + amount;
            }
            case "PERCENTAGE" -> {
                BigDecimal base = resolvePercentageBase(configuration, context);
                amount = IslamicFeeSupport.money(base.multiply(IslamicFeeSupport.nvl(configuration.getPercentageRate()))
                        .divide(IslamicFeeSupport.HUNDRED, 8, RoundingMode.HALF_UP));
                breakdown = IslamicFeeSupport.feeCalcBreakdown("Percentage fee", base, configuration.getPercentageRate(), amount);
            }
            case "TIERED_FLAT", "TIERED_PERCENTAGE" -> {
                amount = calculateDecisionTableFee(configuration, context);
                breakdown = "Decision table fee: " + amount;
            }
            case "FORMULA" -> {
                amount = calculateFormulaFee(configuration, context);
                breakdown = "Formula fee: " + amount;
            }
            default -> throw new BusinessException("Unsupported Islamic fee type: " + configuration.getFeeType(), "UNSUPPORTED_ISLAMIC_FEE_TYPE");
        }

        if (configuration.getMinimumAmount() != null && amount.compareTo(configuration.getMinimumAmount()) < 0) {
            amount = IslamicFeeSupport.money(configuration.getMinimumAmount());
        }
        if (configuration.getMaximumAmount() != null && amount.compareTo(configuration.getMaximumAmount()) > 0) {
            amount = IslamicFeeSupport.money(configuration.getMaximumAmount());
            antiRibaNote = "Fee capped at configured maximum";
        }

        boolean antiRibaPassed = true;
        if (configuration.isPercentageOfFinancingProhibited()
                && context.getFinancingAmount() != null
                && context.getFinancingAmount().compareTo(BigDecimal.ZERO) > 0
                && configuration.getMaximumAsPercentOfFinancing() != null) {
            BigDecimal cap = IslamicFeeSupport.money(context.getFinancingAmount()
                    .multiply(configuration.getMaximumAsPercentOfFinancing())
                    .divide(IslamicFeeSupport.HUNDRED, 8, RoundingMode.HALF_UP));
            if (amount.compareTo(cap) > 0) {
                amount = cap;
                antiRibaPassed = false;
                antiRibaNote = "Fee capped at " + configuration.getMaximumAsPercentOfFinancing() + "% of financing amount";
            }
        }

        return IslamicFeeResponses.FeeCalculationResult.builder()
                .feeConfigId(configuration.getId())
                .feeCode(configuration.getFeeCode())
                .feeName(configuration.getName())
                .calculatedAmount(IslamicFeeSupport.money(amount))
                .calculationBreakdown(breakdown)
                .classification(configuration.getShariahClassification())
                .charityRouted(configuration.isCharityRouted())
                .glAccountCode(configuration.isCharityRouted()
                        ? configuration.getCharityGlAccount()
                        : configuration.getIncomeGlAccount())
                .currencyCode(StringUtils.hasText(context.getCurrencyCode()) ? context.getCurrencyCode() : "SAR")
                .antiRibaCheckPassed(antiRibaPassed)
                .antiRibaNote(antiRibaNote)
                .build();
    }

    private BigDecimal calculateDecisionTableFee(IslamicFeeConfiguration configuration,
                                                 IslamicFeeResponses.FeeCalculationContext context) {
        if (!StringUtils.hasText(configuration.getTierDecisionTableCode())) {
            throw new BusinessException("Tiered Islamic fee requires decision table code", "ISLAMIC_FEE_DECISION_TABLE_REQUIRED");
        }
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("transferType", context.getTransferType());
        inputs.put("amount", context.getTransactionAmount());
        inputs.put("penaltyMode", configuration.getFeeType().contains("PERCENTAGE") ? "PERCENTAGE" : "FLAT");
        inputs.put("daysOverdue", context.getDaysOverdue());
        DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(configuration.getTierDecisionTableCode(), inputs);
        if (!Boolean.TRUE.equals(result.getMatched())) {
            throw new BusinessException("No matching decision table row for " + configuration.getFeeCode(), "ISLAMIC_FEE_TIER_NOT_FOUND");
        }
        Object value = configuration.getFeeType().contains("PERCENTAGE")
                ? result.getOutputs().get("rate")
                : result.getOutputs().get("flatAmount");
        BigDecimal resolved = IslamicFeeSupport.toDecimal(value);
        if (configuration.getFeeType().contains("PERCENTAGE")) {
            return IslamicFeeSupport.money(resolvePercentageBase(configuration, context)
                    .multiply(IslamicFeeSupport.nvl(resolved))
                    .divide(IslamicFeeSupport.HUNDRED, 8, RoundingMode.HALF_UP));
        }
        return IslamicFeeSupport.money(resolved);
    }

    private BigDecimal calculateFormulaFee(IslamicFeeConfiguration configuration,
                                           IslamicFeeResponses.FeeCalculationContext context) {
        if (!StringUtils.hasText(configuration.getFormulaExpression())) {
            return BigDecimal.ZERO;
        }
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("transactionAmount", context.getTransactionAmount());
            variables.put("financingAmount", context.getFinancingAmount());
            variables.put("accountBalance", context.getAccountBalance());
            variables.put("tenorMonths", context.getTenorMonths());
            variables.put("daysOverdue", context.getDaysOverdue());
            SimpleEvaluationContext evaluationContext = SimpleEvaluationContext
                    .forPropertyAccessors(new MapAccessor())
                    .build();
            Object result = spelParser.parseExpression(configuration.getFormulaExpression()).getValue(evaluationContext, variables);
            return IslamicFeeSupport.money(IslamicFeeSupport.toDecimal(result));
        } catch (SpelEvaluationException e) {
            throw new BusinessException(
                    "Fee formula evaluation failed for " + configuration.getFeeCode() + ": " + e.getMessage(),
                    HttpStatus.BAD_REQUEST,
                    "ISLAMIC_FEE_FORMULA_ERROR");
        } catch (Exception e) {
            throw new BusinessException(
                    "Unexpected error evaluating fee formula for " + configuration.getFeeCode() + ": " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "ISLAMIC_FEE_FORMULA_ERROR");
        }
    }

    private BigDecimal resolvePercentageBase(IslamicFeeConfiguration configuration,
                                             IslamicFeeResponses.FeeCalculationContext context) {
        BigDecimal transactionAmount = IslamicFeeSupport.nvl(context.getTransactionAmount());
        BigDecimal accountBalance = IslamicFeeSupport.nvl(context.getAccountBalance());
        BigDecimal financingAmount = IslamicFeeSupport.nvl(context.getFinancingAmount());
        if ("ACCOUNT_MAINTENANCE".equals(configuration.getFeeCategory()) && accountBalance.compareTo(BigDecimal.ZERO) > 0) {
            return accountBalance;
        }
        if (transactionAmount.compareTo(BigDecimal.ZERO) > 0) {
            return transactionAmount;
        }
        if (accountBalance.compareTo(BigDecimal.ZERO) > 0) {
            return accountBalance;
        }
        if (!configuration.isPercentageOfFinancingProhibited() && financingAmount.compareTo(BigDecimal.ZERO) > 0) {
            return financingAmount;
        }
        if (configuration.isPercentageOfFinancingProhibited() && financingAmount.compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Fee cannot be calculated as a percentage of financing principal",
                    "ISLAMIC_FEE_FINANCING_BASE_PROHIBITED");
        }
        throw new BusinessException("Percentage fee requires a non-zero transaction or balance base",
                "ISLAMIC_FEE_PERCENTAGE_BASE_REQUIRED");
    }

    private IslamicFeeResponses.FeeCalculationResult overrideCalculatedAmount(IslamicFeeResponses.FeeCalculationResult calculation,
                                                                              BigDecimal overrideAmount,
                                                                              String note) {
        return IslamicFeeResponses.FeeCalculationResult.builder()
                .feeConfigId(calculation.getFeeConfigId())
                .feeCode(calculation.getFeeCode())
                .feeName(calculation.getFeeName())
                .calculatedAmount(IslamicFeeSupport.money(overrideAmount))
                .calculationBreakdown(note != null ? note : calculation.getCalculationBreakdown())
                .classification(calculation.getClassification())
                .charityRouted(calculation.isCharityRouted())
                .glAccountCode(calculation.getGlAccountCode())
                .currencyCode(calculation.getCurrencyCode())
                .antiRibaCheckPassed(calculation.isAntiRibaCheckPassed())
                .antiRibaNote(calculation.getAntiRibaNote())
                .build();
    }

    private IslamicFeeResponses.FeeChargeResult buildSuppressedChargeResult(IslamicFeeConfiguration configuration,
                                                                            IslamicFeeResponses.FeeCalculationResult calculation,
                                                                            String message,
                                                                            Long waiverId,
                                                                            String reference) {
        return IslamicFeeResponses.FeeChargeResult.builder()
                .feeChargeLogId(null)
                .chargedAmount(BigDecimal.ZERO.setScale(2))
                .journalRef(reference)
                .charityRouted(configuration.isCharityRouted())
                .charityFundEntryId(null)
                .feeCode(configuration.getFeeCode())
                .classification(configuration.getShariahClassification())
                .glAccountCode(calculation.getGlAccountCode())
                .message(message)
                .build();
    }

    private ChargeAdjustment resolvePreChargeWaiver(IslamicFeeConfiguration configuration,
                                                    IslamicFeeRequests.ChargeFeeRequest request,
                                                    IslamicFeeResponses.FeeCalculationResult calculation,
                                                    Long effectiveCustomerId) {
        IslamicFeeWaiver waiver = waiverRepository.findApplicablePreChargeWaivers(
                        configuration.getId(),
                        request.getAccountId(),
                        request.getContractId(),
                        effectiveCustomerId)
                .stream()
                .filter(candidate -> matchesChargeContext(candidate, request, effectiveCustomerId))
                .filter(this::isEligibleForChargeSuppression)
                .findFirst()
                .orElse(null);
        if (waiver == null) {
            return ChargeAdjustment.none();
        }
        return switch (IslamicFeeSupport.normalize(waiver.getWaiverType())) {
            case "FULL_WAIVER" -> new ChargeAdjustment(waiver.getId(), BigDecimal.ZERO.setScale(2), null, null,
                    "Fee waived before charge");
            case "PARTIAL_WAIVER" -> new ChargeAdjustment(waiver.getId(),
                    calculation.getCalculatedAmount().min(IslamicFeeSupport.money(waiver.getRemainingAmount())),
                    null,
                    null,
                    "Partial waiver applied before charge");
            case "DEFERRAL" -> waiver.getDeferredUntil() != null && LocalDate.now().isBefore(waiver.getDeferredUntil())
                    ? new ChargeAdjustment(waiver.getId(), null, waiver.getDeferredUntil(), null, "Fee deferred before charge")
                    : ChargeAdjustment.none();
            case "CONVERSION" -> {
                if (!StringUtils.hasText(waiver.getConvertedFeeCode())) {
                    throw new BusinessException("Conversion waiver requires a converted fee code", "ISLAMIC_FEE_WAIVER_CONVERSION_CODE_REQUIRED");
                }
                if (waiver.getConvertedFeeCode().equalsIgnoreCase(configuration.getFeeCode())) {
                    throw new BusinessException("Converted fee code must differ from original fee code", "ISLAMIC_FEE_WAIVER_CONVERSION_INVALID");
                }
                yield new ChargeAdjustment(waiver.getId(), null, null, waiver.getConvertedFeeCode(),
                        "Fee converted before charge");
            }
            default -> ChargeAdjustment.none();
        };
    }

    private boolean matchesChargeContext(IslamicFeeWaiver waiver,
                                         IslamicFeeRequests.ChargeFeeRequest request,
                                         Long effectiveCustomerId) {
        return matchesScope(waiver.getAccountId(), request.getAccountId())
                && matchesScope(waiver.getContractId(), request.getContractId())
                && matchesScope(waiver.getCustomerId(), effectiveCustomerId);
    }

    private boolean matchesScope(Long waiverScope, Long requestScope) {
        return waiverScope == null || Objects.equals(waiverScope, requestScope);
    }

    private boolean isEligibleForChargeSuppression(IslamicFeeWaiver waiver) {
        String waiverType = IslamicFeeSupport.normalize(waiver.getWaiverType());
        return switch (waiverType) {
            case "FULL_WAIVER", "PARTIAL_WAIVER", "CONVERSION" ->
                    waiver.getFeeChargeLogId() == null && waiver.getJournalRef() == null;
            case "DEFERRAL" ->
                    waiver.getDeferredUntil() != null
                            && LocalDate.now().isBefore(waiver.getDeferredUntil())
                            && (waiver.getFeeChargeLogId() != null || waiver.getJournalRef() == null);
            default -> false;
        };
    }

    private void consumePreChargeWaiver(Long waiverId, String reference) {
        if (waiverId == null) {
            return;
        }
        waiverRepository.findById(waiverId).ifPresent(waiver -> {
            if (waiver.getJournalRef() == null) {
                waiver.setJournalRef(reference);
                waiverRepository.save(waiver);
            }
        });
    }

    private void ensureChargeable(IslamicFeeConfiguration configuration) {
        if ("PROHIBITED".equals(configuration.getShariahClassification())) {
            throw new BusinessException("Prohibited fee types cannot be charged", "ISLAMIC_FEE_PROHIBITED");
        }
        if (!configuration.isSsbApproved() || "PENDING_SSB_APPROVAL".equals(configuration.getStatus())) {
            throw new BusinessException("Fee is pending SSB approval", "ISLAMIC_FEE_PENDING_SSB");
        }
        if (!"ACTIVE".equals(configuration.getStatus())) {
            throw new BusinessException("Fee is not active", "ISLAMIC_FEE_NOT_ACTIVE");
        }
        if (!configuration.isEffectiveOn(LocalDate.now())) {
            throw new BusinessException("Fee is outside its effective period", "ISLAMIC_FEE_NOT_EFFECTIVE");
        }
    }

    private void validateFeeRequest(IslamicFeeRequests.SaveIslamicFeeRequest request, boolean create) {
        String classification = IslamicFeeSupport.normalize(request.getShariahClassification());
        String feeType = IslamicFeeSupport.normalize(request.getFeeType());
        if (create && !StringUtils.hasText(request.getFeeCode())) {
            throw new BusinessException("Fee code is required", "ISLAMIC_FEE_CODE_REQUIRED");
        }
        if (!StringUtils.hasText(classification)) {
            throw new BusinessException("Shariah classification is required", "ISLAMIC_FEE_CLASSIFICATION_REQUIRED");
        }
        if (!StringUtils.hasText(feeType)) {
            throw new BusinessException("Fee type is required", "ISLAMIC_FEE_TYPE_REQUIRED");
        }
        if (!StringUtils.hasText(request.getFeeCategory())) {
            throw new BusinessException("Fee category is required", "ISLAMIC_FEE_CATEGORY_REQUIRED");
        }
        if (!StringUtils.hasText(request.getChargeFrequency()) || !StringUtils.hasText(request.getChargeTiming())) {
            throw new BusinessException("Charge frequency and timing are required", "ISLAMIC_FEE_CHARGE_SCHEDULE_REQUIRED");
        }
        if (request.getEffectiveFrom() != null && request.getEffectiveTo() != null
                && request.getEffectiveTo().isBefore(request.getEffectiveFrom())) {
            throw new BusinessException("Effective to date cannot be before effective from date", "ISLAMIC_FEE_EFFECTIVE_DATES_INVALID");
        }
        if ("PENALTY_CHARITY".equals(classification)) {
            if (!Boolean.TRUE.equals(request.getCharityRouted())) {
                throw new BusinessException("Penalty charity fees must be charity-routed", "ISLAMIC_FEE_CHARITY_REQUIRED");
            }
            if (!StringUtils.hasText(request.getCharityGlAccount())) {
                throw new BusinessException("Penalty charity fee requires charity GL account", "ISLAMIC_FEE_CHARITY_GL_REQUIRED");
            }
        } else if (!"PROHIBITED".equals(classification) && !StringUtils.hasText(request.getIncomeGlAccount())) {
            throw new BusinessException("Active Islamic fees require an income GL account", "ISLAMIC_FEE_INCOME_GL_REQUIRED");
        }
        if (IslamicFeeSupport.UJRAH_CLASSIFICATIONS.contains(classification)
                && !StringUtils.hasText(request.getShariahJustification())) {
            throw new BusinessException("Ujrah fees require Shariah justification", "ISLAMIC_FEE_JUSTIFICATION_REQUIRED");
        }
        if (Boolean.FALSE.equals(request.getCompoundingProhibited())) {
            throw new BusinessException("Compounding must be prohibited for Islamic fees", "ISLAMIC_FEE_COMPOUNDING_PROHIBITED");
        }
        switch (feeType) {
            case "FLAT" -> {
                if (request.getFlatAmount() == null || request.getFlatAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessException("Flat fee requires a positive flat amount", "ISLAMIC_FEE_FLAT_AMOUNT_REQUIRED");
                }
            }
            case "PERCENTAGE" -> {
                if (request.getPercentageRate() == null || request.getPercentageRate().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessException("Percentage fee requires a positive rate", "ISLAMIC_FEE_PERCENTAGE_RATE_REQUIRED");
                }
                if (request.getMaximumAmount() == null || request.getMaximumAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessException("Percentage fee requires a maximum amount cap", "ISLAMIC_FEE_PERCENTAGE_CAP_REQUIRED");
                }
                if (Boolean.TRUE.equals(request.getPercentageOfFinancingProhibited())
                        && request.getMaximumAsPercentOfFinancing() == null) {
                    throw new BusinessException("Fees prohibited from financing-based charging require a financing cap percentage",
                            "ISLAMIC_FEE_FINANCING_CAP_REQUIRED");
                }
            }
            case "TIERED_FLAT" -> {
                if (!StringUtils.hasText(request.getTierDecisionTableCode())) {
                    throw new BusinessException("Tiered flat fees require a decision table", "ISLAMIC_FEE_DECISION_TABLE_REQUIRED");
                }
            }
            case "TIERED_PERCENTAGE" -> {
                if (!StringUtils.hasText(request.getTierDecisionTableCode())) {
                    throw new BusinessException("Tiered percentage fees require a decision table", "ISLAMIC_FEE_DECISION_TABLE_REQUIRED");
                }
                if (request.getMaximumAmount() == null || request.getMaximumAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessException("Tiered percentage fees require a maximum amount cap", "ISLAMIC_FEE_PERCENTAGE_CAP_REQUIRED");
                }
            }
            case "FORMULA" -> {
                if (!StringUtils.hasText(request.getFormulaExpression())) {
                    throw new BusinessException("Formula fees require a formula expression", "ISLAMIC_FEE_FORMULA_REQUIRED");
                }
            }
            default -> throw new BusinessException("Unsupported Islamic fee type", "ISLAMIC_FEE_TYPE_INVALID");
        }
    }

    private String resolveInitialStatus(IslamicFeeRequests.SaveIslamicFeeRequest request) {
        if ("PROHIBITED".equals(request.getShariahClassification())) {
            return "INACTIVE";
        }
        if (!Boolean.TRUE.equals(request.getSsbApproved())) {
            return "PENDING_SSB_APPROVAL";
        }
        return StringUtils.hasText(request.getStatus()) ? request.getStatus() : "ACTIVE";
    }

    private IslamicFeeConfiguration mapRequestToConfiguration(IslamicFeeRequests.SaveIslamicFeeRequest request,
                                                              IslamicFeeConfiguration existing) {
        IslamicFeeConfiguration configuration = existing != null ? existing : IslamicFeeConfiguration.builder().build();
        if (StringUtils.hasText(request.getFeeCode())) configuration.setFeeCode(request.getFeeCode());
        if (StringUtils.hasText(request.getName())) configuration.setName(request.getName());
        configuration.setNameAr(request.getNameAr());
        configuration.setDescription(request.getDescription());
        configuration.setDescriptionAr(request.getDescriptionAr());
        if (StringUtils.hasText(request.getShariahClassification())) configuration.setShariahClassification(IslamicFeeSupport.normalize(request.getShariahClassification()));
        configuration.setShariahJustification(request.getShariahJustification());
        configuration.setShariahJustificationAr(request.getShariahJustificationAr());
        configuration.setShariahReference(request.getShariahReference());
        if (request.getSsbApproved() != null) configuration.setSsbApproved(request.getSsbApproved());
        if (StringUtils.hasText(request.getFeeType())) configuration.setFeeType(IslamicFeeSupport.normalize(request.getFeeType()));
        configuration.setFlatAmount(request.getFlatAmount());
        configuration.setPercentageRate(request.getPercentageRate());
        configuration.setMinimumAmount(request.getMinimumAmount());
        configuration.setMaximumAmount(request.getMaximumAmount());
        configuration.setTierDecisionTableCode(request.getTierDecisionTableCode());
        configuration.setFormulaExpression(request.getFormulaExpression());
        if (request.getApplicableContractTypes() != null) configuration.setApplicableContractTypes(request.getApplicableContractTypes());
        if (request.getApplicableProductCodes() != null) configuration.setApplicableProductCodes(request.getApplicableProductCodes());
        if (request.getApplicableTransactionTypes() != null) configuration.setApplicableTransactionTypes(request.getApplicableTransactionTypes());
        if (StringUtils.hasText(request.getFeeCategory())) configuration.setFeeCategory(IslamicFeeSupport.normalize(request.getFeeCategory()));
        if (StringUtils.hasText(request.getChargeFrequency())) configuration.setChargeFrequency(IslamicFeeSupport.normalize(request.getChargeFrequency()));
        if (StringUtils.hasText(request.getChargeTiming())) configuration.setChargeTiming(IslamicFeeSupport.normalize(request.getChargeTiming()));
        configuration.setIncomeGlAccount(request.getIncomeGlAccount());
        if (request.getCharityRouted() != null) configuration.setCharityRouted(request.getCharityRouted());
        configuration.setCharityGlAccount(request.getCharityGlAccount());
        if (request.getPercentageOfFinancingProhibited() != null) configuration.setPercentageOfFinancingProhibited(request.getPercentageOfFinancingProhibited());
        if (request.getCompoundingProhibited() != null) configuration.setCompoundingProhibited(request.getCompoundingProhibited());
        configuration.setMaximumAsPercentOfFinancing(request.getMaximumAsPercentOfFinancing());
        configuration.setAnnualPenaltyCapAmount(request.getAnnualPenaltyCapAmount());
        if (StringUtils.hasText(request.getStatus())) configuration.setStatus(IslamicFeeSupport.normalize(request.getStatus()));
        if (request.getEffectiveFrom() != null) configuration.setEffectiveFrom(request.getEffectiveFrom());
        if (existing == null && configuration.getEffectiveFrom() == null) configuration.setEffectiveFrom(LocalDate.now());
        configuration.setEffectiveTo(request.getEffectiveTo());
        return configuration;
    }

    private FeeDefinition resolveOrCreateBaseFee(IslamicFeeRequests.SaveIslamicFeeRequest request, Long existingBaseFeeId) {
        FeeDefinition feeDefinition = existingBaseFeeId != null
                ? feeDefinitionRepository.findById(existingBaseFeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "id", existingBaseFeeId))
                : request.getBaseFeeId() != null
                    ? feeDefinitionRepository.findById(request.getBaseFeeId())
                        .orElseThrow(() -> new ResourceNotFoundException("FeeDefinition", "id", request.getBaseFeeId()))
                    : feeDefinitionRepository.findByFeeCode(request.getFeeCode()).orElseGet(FeeDefinition::new);

        feeDefinition.setFeeCode(request.getFeeCode());
        feeDefinition.setFeeName(request.getName());
        feeDefinition.setFeeCategory(mapBaseCategory(request.getFeeCategory()));
        feeDefinition.setTriggerEvent(StringUtils.hasText(request.getTriggerEvent())
                ? request.getTriggerEvent()
                : mapTriggerEvent(request.getFeeCategory()));
        feeDefinition.setCalculationType(mapBaseCalcType(request.getFeeType()));
        feeDefinition.setFlatAmount(request.getFlatAmount());
        feeDefinition.setPercentage(request.getPercentageRate());
        feeDefinition.setMinFee(request.getMinimumAmount());
        feeDefinition.setMaxFee(request.getMaximumAmount());
        feeDefinition.setCurrencyCode(StringUtils.hasText(request.getCurrencyCode()) ? request.getCurrencyCode() : "SAR");
        feeDefinition.setApplicableProducts(request.getApplicableProductCodes() == null || request.getApplicableProductCodes().isEmpty()
                ? "ALL"
                : String.join(",", request.getApplicableProductCodes()));
        feeDefinition.setApplicableChannels("ALL");
        feeDefinition.setApplicableCustomerTypes("ALL");
        feeDefinition.setTaxApplicable(false);
        feeDefinition.setTaxRate(BigDecimal.ZERO);
        feeDefinition.setFeeIncomeGlCode(Boolean.TRUE.equals(request.getCharityRouted())
                ? request.getCharityGlAccount()
                : request.getIncomeGlAccount());
        feeDefinition.setWaivable(true);
        feeDefinition.setWaiverAuthorityLevel("OFFICER");
        feeDefinition.setIsActive(!"PROHIBITED".equals(request.getShariahClassification()));
        feeDefinition.setEffectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now());
        feeDefinition.setEffectiveTo(request.getEffectiveTo());
        return feeDefinitionRepository.save(feeDefinition);
    }

    private FeeCategory mapBaseCategory(String feeCategory) {
        if (!StringUtils.hasText(feeCategory)) {
            return FeeCategory.OTHER;
        }
        return switch (IslamicFeeSupport.normalize(feeCategory)) {
            case "ACCOUNT_MAINTENANCE" -> FeeCategory.ACCOUNT_MAINTENANCE;
            case "WIRE_TRANSFER" -> FeeCategory.SWIFT;
            case "CHEQUE_BOOK", "RETURNED_CHEQUE" -> FeeCategory.CHEQUE;
            case "CARD_ISSUANCE", "CARD_REPLACEMENT" -> FeeCategory.CARD;
            case "LATE_PAYMENT" -> FeeCategory.PENALTY;
            case "STATEMENT_REQUEST", "CERTIFICATE_ISSUANCE" -> FeeCategory.STATEMENT;
            case "PROCESSING", "DOCUMENTATION", "VALUATION", "LEGAL_COLLECTION", "RESTRUCTURING" -> FeeCategory.SERVICE_CHARGE;
            default -> FeeCategory.OTHER;
        };
    }

    private FeeCalculationType mapBaseCalcType(String feeType) {
        if (!StringUtils.hasText(feeType)) {
            return FeeCalculationType.FLAT;
        }
        return switch (IslamicFeeSupport.normalize(feeType)) {
            case "PERCENTAGE" -> FeeCalculationType.PERCENTAGE;
            case "TIERED_FLAT", "TIERED_PERCENTAGE" -> FeeCalculationType.TIERED;
            default -> FeeCalculationType.FLAT;
        };
    }

    private String mapTriggerEvent(String feeCategory) {
        if (!StringUtils.hasText(feeCategory)) {
            return "FEE_CHARGE";
        }
        return IslamicFeeSupport.normalize(feeCategory);
    }

    private boolean changed(Object left, Object right) {
        return left != null ? !left.equals(right) : right != null;
    }

    private record ChargeAdjustment(Long waiverId,
                                    BigDecimal overrideAmount,
                                    LocalDate deferUntil,
                                    String convertedFeeCode,
                                    String message) {
        private static ChargeAdjustment none() {
            return new ChargeAdjustment(null, null, null, null, null);
        }
    }
}
