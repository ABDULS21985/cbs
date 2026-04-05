package com.cbs.payments.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.IslamicFeeService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.entity.PaymentShariahAuditLog;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.payments.service.PaymentService;
import com.cbs.standing.entity.InstructionType;
import com.cbs.standing.entity.StandingInstruction;
import com.cbs.standing.repository.StandingInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicPaymentService {

    private final PaymentService paymentService;
    private final AccountRepository accountRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final PaymentIslamicExtensionRepository extensionRepository;
    private final PaymentShariahAuditLogRepository auditLogRepository;
    private final StandingInstructionRepository standingInstructionRepository;
    private final PaymentShariahScreeningService screeningService;
    private final IslamicFeeService islamicFeeService;
    private final DomesticPaymentService domesticPaymentService;
    private final CrossBorderPaymentService crossBorderPaymentService;
    private final InstantPaymentService instantPaymentService;
    private final IslamicPaymentSupport paymentSupport;

    public IslamicPaymentResponses.PaymentResponse initiatePayment(IslamicPaymentRequests.IslamicPaymentRequest request) {
        return doInitiate(request, null, false);
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.PaymentScreeningResult previewPayment(IslamicPaymentRequests.IslamicPaymentRequest request) {
        Account sourceAccount = paymentSupport.loadSourceAccount(request.getSourceAccountId());
        IslamicPaymentSupport.SourceAccountProfile sourceProfile = paymentSupport.resolveSourceProfile(sourceAccount);
        if (sourceProfile.islamic() && !request.isRequireShariahScreening()) {
            throw new BusinessException("Payments from Islamic accounts must be Shariah-screened", "SHARIAH-PAY-001");
        }
        return screeningService.previewScreening(request, sourceAccount, sourceProfile);
    }

    public IslamicPaymentResponses.PaymentResponse initiatePaymentWithOverride(
            IslamicPaymentRequests.IslamicPaymentRequest request,
            IslamicPaymentRequests.ManualOverrideRequest overrideRequest,
            boolean complianceUser) {
        if (overrideRequest == null || !StringUtils.hasText(overrideRequest.getReason())
                || !StringUtils.hasText(overrideRequest.getApprovedBy())) {
            throw new BusinessException("Manual override requires reason and supervisor approval", "PAYMENT_OVERRIDE_INVALID");
        }
        return doInitiate(request, overrideRequest, complianceUser);
    }

    @Transactional(readOnly = true)
    public List<IslamicPaymentResponses.PaymentScreeningPreview> screenStandingOrderBatch(LocalDate executionDate) {
        return standingInstructionRepository.findDueForExecution(executionDate).stream()
                .map(instruction -> {
                    Account sourceAccount = paymentSupport.loadSourceAccount(instruction.getDebitAccount().getId());
                    var sourceProfile = paymentSupport.resolveSourceProfile(sourceAccount);
                    IslamicPaymentResponses.PaymentScreeningResult result = screeningService.previewScreening(
                            toStandingOrderRequest(instruction),
                            sourceAccount,
                            sourceProfile
                    );
                    return IslamicPaymentResponses.PaymentScreeningPreview.builder()
                            .instructionRef(instruction.getInstructionRef())
                            .standingInstructionId(instruction.getId())
                            .debitAccountNumber(sourceAccount.getAccountNumber())
                            .beneficiaryName(instruction.getCreditAccountName())
                            .amount(instruction.getAmount())
                            .outcome(result.getOutcome())
                            .blockReason(result.getBlockReason())
                            .screeningRef(result.getScreeningRef())
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentShariahAuditLog getScreeningLog(Long paymentId) {
        return screeningService.getScreeningLog(paymentId);
    }

    @Transactional(readOnly = true)
    public List<PaymentShariahAuditLog> getBlockedPayments(LocalDate from, LocalDate to) {
        return auditLogRepository.findByOverallResultAndScreeningTimestampBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL,
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay().minusNanos(1)
        );
    }

    @Transactional(readOnly = true)
    public List<PaymentShariahAuditLog> getOverriddenPayments(LocalDate from, LocalDate to) {
        return auditLogRepository.findByActionTaken(IslamicPaymentDomainEnums.AuditActionTaken.MANUAL_OVERRIDE).stream()
                .filter(logEntry -> !logEntry.getScreeningTimestamp().toLocalDate().isBefore(from)
                        && !logEntry.getScreeningTimestamp().toLocalDate().isAfter(to))
                .toList();
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.PaymentComplianceSummary getComplianceSummary(LocalDate from, LocalDate to) {
        Instant fromTs = from.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant toTs = to.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        long screened = extensionRepository.countByShariahScreeningResultAndCreatedAtBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.PASS, fromTs, toTs)
                + extensionRepository.countByShariahScreeningResultAndCreatedAtBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT, fromTs, toTs)
                + extensionRepository.countByShariahScreeningResultAndCreatedAtBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.WARN, fromTs, toTs)
                + extensionRepository.countByShariahScreeningResultAndCreatedAtBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL, fromTs, toTs);
        long blocked = getBlockedPayments(from, to).size();
        long overrides = getOverriddenPayments(from, to).size();
        long alerts = auditLogRepository.findByOverallResultAndScreeningTimestampBetween(
                IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT,
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay().minusNanos(1)
        ).size();
        long total = auditLogRepository.findByScreeningTimestampBetween(
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay().minusNanos(1)
        ).size();

        BigDecimal passRate = total == 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(Math.max(total - blocked, 0))
                .multiply(new BigDecimal("100"))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        return IslamicPaymentResponses.PaymentComplianceSummary.builder()
                .totalPayments(total)
                .screenedCount(screened)
                .blockedCount(blocked)
                .alertCount(alerts)
                .overrideCount(overrides)
                .passRate(passRate)
                .build();
    }

    public PaymentInstruction processStandingInstruction(StandingInstruction instruction) {
        IslamicPaymentResponses.PaymentResponse response = initiatePayment(toStandingOrderRequest(instruction));
        PaymentInstruction payment = response.getPaymentInstruction();
        if (payment == null) {
            throw new BusinessException("Standing-order payment did not produce a payment record", "STANDING_PAYMENT_NOT_CREATED");
        }
        payment.setPaymentType(instruction.getInstructionType() == InstructionType.STANDING_ORDER
                ? PaymentType.STANDING_ORDER
                : PaymentType.DIRECT_DEBIT);
        payment.setPaymentRail("STANDING");
        payment.setExecutionDate(LocalDate.now());
        return paymentInstructionRepository.save(payment);
    }

    private IslamicPaymentResponses.PaymentResponse doInitiate(
            IslamicPaymentRequests.IslamicPaymentRequest request,
            IslamicPaymentRequests.ManualOverrideRequest overrideRequest,
            boolean complianceUser) {
        Account sourceAccount = paymentSupport.loadSourceAccount(request.getSourceAccountId());
        IslamicPaymentSupport.SourceAccountProfile sourceProfile = paymentSupport.resolveSourceProfile(sourceAccount);

        if (overrideRequest == null) {
            PaymentInstruction existingPayment = findExistingIdempotentPayment(request);
            if (existingPayment != null) {
                log.info("Duplicate Islamic payment request detected for reference {} - returning existing payment {}",
                        request.getReference(), existingPayment.getInstructionRef());
                return IslamicPaymentResponses.PaymentResponse.builder()
                        .paymentId(existingPayment.getId())
                        .paymentRef(existingPayment.getInstructionRef())
                        .paymentInstruction(existingPayment)
                        .screeningResult(reconstructScreeningResult(existingPayment.getId(), existingPayment.getInstructionRef()))
                        .status(existingPayment.getStatus().name())
                        .message("Duplicate request reference detected; returning the existing payment record")
                        .build();
            }
        }

        if (sourceProfile.islamic() && !request.isRequireShariahScreening()) {
            throw new BusinessException("Payments from Islamic accounts must be Shariah-screened", "SHARIAH-PAY-001");
        }

        if (sourceAccount.getAvailableBalance().compareTo(expectedTotalDebit(sourceAccount, request)) < 0) {
            throw new BusinessException("Insufficient balance including expected Islamic transfer fee", "INSUFFICIENT_BALANCE");
        }

        IslamicPaymentResponses.PaymentScreeningResult screeningResult = shouldScreen(request, sourceProfile)
                ? screeningService.screenForExecution(request, sourceAccount, sourceProfile)
                : IslamicPaymentResponses.PaymentScreeningResult.builder()
                .paymentRef(request.getReference())
                .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED)
                .overallResult(IslamicPaymentDomainEnums.PaymentScreeningResult.PASS)
                .screeningDurationMs(0L)
                .build();

        boolean manualOverride = false;
        if (overrideRequest != null) {
            if (screeningResult.getOutcome() == IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED && !complianceUser) {
                throw new BusinessException("BLOCK results require COMPLIANCE override authority", "PAYMENT_BLOCK_OVERRIDE_FORBIDDEN");
            }
            manualOverride = true;
        }

        if (screeningResult.getOutcome() == IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED && !manualOverride) {
            PaymentInstruction blockedPayment = paymentSupport.createRejectedPayment(
                    request,
                    sourceAccount,
                    screeningResult.getBlockReason()
            );
                saveExtension(
                    blockedPayment,
                    request,
                    sourceProfile,
                    screeningResult,
                    overrideRequest,
                    false
            );
            screeningService.persistAuditLog(blockedPayment.getId(), blockedPayment.getInstructionRef(), request, sourceAccount, screeningResult);
            return IslamicPaymentResponses.PaymentResponse.builder()
                    .paymentId(blockedPayment.getId())
                    .paymentRef(blockedPayment.getInstructionRef())
                    .paymentInstruction(blockedPayment)
                    .screeningResult(screeningResult)
                    .status(blockedPayment.getStatus().name())
                    .message(screeningResult.getBlockReason())
                    .build();
        }

        PaymentInstruction payment = executeBasePayment(request, sourceAccount);
        if (manualOverride) {
            screeningResult.setOutcome(IslamicPaymentDomainEnums.ScreeningOutcome.MANUAL_OVERRIDE);
        }
        updateBasePaymentScreening(payment, screeningResult);
        PaymentIslamicExtension extension = saveExtension(
                payment,
                request,
                sourceProfile,
                screeningResult,
                overrideRequest,
                true
        );
        screeningService.persistAuditLog(payment.getId(), payment.getInstructionRef(), request, sourceAccount, screeningResult);

        IslamicFeeResponses.FeeChargeResult feeChargeResult = maybeChargePaymentFee(request, sourceAccount, payment);
        enrichByChannel(payment, extension, request, screeningResult.getScreeningDurationMs());

        return IslamicPaymentResponses.PaymentResponse.builder()
                .paymentId(payment.getId())
                .paymentRef(payment.getInstructionRef())
                .paymentInstruction(payment)
                .screeningResult(screeningResult)
                .status(payment.getStatus().name())
                .message(manualOverride ? "Payment processed with manual override" : "Payment processed successfully")
                .feeCharged(feeChargeResult != null ? feeChargeResult.getChargedAmount() : BigDecimal.ZERO)
                .feeJournalRef(feeChargeResult != null ? feeChargeResult.getJournalRef() : null)
                .build();
    }

    private boolean shouldScreen(IslamicPaymentRequests.IslamicPaymentRequest request,
                                 IslamicPaymentSupport.SourceAccountProfile sourceProfile) {
        return sourceProfile.islamic() || request.isRequireShariahScreening();
    }

    private PaymentInstruction executeBasePayment(IslamicPaymentRequests.IslamicPaymentRequest request, Account sourceAccount) {
        String channel = paymentSupport.uppercase(request.getPaymentChannel());
        return switch (channel) {
            case "INTERNAL" -> {
                Long creditAccountId = accountRepository.findByAccountNumber(request.getDestinationAccountNumber())
                        .map(Account::getId)
                        .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", request.getDestinationAccountNumber()));
                yield paymentService.executeInternalTransfer(
                        sourceAccount.getId(),
                        creditAccountId,
                        request.getAmount(),
                        request.getReference()
                );
            }
            case "SWIFT" -> paymentService.initiateSwiftTransfer(
                    sourceAccount.getId(),
                    request.getDestinationAccountNumber(),
                    request.getBeneficiaryName(),
                    firstNonBlank(request.getDestinationBankSwift(), request.getDestinationBankCode()),
                    request.getBeneficiaryBankName(),
                    request.getAmount(),
                    request.getCurrencyCode(),
                    firstNonBlank(request.getDestinationCurrencyCode(), request.getCurrencyCode()),
                    paymentSupport.resolvePurposeCode(request.getPurpose()),
                    request.getReference(),
                    firstNonBlank(request.getChargeOption(), "SHA"),
                    false
            );
            case "IPS" -> paymentService.initiateDomesticPayment(
                    sourceAccount.getId(),
                    request.getDestinationAccountNumber(),
                    request.getBeneficiaryName(),
                    request.getDestinationBankCode(),
                    request.getAmount(),
                    request.getCurrencyCode(),
                    request.getReference(),
                    true
            );
            default -> paymentService.initiateDomesticPayment(
                    sourceAccount.getId(),
                    request.getDestinationAccountNumber(),
                    request.getBeneficiaryName(),
                    request.getDestinationBankCode(),
                    request.getAmount(),
                    request.getCurrencyCode(),
                    request.getReference(),
                    false
            );
        };
    }

    private void updateBasePaymentScreening(PaymentInstruction payment,
                                            IslamicPaymentResponses.PaymentScreeningResult screeningResult) {
        payment.setScreeningStatus(switch (screeningResult.getOutcome()) {
            case BLOCKED -> "HIT";
            case ALLOWED_WITH_ALERT, MANUAL_OVERRIDE -> "ESCALATED";
            default -> "CLEAR";
        });
        payment.setScreeningRef(screeningResult.getScreeningRef());
        if (payment.getStatus() == PaymentStatus.VALIDATED) {
            payment.setStatus(PaymentStatus.SUBMITTED);
        }
        paymentInstructionRepository.save(payment);
    }

    private PaymentIslamicExtension saveExtension(PaymentInstruction payment,
                                                  IslamicPaymentRequests.IslamicPaymentRequest request,
                                                  IslamicPaymentSupport.SourceAccountProfile sourceProfile,
                                                  IslamicPaymentResponses.PaymentScreeningResult screeningResult,
                                                  IslamicPaymentRequests.ManualOverrideRequest overrideRequest,
                                                  boolean screened) {
        PaymentIslamicExtension extension = extensionRepository.findByPaymentId(payment.getId()).orElseGet(() ->
                PaymentIslamicExtension.builder()
                        .paymentId(payment.getId())
                        .tenantId(paymentSupport.currentTenantId())
                        .build());
        extension.setShariahScreened(screened);
        extension.setShariahScreeningRef(screeningResult.getScreeningRef());
        extension.setShariahScreeningResult(screeningResult.getOverallResult());
        extension.setShariahScreenedAt(screened ? java.time.LocalDateTime.now() : null);
        extension.setMerchantCategoryCode(request.getMerchantCategoryCode());
        extension.setMerchantName(request.getMerchantName());
        extension.setMerchantCountry(paymentSupport.resolveCountryCode(request));
        extension.setHaramMcc(screeningResult.getCheckResults().stream()
                .anyMatch(check -> check.getCheckType() == IslamicPaymentDomainEnums.CheckType.MCC
                        && check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL));
        extension.setCounterpartyOnExclusionList(screeningResult.getCheckResults().stream()
                .anyMatch(check -> check.getCheckType() == IslamicPaymentDomainEnums.CheckType.COUNTERPARTY
                        && (check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL
                        || check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT)));
        extension.setExclusionListMatchDetails(screeningResult.getCheckResults().stream()
                .filter(check -> check.getResult() == IslamicPaymentDomainEnums.CheckResult.FAIL
                        || check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT)
                .map(IslamicPaymentResponses.ScreeningCheckResult::getMatchedValue)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null));
        extension.setSourceAccountIsIslamic(sourceProfile.islamic());
        extension.setSourceContractTypeCode(sourceProfile.contractTypeCode());
        extension.setSourceProductCode(sourceProfile.productCode());
        extension.setPaymentPurpose(request.getPurpose());
        extension.setPurposeDescription(request.getPurposeDescription());
        extension.setShariahPurposeFlag(paymentSupport.resolvePurposeFlag(screeningResult.getOutcome(), request.getPurposeDescription()));
        extension.setIslamicTransactionCode(firstNonBlank(request.getIslamicTransactionCode(), paymentSupport.resolvePurposeCode(request.getPurpose())));
        extension.setAaoifiReportingCategory(request.getAaoifiReportingCategory());
        extension.setComplianceActionTaken(resolveComplianceAction(screeningResult.getOutcome()));
        extension.setManualOverrideBy(overrideRequest != null ? paymentSupport.currentActor() : null);
        extension.setManualOverrideReason(overrideRequest != null ? overrideRequest.getReason() : null);
        extension.setManualOverrideApprovedBy(overrideRequest != null ? overrideRequest.getApprovedBy() : null);
        return extensionRepository.save(extension);
    }

    private IslamicPaymentDomainEnums.PaymentComplianceAction resolveComplianceAction(
            IslamicPaymentDomainEnums.ScreeningOutcome outcome) {
        return switch (outcome) {
            case BLOCKED -> IslamicPaymentDomainEnums.PaymentComplianceAction.BLOCKED;
            case ALLOWED_WITH_ALERT -> IslamicPaymentDomainEnums.PaymentComplianceAction.ALLOWED_WITH_ALERT;
            case MANUAL_OVERRIDE -> IslamicPaymentDomainEnums.PaymentComplianceAction.MANUAL_OVERRIDE;
            default -> IslamicPaymentDomainEnums.PaymentComplianceAction.PASSED;
        };
    }

    private void enrichByChannel(PaymentInstruction payment,
                                 PaymentIslamicExtension extension,
                                 IslamicPaymentRequests.IslamicPaymentRequest request,
                                 long screeningDurationMs) {
        String channel = paymentSupport.uppercase(request.getPaymentChannel());
        switch (channel) {
            case "SWIFT" -> crossBorderPaymentService.processCrossBorderPayment(payment, extension, request);
            case "IPS" -> instantPaymentService.recordInstantPayment(payment, extension, request, screeningDurationMs);
            case "ACH", "RTGS" -> domesticPaymentService.processDomesticPayment(
                    payment.getId(),
                    paymentSupport.resolveCountryCode(request),
                    null,
                    channel
            );
            default -> {
                if (payment.getPaymentType() == PaymentType.DOMESTIC_BATCH || payment.getPaymentType() == PaymentType.DOMESTIC_INSTANT) {
                    domesticPaymentService.processDomesticPayment(payment.getId());
                }
            }
        }
    }

    private BigDecimal expectedTotalDebit(Account sourceAccount, IslamicPaymentRequests.IslamicPaymentRequest request) {
        BigDecimal expected = request.getAmount();
        IslamicFeeResponses.FeeCalculationResult feePreview = previewPaymentFee(sourceAccount, request);
        if (feePreview != null) {
            expected = expected.add(feePreview.getCalculatedAmount());
        }
        return expected;
    }

    private IslamicFeeResponses.FeeCalculationResult previewPaymentFee(Account sourceAccount,
                                                                       IslamicPaymentRequests.IslamicPaymentRequest request) {
        if ("INTERNAL".equalsIgnoreCase(request.getPaymentChannel())) {
            return null;
        }
        try {
            return islamicFeeService.calculateFeeByCode(
                    "GEN-FEE-WIRE-001",
                    IslamicFeeResponses.FeeCalculationContext.builder()
                            .transactionAmount(request.getAmount())
                            .accountBalance(sourceAccount.getAvailableBalance())
                            .transferType("SWIFT".equalsIgnoreCase(request.getPaymentChannel()) ? "INTERNATIONAL" : "DOMESTIC")
                            .currencyCode(request.getCurrencyCode())
                            .build()
            );
        } catch (Exception ex) {
            log.warn("Islamic wire fee preview unavailable: {}", ex.getMessage());
            return null;
        }
    }

    private IslamicFeeResponses.FeeChargeResult maybeChargePaymentFee(IslamicPaymentRequests.IslamicPaymentRequest request,
                                                                      Account sourceAccount,
                                                                      PaymentInstruction payment) {
        if ("INTERNAL".equalsIgnoreCase(request.getPaymentChannel())) {
            return null;
        }
        try {
            return islamicFeeService.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                    .feeCode("GEN-FEE-WIRE-001")
                    .accountId(sourceAccount.getId())
                    .transactionAmount(request.getAmount())
                    .accountBalance(sourceAccount.getAvailableBalance())
                    .customerSegment("STANDARD")
                    .transactionType("WIRE_TRANSFER")
                    .triggerRef(payment.getInstructionRef())
                    .narration("Islamic payment fee for " + payment.getInstructionRef())
                    .currencyCode(request.getCurrencyCode())
                    .customerId(sourceAccount.getCustomer() != null ? sourceAccount.getCustomer().getId() : null)
                    .transferType("SWIFT".equalsIgnoreCase(request.getPaymentChannel()) ? "INTERNATIONAL" : "DOMESTIC")
                    .build());
        } catch (Exception ex) {
            log.warn("Islamic payment fee charge failed for {}: {}", payment.getInstructionRef(), ex.getMessage());
            return null;
        }
    }

    private IslamicPaymentRequests.IslamicPaymentRequest toStandingOrderRequest(StandingInstruction instruction) {
        String channel = accountRepository.findByAccountNumber(instruction.getCreditAccountNumber()).isPresent()
                ? "INTERNAL"
                : "ACH";
        return IslamicPaymentRequests.IslamicPaymentRequest.builder()
                .sourceAccountId(instruction.getDebitAccount().getId())
                .destinationAccountNumber(instruction.getCreditAccountNumber())
                .destinationBankCode(instruction.getCreditBankCode())
                .beneficiaryName(instruction.getCreditAccountName())
                .amount(instruction.getAmount())
                .currencyCode(instruction.getCurrencyCode())
                .paymentChannel(channel)
                .purpose(IslamicPaymentDomainEnums.PaymentPurpose.GENERAL)
                .purposeDescription(instruction.getNarration())
                .reference(instruction.getInstructionRef())
                .requireShariahScreening(true)
                .build();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private PaymentInstruction findExistingIdempotentPayment(IslamicPaymentRequests.IslamicPaymentRequest request) {
        if (!StringUtils.hasText(request.getReference())) {
            return null;
        }
        return paymentInstructionRepository
                .findFirstByDebitAccountIdAndCreditAccountNumberAndAmountAndCurrencyCodeAndPaymentRailAndRemittanceInfoOrderByCreatedAtDesc(
                        request.getSourceAccountId(),
                        request.getDestinationAccountNumber(),
                        request.getAmount(),
                        request.getCurrencyCode(),
                        paymentSupport.uppercase(request.getPaymentChannel()),
                        request.getReference())
                .orElse(null);
    }

    private IslamicPaymentResponses.PaymentScreeningResult reconstructScreeningResult(Long paymentId, String paymentRef) {
        PaymentShariahAuditLog auditLog = auditLogRepository.findByPaymentId(paymentId).orElse(null);
        PaymentIslamicExtension extension = extensionRepository.findByPaymentId(paymentId).orElse(null);
        IslamicPaymentDomainEnums.PaymentScreeningResult result = extension != null
                ? extension.getShariahScreeningResult()
                : auditLog != null ? auditLog.getOverallResult() : IslamicPaymentDomainEnums.PaymentScreeningResult.PASS;
        IslamicPaymentDomainEnums.ScreeningOutcome outcome = switch (result) {
            case FAIL -> IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED;
            case ALERT -> auditLog != null && auditLog.getActionTaken() == IslamicPaymentDomainEnums.AuditActionTaken.MANUAL_OVERRIDE
                    ? IslamicPaymentDomainEnums.ScreeningOutcome.MANUAL_OVERRIDE
                    : IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT;
            case WARN -> IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_WARNING;
            default -> IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED;
        };
        return IslamicPaymentResponses.PaymentScreeningResult.builder()
                .paymentRef(paymentRef)
                .outcome(outcome)
                .overallResult(result)
                .screeningRef(extension != null ? extension.getShariahScreeningRef() : auditLog != null ? auditLog.getPaymentRef() : null)
                .screeningDurationMs(auditLog != null ? auditLog.getScreeningDurationMs() : 0L)
                .blockReason(auditLog != null && auditLog.getFailedRuleDescriptions() != null && !auditLog.getFailedRuleDescriptions().isEmpty()
                        ? auditLog.getFailedRuleDescriptions().getFirst()
                        : null)
                .build();
    }
}
