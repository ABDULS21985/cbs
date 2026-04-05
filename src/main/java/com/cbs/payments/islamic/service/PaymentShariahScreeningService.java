package com.cbs.payments.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentShariahAuditLog;
import com.cbs.payments.islamic.repository.InstantPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentShariahScreeningService {

    private static final BigDecimal LARGE_PAYMENT_THRESHOLD = new BigDecimal("1000000.00");

    private final ShariahScreeningService shariahScreeningService;
    private final ShariahExclusionListRepository exclusionListRepository;
    private final ShariahExclusionListEntryRepository exclusionListEntryRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final PaymentIslamicExtensionRepository paymentIslamicExtensionRepository;
    private final PaymentShariahAuditLogRepository paymentShariahAuditLogRepository;
    private final InstantPaymentExtensionRepository instantPaymentExtensionRepository;
    private final IslamicPaymentSupport paymentSupport;

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.PaymentScreeningResult screenPayment(Long paymentId) {
        PaymentInstruction payment = paymentInstructionRepository.findByIdWithDetails(paymentId)
                .orElseThrow(() -> new BusinessException("Payment not found", "PAYMENT_NOT_FOUND"));

        var extension = paymentIslamicExtensionRepository.findByPaymentId(paymentId).orElse(null);
        IslamicPaymentRequests.IslamicPaymentRequest request = IslamicPaymentRequests.IslamicPaymentRequest.builder()
                .sourceAccountId(payment.getDebitAccount() != null ? payment.getDebitAccount().getId() : null)
                .destinationAccountNumber(payment.getCreditAccountNumber())
                .destinationBankCode(payment.getBeneficiaryBankCode())
                .destinationBankSwift(payment.getBeneficiaryBankCode())
                .beneficiaryName(payment.getBeneficiaryName())
                .beneficiaryBankName(payment.getBeneficiaryBankName())
                .amount(payment.getAmount())
                .currencyCode(payment.getCurrencyCode())
                .destinationCurrencyCode(payment.getFxTargetCurrency())
                .paymentChannel(payment.getPaymentRail())
                .purpose(extension != null ? extension.getPaymentPurpose() : IslamicPaymentDomainEnums.PaymentPurpose.GENERAL)
                .purposeDescription(extension != null ? extension.getPurposeDescription() : payment.getRemittanceInfo())
                .reference(payment.getInstructionRef())
                .requireShariahScreening(true)
                .merchantCategoryCode(extension != null ? extension.getMerchantCategoryCode() : null)
                .merchantName(extension != null ? extension.getMerchantName() : null)
                .merchantCountry(extension != null ? extension.getMerchantCountry() : null)
                .build();

        Account sourceAccount = payment.getDebitAccount();
        return screenRequest(request, sourceAccount, paymentSupport.resolveSourceProfile(sourceAccount), false);
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.PaymentScreeningResult previewScreening(
            IslamicPaymentRequests.IslamicPaymentRequest request,
            Account sourceAccount,
            IslamicPaymentSupport.SourceAccountProfile sourceProfile) {
        return screenRequest(request, sourceAccount, sourceProfile, false);
    }

    public IslamicPaymentResponses.PaymentScreeningResult screenForExecution(
            IslamicPaymentRequests.IslamicPaymentRequest request,
            Account sourceAccount,
            IslamicPaymentSupport.SourceAccountProfile sourceProfile) {
        return screenRequest(request, sourceAccount, sourceProfile, true);
    }

    public PaymentShariahAuditLog persistAuditLog(Long paymentId,
                                                  String paymentRef,
                                                  IslamicPaymentRequests.IslamicPaymentRequest request,
                                                  Account sourceAccount,
                                                  IslamicPaymentResponses.PaymentScreeningResult screeningResult) {
        List<String> failedCodes = screeningResult.getCheckResults().stream()
                .filter(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL
                        || check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT)
                .map(IslamicPaymentResponses.ScreeningCheckResult::getRuleCode)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        List<String> failedDescriptions = screeningResult.getCheckResults().stream()
                .filter(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL
                        || check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT)
                .map(IslamicPaymentResponses.ScreeningCheckResult::getDescription)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        PaymentShariahAuditLog logEntry = PaymentShariahAuditLog.builder()
                .paymentId(paymentId)
                .paymentRef(paymentRef)
                .screeningTimestamp(LocalDateTime.now())
                .screeningDurationMs(screeningResult.getScreeningDurationMs())
                .sourceAccountNumber(sourceAccount != null ? sourceAccount.getAccountNumber() : null)
                .destinationAccountNumber(request.getDestinationAccountNumber())
                .beneficiaryName(request.getBeneficiaryName())
                .beneficiaryBankSwift(request.getDestinationBankSwift())
                .mccCode(request.getMerchantCategoryCode())
                .amount(request.getAmount())
                .currency(request.getCurrencyCode())
                .paymentChannel(paymentSupport.uppercase(request.getPaymentChannel()))
                .overallResult(screeningResult.getOverallResult())
                .rulesChecked(screeningResult.getCheckResults().size())
                .rulesFailed((int) screeningResult.getCheckResults().stream()
                        .filter(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL)
                        .count())
                .failedRuleCodes(new ArrayList<>(failedCodes))
                .failedRuleDescriptions(new ArrayList<>(failedDescriptions))
                .actionTaken(toAuditAction(screeningResult.getOutcome()))
                .alertGenerated(screeningResult.getAlertId() != null)
                .alertId(screeningResult.getAlertId())
                .tenantId(paymentSupport.currentTenantId())
                .build();
        return paymentShariahAuditLogRepository.save(logEntry);
    }

    @Transactional(readOnly = true)
    public PaymentShariahAuditLog getScreeningLog(Long paymentId) {
        return paymentShariahAuditLogRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Payment screening log not found", "SCREENING_LOG_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.BeneficiaryScreeningResult screenBeneficiary(
            IslamicPaymentRequests.ScreenBeneficiaryRequest request) {
        ExactOrFuzzyMatch counterpartyMatch = exactOrFuzzyListMatch("PROHIBITED_COUNTERPARTIES", request.getBeneficiaryName(), request.getBeneficiaryId());
        if (counterpartyMatch.exactMatch()) {
            return IslamicPaymentResponses.BeneficiaryScreeningResult.builder()
                    .beneficiaryName(request.getBeneficiaryName())
                    .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED)
                    .highRisk(true)
                    .reason("Beneficiary is on prohibited counterparty list")
                    .matchedList("PROHIBITED_COUNTERPARTIES")
                    .matchedEntry(counterpartyMatch.matchedValue())
                    .build();
        }
        if (counterpartyMatch.fuzzyMatch()) {
            return IslamicPaymentResponses.BeneficiaryScreeningResult.builder()
                    .beneficiaryName(request.getBeneficiaryName())
                    .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT)
                    .highRisk(true)
                    .reason("Beneficiary resembles an exclusion-list entry and requires enhanced review")
                    .matchedList("PROHIBITED_COUNTERPARTIES")
                    .matchedEntry(counterpartyMatch.matchedValue())
                    .build();
        }

        if (StringUtils.hasText(request.getMerchantCategoryCode()) && isListMatch("HARAM_MCC", request.getMerchantCategoryCode())) {
            return IslamicPaymentResponses.BeneficiaryScreeningResult.builder()
                    .beneficiaryName(request.getBeneficiaryName())
                    .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED)
                    .highRisk(true)
                    .reason("Merchant category code is prohibited for Islamic payments")
                    .matchedList("HARAM_MCC")
                    .matchedEntry(request.getMerchantCategoryCode())
                    .build();
        }

        return IslamicPaymentResponses.BeneficiaryScreeningResult.builder()
                .beneficiaryName(request.getBeneficiaryName())
                .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED)
                .highRisk(false)
                .reason("Beneficiary screening passed")
                .build();
    }

    @Transactional(readOnly = true)
    public String lookupMcc(String beneficiaryName, String beneficiaryCategory) {
        String normalizedName = paymentSupport.normalize(beneficiaryName);
        String normalizedCategory = paymentSupport.normalize(beneficiaryCategory);
        if (normalizedName.contains("casino") || normalizedCategory.contains("gambling")) {
            return "7995";
        }
        if (normalizedName.contains("liquor") || normalizedName.contains("alcohol")) {
            return "5921";
        }
        if (normalizedName.contains("bar") || normalizedCategory.contains("drinking")) {
            return "5813";
        }
        if (normalizedName.contains("grocery") || normalizedCategory.contains("grocery")) {
            return "5411";
        }
        return null;
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.PaymentScreeningReport getScreeningReport(LocalDate from, LocalDate to) {
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs = to.plusDays(1).atStartOfDay().minusNanos(1);
        List<PaymentShariahAuditLog> logs = paymentShariahAuditLogRepository.findByScreeningTimestampBetween(fromTs, toTs);
        List<InstantPaymentExtension> instantExtensions = instantPaymentExtensionRepository.findAll().stream()
                .filter(ext -> ext.getRequestReceivedAt() != null)
                .filter(ext -> !ext.getRequestReceivedAt().isBefore(fromTs) && !ext.getRequestReceivedAt().isAfter(toTs))
                .toList();

        Map<String, Long> byOutcome = logs.stream()
                .collect(Collectors.groupingBy(log -> log.getOverallResult().name(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> blockedByCheck = logs.stream()
                .flatMap(log -> log.getFailedRuleCodes().stream())
                .collect(Collectors.groupingBy(code -> code, LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> topBlockedMccs = logs.stream()
                .filter(log -> StringUtils.hasText(log.getMccCode()))
                .filter(log -> log.getOverallResult() == IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL)
                .collect(Collectors.groupingBy(PaymentShariahAuditLog::getMccCode, LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> topFlaggedBeneficiaries = logs.stream()
                .filter(log -> StringUtils.hasText(log.getBeneficiaryName()))
                .filter(log -> log.getOverallResult() == IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL
                        || log.getOverallResult() == IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT)
                .collect(Collectors.groupingBy(PaymentShariahAuditLog::getBeneficiaryName, LinkedHashMap::new, Collectors.counting()));

        BigDecimal averageTime = logs.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(logs.stream().mapToLong(PaymentShariahAuditLog::getScreeningDurationMs).average().orElse(0d))
                .setScale(2, RoundingMode.HALF_UP);

        long deferredCount = instantExtensions.stream()
                .filter(ext -> ext.getScreeningMode() == IslamicPaymentDomainEnums.InstantScreeningMode.DEFERRED)
                .count();

        return IslamicPaymentResponses.PaymentScreeningReport.builder()
                .totalScreened(logs.size())
                .byOutcome(byOutcome)
                .blockedByCheckType(blockedByCheck)
                .topBlockedMccs(topBlockedMccs)
                .topFlaggedBeneficiaries(topFlaggedBeneficiaries)
                .deferredScreenings(deferredCount)
                .averageScreeningTimeMs(averageTime)
                .falsePositiveRate(computeFalsePositiveRate(logs))
                .build();
    }

    private IslamicPaymentResponses.PaymentScreeningResult screenRequest(
            IslamicPaymentRequests.IslamicPaymentRequest request,
            Account sourceAccount,
            IslamicPaymentSupport.SourceAccountProfile sourceProfile,
            boolean persistBaseResult) {
        long start = System.currentTimeMillis();
        String mcc = StringUtils.hasText(request.getMerchantCategoryCode())
                ? request.getMerchantCategoryCode()
                : lookupMcc(request.getBeneficiaryName(), request.getPurposeDescription());

        Map<String, Object> additionalContext = new LinkedHashMap<>();
        additionalContext.put("sourceAccountIsIslamic", sourceProfile.islamic());
        additionalContext.put("shariahComplianceStatus", sourceProfile.compliant() ? "COMPLIANT" : "NON_COMPLIANT");
        additionalContext.put("productFatwaActive", sourceProfile.islamicProductTemplate() != null
                && (Boolean.FALSE.equals(sourceProfile.islamicProductTemplate().getFatwaRequired())
                || sourceProfile.islamicProductTemplate().getActiveFatwaId() != null));
        additionalContext.put("paymentPurposeKeywordMatch", hasPurposeKeywordMatch(request.getPurposeDescription()));
        additionalContext.put("forwardFxRequested", Boolean.TRUE.equals(request.getForwardFxRequested()));

        ShariahScreeningRequest screeningRequest = ShariahScreeningRequest.builder()
                .transactionRef(StringUtils.hasText(request.getReference()) ? request.getReference() : "PAYMENT_PREVIEW")
                .transactionType("PAYMENT")
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .contractTypeCode(sourceProfile.contractTypeCode())
                .customerId(sourceAccount != null && sourceAccount.getCustomer() != null ? sourceAccount.getCustomer().getId() : null)
                .counterpartyName(request.getBeneficiaryName())
                .counterpartyId(request.getDestinationAccountNumber())
                .merchantCategoryCode(mcc)
                .merchantName(request.getMerchantName())
                .purpose(request.getPurposeDescription())
                .additionalContext(additionalContext)
                .build();

        ShariahScreeningResultResponse baseResult = persistBaseResult
                ? shariahScreeningService.screenTransaction(screeningRequest)
                : shariahScreeningService.preScreenTransaction(screeningRequest);

        List<IslamicPaymentResponses.ScreeningCheckResult> checks = new ArrayList<>();
        checks.add(mccCheck(mcc));
        checks.add(counterpartyCheck(request.getBeneficiaryName(), request.getDestinationAccountNumber()));
        checks.add(beneficiaryBankCheck(request.getDestinationBankSwift(), request.getDestinationBankCode()));
        checks.add(purposeCheck(request.getPurposeDescription()));
        checks.add(amountThresholdCheck(request.getAmount()));
        checks.add(sourceComplianceCheck(sourceAccount, sourceProfile));

        IslamicPaymentDomainEnums.ScreeningOutcome outcome = deriveOutcome(baseResult, checks);
        String blockReason = firstBlockReason(baseResult, checks);
        Long alertId = baseResult.getAlertId();
        String alertDescription = outcome == IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT
                ? "Payment screening generated an alert for compliance review"
                : null;

        return IslamicPaymentResponses.PaymentScreeningResult.builder()
                .paymentRef(request.getReference())
                .outcome(outcome)
                .screeningRef(baseResult.getScreeningRef())
                .screeningDurationMs(System.currentTimeMillis() - start)
                .checkResults(checks)
                .blockReason(blockReason)
                .blockReasonAr(baseResult.getBlockReasonAr())
                .alertId(alertId)
                .alertDescription(alertDescription)
                .overallResult(toOverallResult(outcome))
                .build();
    }

    private IslamicPaymentResponses.ScreeningCheckResult mccCheck(String mcc) {
        if (!StringUtils.hasText(mcc)) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.MCC, IslamicPaymentDomainEnums.CheckResult.SKIPPED,
                    null, "SHARIAH-PAY-002", IslamicPaymentDomainEnums.CheckAction.LOG, "No MCC available for screening");
        }
        if (isListMatch("HARAM_MCC", mcc)) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.MCC, IslamicPaymentDomainEnums.CheckResult.FAIL,
                    "MCC " + mcc, "SHARIAH-PAY-002", IslamicPaymentDomainEnums.CheckAction.BLOCK,
                    "Payment blocked: beneficiary MCC " + mcc + " is on the Haram merchant list");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.MCC, IslamicPaymentDomainEnums.CheckResult.PASS,
                "MCC " + mcc, "SHARIAH-PAY-002", IslamicPaymentDomainEnums.CheckAction.LOG, "MCC screening passed");
    }

    private IslamicPaymentResponses.ScreeningCheckResult counterpartyCheck(String beneficiaryName, String beneficiaryId) {
        ExactOrFuzzyMatch match = exactOrFuzzyListMatch("PROHIBITED_COUNTERPARTIES", beneficiaryName, beneficiaryId);
        if (match.exactMatch()) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.COUNTERPARTY, IslamicPaymentDomainEnums.CheckResult.FAIL,
                    match.matchedValue(), "SHARIAH-PAY-COUNTERPARTY", IslamicPaymentDomainEnums.CheckAction.BLOCK,
                    "Beneficiary is on the prohibited counterparty list");
        }
        if (match.fuzzyMatch()) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.COUNTERPARTY, IslamicPaymentDomainEnums.CheckResult.ALERT,
                    match.matchedValue(), "SHARIAH-PAY-COUNTERPARTY", IslamicPaymentDomainEnums.CheckAction.ALERT,
                    "Beneficiary resembles a prohibited counterparty and requires review");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.COUNTERPARTY, IslamicPaymentDomainEnums.CheckResult.PASS,
                beneficiaryName, "SHARIAH-PAY-COUNTERPARTY", IslamicPaymentDomainEnums.CheckAction.LOG,
                "Counterparty screening passed");
    }

    private IslamicPaymentResponses.ScreeningCheckResult beneficiaryBankCheck(String swiftCode, String bankCode) {
        String value = StringUtils.hasText(swiftCode) ? swiftCode : bankCode;
        if (!StringUtils.hasText(value)) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.BENEFICIARY_BANK, IslamicPaymentDomainEnums.CheckResult.SKIPPED,
                    null, "SHARIAH-PAY-BANK", IslamicPaymentDomainEnums.CheckAction.LOG, "No beneficiary bank identifier available");
        }
        if (isListMatch("PROHIBITED_BANKS", value)) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.BENEFICIARY_BANK, IslamicPaymentDomainEnums.CheckResult.ALERT,
                    value, "SHARIAH-PAY-BANK", IslamicPaymentDomainEnums.CheckAction.ALERT,
                    "Beneficiary bank is on a restricted watch list");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.BENEFICIARY_BANK, IslamicPaymentDomainEnums.CheckResult.PASS,
                value, "SHARIAH-PAY-BANK", IslamicPaymentDomainEnums.CheckAction.LOG, "Beneficiary bank screening passed");
    }

    private IslamicPaymentResponses.ScreeningCheckResult purposeCheck(String purposeDescription) {
        if (!StringUtils.hasText(purposeDescription)) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.PURPOSE, IslamicPaymentDomainEnums.CheckResult.SKIPPED,
                    null, "SHARIAH-PAY-PURPOSE", IslamicPaymentDomainEnums.CheckAction.LOG, "No purpose description provided");
        }
        Optional<String> matchedKeyword = listEntries("PROHIBITED_PAYMENT_PURPOSES").stream()
                .map(ShariahExclusionListEntry::getEntryValue)
                .filter(StringUtils::hasText)
                .filter(keyword -> paymentSupport.normalize(purposeDescription).contains(paymentSupport.normalize(keyword)))
                .findFirst();
        if (matchedKeyword.isPresent()) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.PURPOSE, IslamicPaymentDomainEnums.CheckResult.ALERT,
                    matchedKeyword.get(), "SHARIAH-PAY-PURPOSE", IslamicPaymentDomainEnums.CheckAction.ALERT,
                    "Payment purpose requires review because it matches a prohibited-purpose keyword");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.PURPOSE, IslamicPaymentDomainEnums.CheckResult.PASS,
                purposeDescription, "SHARIAH-PAY-PURPOSE", IslamicPaymentDomainEnums.CheckAction.LOG, "Purpose screening passed");
    }

    private IslamicPaymentResponses.ScreeningCheckResult amountThresholdCheck(BigDecimal amount) {
        if (amount != null && amount.compareTo(LARGE_PAYMENT_THRESHOLD) >= 0) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.AMOUNT_THRESHOLD, IslamicPaymentDomainEnums.CheckResult.ALERT,
                    amount.toPlainString(), "SHARIAH-PAY-THRESHOLD", IslamicPaymentDomainEnums.CheckAction.ALERT,
                    "Large payment threshold exceeded and requires enhanced review");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.AMOUNT_THRESHOLD, IslamicPaymentDomainEnums.CheckResult.PASS,
                amount != null ? amount.toPlainString() : null, "SHARIAH-PAY-THRESHOLD", IslamicPaymentDomainEnums.CheckAction.LOG,
                "Amount threshold screening passed");
    }

    private IslamicPaymentResponses.ScreeningCheckResult sourceComplianceCheck(Account sourceAccount,
                                                                               IslamicPaymentSupport.SourceAccountProfile sourceProfile) {
        if (sourceAccount == null || !sourceProfile.islamic()) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.SOURCE_COMPLIANCE, IslamicPaymentDomainEnums.CheckResult.SKIPPED,
                    null, "SHARIAH-PAY-001", IslamicPaymentDomainEnums.CheckAction.LOG, "Source account is not Islamic");
        }
        if (!sourceProfile.compliant()) {
            return buildCheck(IslamicPaymentDomainEnums.CheckType.SOURCE_COMPLIANCE, IslamicPaymentDomainEnums.CheckResult.FAIL,
                    sourceProfile.productCode(), "SHARIAH-PAY-001", IslamicPaymentDomainEnums.CheckAction.BLOCK,
                    "Source account product is not Shariah-compliant or has no active fatwa");
        }
        return buildCheck(IslamicPaymentDomainEnums.CheckType.SOURCE_COMPLIANCE, IslamicPaymentDomainEnums.CheckResult.PASS,
                sourceProfile.productCode(), "SHARIAH-PAY-001", IslamicPaymentDomainEnums.CheckAction.LOG,
                "Source account compliance verified");
    }

    private IslamicPaymentDomainEnums.ScreeningOutcome deriveOutcome(
            ShariahScreeningResultResponse baseResult,
            List<IslamicPaymentResponses.ScreeningCheckResult> checks) {
        boolean hasBlock = baseResult.getActionTaken() == ScreeningActionTaken.BLOCKED
                || checks.stream().anyMatch(check -> check.getAction() == IslamicPaymentDomainEnums.CheckAction.BLOCK
                && check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL);
        if (hasBlock) {
            return IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED;
        }
        boolean hasAlert = baseResult.getOverallResult() == ScreeningOverallResult.ALERT
                || checks.stream().anyMatch(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT);
        if (hasAlert) {
            return IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT;
        }
        boolean hasWarn = baseResult.getOverallResult() == ScreeningOverallResult.WARN
                || checks.stream().anyMatch(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.WARN);
        if (hasWarn) {
            return IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_WARNING;
        }
        return IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED;
    }

    private String firstBlockReason(ShariahScreeningResultResponse baseResult,
                                    List<IslamicPaymentResponses.ScreeningCheckResult> checks) {
        if (StringUtils.hasText(baseResult.getBlockReason())) {
            return baseResult.getBlockReason();
        }
        return checks.stream()
                .filter(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL)
                .map(IslamicPaymentResponses.ScreeningCheckResult::getDescription)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }

    private IslamicPaymentDomainEnums.PaymentScreeningResult toOverallResult(IslamicPaymentDomainEnums.ScreeningOutcome outcome) {
        return switch (outcome) {
            case BLOCKED -> IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL;
            case ALLOWED_WITH_ALERT -> IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT;
            case ALLOWED_WITH_WARNING -> IslamicPaymentDomainEnums.PaymentScreeningResult.WARN;
            default -> IslamicPaymentDomainEnums.PaymentScreeningResult.PASS;
        };
    }

    private IslamicPaymentDomainEnums.AuditActionTaken toAuditAction(IslamicPaymentDomainEnums.ScreeningOutcome outcome) {
        return switch (outcome) {
            case BLOCKED -> IslamicPaymentDomainEnums.AuditActionTaken.BLOCKED;
            case ALLOWED_WITH_ALERT -> IslamicPaymentDomainEnums.AuditActionTaken.ALLOWED_WITH_ALERT;
            case MANUAL_OVERRIDE -> IslamicPaymentDomainEnums.AuditActionTaken.MANUAL_OVERRIDE;
            default -> IslamicPaymentDomainEnums.AuditActionTaken.ALLOWED;
        };
    }

    private boolean hasPurposeKeywordMatch(String purposeDescription) {
        if (!StringUtils.hasText(purposeDescription)) {
            return false;
        }
        return listEntries("PROHIBITED_PAYMENT_PURPOSES").stream()
                .map(ShariahExclusionListEntry::getEntryValue)
                .filter(StringUtils::hasText)
                .anyMatch(keyword -> paymentSupport.normalize(purposeDescription).contains(paymentSupport.normalize(keyword)));
    }

    private boolean isListMatch(String listCode, String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        return exclusionListRepository.findByListCode(listCode)
                .map(list -> exclusionListEntryRepository.existsByListIdAndEntryValueAndStatus(list.getId(), value, "ACTIVE"))
                .orElse(false);
    }

    private List<ShariahExclusionListEntry> listEntries(String listCode) {
        return exclusionListRepository.findByListCode(listCode)
                .map(ShariahExclusionList::getId)
                .map(listId -> exclusionListEntryRepository.findByListIdAndStatus(listId, "ACTIVE"))
                .orElseGet(List::of);
    }

    private ExactOrFuzzyMatch exactOrFuzzyListMatch(String listCode, String... candidates) {
        List<ShariahExclusionListEntry> entries = listEntries(listCode);
        for (String candidate : candidates) {
            if (!StringUtils.hasText(candidate)) {
                continue;
            }
            for (ShariahExclusionListEntry entry : entries) {
                if (!StringUtils.hasText(entry.getEntryValue())) {
                    continue;
                }
                if (candidate.equalsIgnoreCase(entry.getEntryValue())) {
                    return new ExactOrFuzzyMatch(true, false, entry.getEntryValue());
                }
                if (paymentSupport.fuzzyMatch(candidate, entry.getEntryValue())) {
                    return new ExactOrFuzzyMatch(false, true, entry.getEntryValue());
                }
            }
        }
        return new ExactOrFuzzyMatch(false, false, null);
    }

    private BigDecimal computeFalsePositiveRate(List<PaymentShariahAuditLog> logs) {
        long blocked = logs.stream()
                .filter(l -> "BLOCK".equalsIgnoreCase(l.getRecommendedAction()))
                .count();
        if (blocked == 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        long overridden = logs.stream()
                .filter(l -> "BLOCK".equalsIgnoreCase(l.getRecommendedAction()))
                .filter(l -> Boolean.TRUE.equals(l.getOverrideApplied()))
                .count();
        return BigDecimal.valueOf(overridden)
                .divide(BigDecimal.valueOf(blocked), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private IslamicPaymentResponses.ScreeningCheckResult buildCheck(
            IslamicPaymentDomainEnums.CheckType checkType,
            IslamicPaymentDomainEnums.CheckResult result,
            String matchedValue,
            String ruleCode,
            IslamicPaymentDomainEnums.CheckAction action,
            String description) {
        return IslamicPaymentResponses.ScreeningCheckResult.builder()
                .checkType(checkType)
                .result(result)
                .matchedValue(matchedValue)
                .ruleCode(ruleCode)
                .action(action)
                .description(description)
                .build();
    }

    private record ExactOrFuzzyMatch(boolean exactMatch, boolean fuzzyMatch, String matchedValue) {
    }
}
