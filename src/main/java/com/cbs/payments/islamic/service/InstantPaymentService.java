package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IpsReversalEvent;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.gateway.IpsGatewayClient;
import com.cbs.payments.islamic.gateway.IpsGatewayResponse;
import com.cbs.payments.islamic.repository.InstantPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InstantPaymentService {

    private final InstantPaymentExtensionRepository extensionRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final PaymentIslamicExtensionRepository paymentIslamicExtensionRepository;
    private final PaymentShariahAuditLogRepository auditLogRepository;
    private final IslamicPaymentSupport paymentSupport;
    private final ApplicationEventPublisher eventPublisher;
    private final IpsGatewayClient ipsGatewayClient;

    public IslamicPaymentResponses.InstantPaymentResult processInstantPayment(Long paymentId) {
        PaymentInstruction payment = loadPayment(paymentId);
        PaymentIslamicExtension islamicExtension = loadIslamicExtension(paymentId);
        long screeningDuration = auditLogRepository.findByPaymentId(paymentId)
                .map(audit -> audit.getScreeningDurationMs())
                .orElse(0L);
        return recordInstantPayment(payment, islamicExtension, null, screeningDuration);
    }

    public IslamicPaymentResponses.InstantPaymentResult recordInstantPayment(PaymentInstruction payment,
                                                                            PaymentIslamicExtension islamicExtension,
                                                                            IslamicPaymentRequests.IslamicPaymentRequest request,
                                                                            long screeningDurationMs) {
        if (!islamicExtension.isShariahScreened()) {
            throw new BusinessException("Payment must be screened before instant processing", "PAYMENT_NOT_SCREENED");
        }

        LocalDateTime start = LocalDateTime.now();
        IslamicPaymentResponses.ProxyResolutionResult resolution = null;
        if (request != null && request.getProxyType() != null && request.getProxyValue() != null) {
            resolution = resolveProxy(
                    IslamicPaymentDomainEnums.ProxyType.valueOf(request.getProxyType().toUpperCase()),
                    request.getProxyValue()
            );
        }

        IslamicPaymentDomainEnums.InstantScreeningMode screeningMode =
                screeningDurationMs > 100 ? IslamicPaymentDomainEnums.InstantScreeningMode.DEFERRED
                        : IslamicPaymentDomainEnums.InstantScreeningMode.REAL_TIME;

        InstantPaymentExtension extension = extensionRepository.findByPaymentId(payment.getId()).orElseGet(() ->
                InstantPaymentExtension.builder()
                        .paymentId(payment.getId())
                        .tenantId(paymentSupport.currentTenantId())
                        .requestReceivedAt(start)
                        .build());
        extension.setIpsRail("SARIE_EXPRESS");
        extension.setRequestReceivedAt(extension.getRequestReceivedAt() != null ? extension.getRequestReceivedAt() : start);
        extension.setScreeningCompletedAt(start.plusNanos(screeningDurationMs * 1_000_000));
        extension.setScreeningDurationMs(screeningDurationMs);
        extension.setPaymentSubmittedAt(LocalDateTime.now());
        extension.setPaymentConfirmedAt(null);
        extension.setScreeningMode(screeningMode);
        extension.setDeferredScreeningResult(screeningMode == IslamicPaymentDomainEnums.InstantScreeningMode.DEFERRED
                ? IslamicPaymentDomainEnums.DeferredScreeningResult.PENDING
                : IslamicPaymentDomainEnums.DeferredScreeningResult.PASS);
        extension.setProxyType(request != null && request.getProxyType() != null
                ? IslamicPaymentDomainEnums.ProxyType.valueOf(request.getProxyType().toUpperCase())
                : null);
        extension.setProxyValue(request != null ? request.getProxyValue() : null);
        extension.setResolvedAccountNumber(resolution != null ? resolution.getResolvedAccountNumber() : payment.getCreditAccountNumber());
        extension.setResolvedBankCode(resolution != null ? resolution.getResolvedBankCode() : payment.getBeneficiaryBankCode());

        String transactionId = paymentSupport.nextMessageRef("IPS", payment.getId());
        IpsGatewayResponse gatewayResponse = ipsGatewayClient.submit(payment, extension, transactionId);
        extension.setIpsResponseCode(gatewayResponse.responseCode());
        extension.setIpsResponseMessage(gatewayResponse.responseMessage());
        extension.setIpsTransactionId(gatewayResponse.transactionId());
        extension.setTotalProcessingMs(Math.max(ChronoUnit.MILLIS.between(start, LocalDateTime.now()), screeningDurationMs));

        if (isGatewayConfirmed(gatewayResponse.responseCode())) {
            extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.CONFIRMED);
            extension.setPaymentConfirmedAt(LocalDateTime.now());
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setFailureReason(null);
        } else if (gatewayResponse.timeout()) {
            extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.TIMED_OUT);
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(gatewayResponse.responseMessage());
            log.warn("IPS gateway timeout for payment {}: txnId={}", payment.getId(), gatewayResponse.transactionId());
        } else if (isGatewayAccepted(gatewayResponse.responseCode())) {
            extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.SUBMITTED);
            payment.setStatus(PaymentStatus.SUBMITTED);
            payment.setFailureReason(null);
        } else {
            extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.REJECTED);
            payment.setStatus(PaymentStatus.REJECTED);
            payment.setFailureReason(gatewayResponse.responseMessage());
            log.warn("IPS gateway rejected payment {}: code={}, message={}",
                    payment.getId(), gatewayResponse.responseCode(), gatewayResponse.responseMessage());
        }

        paymentInstructionRepository.save(payment);
        extensionRepository.save(extension);

        return IslamicPaymentResponses.InstantPaymentResult.builder()
                .paymentId(payment.getId())
                .paymentRef(payment.getInstructionRef())
                .ipsRail(extension.getIpsRail())
                .ipsTransactionId(extension.getIpsTransactionId())
                .status(extension.getStatus().name())
                .totalProcessingMs(extension.getTotalProcessingMs())
                .screeningMode(extension.getScreeningMode())
                .deferredScreeningResult(extension.getDeferredScreeningResult())
                .build();
    }

    public void processDeferredScreening(Long paymentId) {
        InstantPaymentExtension extension = extensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Instant payment extension not found", "INSTANT_PAYMENT_NOT_FOUND"));
        IslamicPaymentDomainEnums.InstantPaymentStatus priorStatus = extension.getStatus();

        if (extension.getDeferredScreeningResult() != IslamicPaymentDomainEnums.DeferredScreeningResult.PENDING) {
            log.info("Deferred screening already completed for payment {} with result {}",
                    paymentId, extension.getDeferredScreeningResult());
            return;
        }

        PaymentIslamicExtension islamicExtension = paymentIslamicExtensionRepository.findByPaymentId(paymentId)
                .orElse(null);
        PaymentInstruction payment = paymentInstructionRepository.findByIdWithDetails(paymentId).orElse(null);

        IslamicPaymentDomainEnums.DeferredScreeningResult result;
        try {
            var screeningResult = paymentSupport.screenPayment(payment, islamicExtension);
            String recommendedAction = recommendedAction(screeningResult);
            boolean blocked = "BLOCK".equalsIgnoreCase(recommendedAction);
            result = blocked
                    ? IslamicPaymentDomainEnums.DeferredScreeningResult.FAIL
                    : IslamicPaymentDomainEnums.DeferredScreeningResult.PASS;

            if (blocked) {
                log.warn("Deferred screening FAILED for payment {} — action: {}",
                        paymentId, recommendedAction);
            }
        } catch (Exception e) {
            log.error("Deferred screening error for payment {} — failing closed: {}", paymentId, e.getMessage());
            result = IslamicPaymentDomainEnums.DeferredScreeningResult.FAIL;
        }

        extension.setDeferredScreeningResult(result);
        extension.setDeferredScreeningCompletedAt(LocalDateTime.now());
        if (result == IslamicPaymentDomainEnums.DeferredScreeningResult.FAIL) {
            extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.RETURNED);
            extension.setIpsResponseCode("SHARIAH_FAIL");
            extension.setIpsResponseMessage("Deferred Shariah screening failed — payment returned");
            log.warn("Deferred screening FAILED for payment {} — reversal required", paymentId);
            if (payment != null) {
                payment.setStatus(PaymentStatus.RETURNED);
                payment.setFailureReason("Deferred Shariah screening failed — payment returned");
                paymentInstructionRepository.save(payment);
            }
            if (payment != null && requiresFundRecovery(priorStatus)) {
                publishReversalEvent(payment, extension);
            }
        }
        extensionRepository.save(extension);

        log.info("Deferred screening completed for payment {}: result={}", paymentId, result);
    }

    public void processDeferredScreeningBatch() {
        extensionRepository.findByDeferredScreeningResult(IslamicPaymentDomainEnums.DeferredScreeningResult.PENDING)
                .forEach(extension -> processDeferredScreening(extension.getPaymentId()));
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.ProxyResolutionResult resolveProxy(IslamicPaymentDomainEnums.ProxyType proxyType,
                                                                      String proxyValue) {
        if (proxyValue == null || proxyValue.isBlank()) {
            throw new BusinessException("Proxy value is required", "PROXY_VALUE_REQUIRED");
        }

        // IBAN proxy: validate format and resolve directly
        if (proxyType == IslamicPaymentDomainEnums.ProxyType.IBAN) {
            String normalized = proxyValue.replaceAll("\\s", "").toUpperCase();
            if (normalized.length() < 15 || normalized.length() > 34) {
                throw new BusinessException("Invalid IBAN format", "INVALID_IBAN");
            }
            String bankCode = normalized.length() >= 6 ? normalized.substring(4, 8) : "UNKNOWN";
            return IslamicPaymentResponses.ProxyResolutionResult.builder()
                    .proxyType(proxyType).proxyValue(proxyValue)
                    .resolvedAccountNumber(normalized).resolvedBankCode(bankCode).found(true)
                    .build();
        }

        // For non-IBAN proxy types, look up in the proxy directory
        // This is an integration point — per-country IPS registry lookup is required
        var proxyEntry = paymentSupport.lookupProxyDirectory(proxyType, proxyValue);
        if (proxyEntry != null && proxyEntry.resolvedAccountNumber() != null) {
            return IslamicPaymentResponses.ProxyResolutionResult.builder()
                    .proxyType(proxyType).proxyValue(proxyValue)
                    .resolvedAccountNumber(proxyEntry.resolvedAccountNumber())
                    .resolvedBankCode(proxyEntry.resolvedBankCode())
                    .found(true)
                    .build();
        }

        log.warn("Proxy resolution failed: type={}, value={} — not found in directory", proxyType, proxyValue);
        throw new BusinessException(
                "Proxy resolution for type " + proxyType + " requires IPS registry integration",
                HttpStatus.SERVICE_UNAVAILABLE,
                "PROXY_RESOLUTION_UNAVAILABLE");
    }

    @Transactional(readOnly = true)
    public InstantPaymentExtension getDetails(Long paymentId) {
        return extensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Instant payment extension not found", "INSTANT_PAYMENT_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public List<InstantPaymentExtension> getPendingDeferredScreenings() {
        return extensionRepository.findByDeferredScreeningResult(IslamicPaymentDomainEnums.DeferredScreeningResult.PENDING);
    }

    private String recommendedAction(IslamicPaymentResponses.PaymentScreeningResult screeningResult) {
        if (screeningResult == null) {
            return "ALLOW";
        }
        if (screeningResult.getOutcome() != null) {
            return switch (screeningResult.getOutcome()) {
                case BLOCKED -> "BLOCK";
                case ALLOWED_WITH_ALERT, ALLOWED_WITH_WARNING, MANUAL_OVERRIDE -> "REVIEW";
                case ALLOWED -> "ALLOW";
            };
        }
        if (screeningResult.getOverallResult() != null) {
            return switch (screeningResult.getOverallResult()) {
                case FAIL -> "BLOCK";
                case ALERT, WARN -> "REVIEW";
                case PASS -> "ALLOW";
                case NOT_SCREENED -> "PENDING";
            };
        }
        return screeningResult.getBlockReason() != null ? "BLOCK" : "ALLOW";
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.InstantPaymentPerformanceMetrics getPerformanceMetrics(LocalDate date) {
        List<InstantPaymentExtension> extensions = extensionRepository.findAll().stream()
                .filter(extension -> extension.getRequestReceivedAt() != null)
                .filter(extension -> extension.getRequestReceivedAt().toLocalDate().isEqual(date))
                .sorted(Comparator.comparing(InstantPaymentExtension::getTotalProcessingMs, Comparator.nullsLast(Long::compareTo)))
                .toList();

        return IslamicPaymentResponses.InstantPaymentPerformanceMetrics.builder()
                .date(date)
                .averageProcessingMs(average(extensions.stream().map(InstantPaymentExtension::getTotalProcessingMs).toList()))
                .p95ProcessingMs(percentile(extensions, 95))
                .p99ProcessingMs(percentile(extensions, 99))
                .averageScreeningMs(average(extensions.stream().map(InstantPaymentExtension::getScreeningDurationMs).toList()))
                .deferredScreeningCount(extensions.stream()
                        .filter(extension -> extension.getScreeningMode() == IslamicPaymentDomainEnums.InstantScreeningMode.DEFERRED)
                        .count())
                .successCount(extensions.stream().filter(extension -> extension.getStatus() == IslamicPaymentDomainEnums.InstantPaymentStatus.SUBMITTED
                    || extension.getStatus() == IslamicPaymentDomainEnums.InstantPaymentStatus.CONFIRMED).count())
                .rejectionCount(extensions.stream().filter(extension -> extension.getStatus() == IslamicPaymentDomainEnums.InstantPaymentStatus.REJECTED).count())
                .timeoutCount(extensions.stream().filter(extension -> extension.getStatus() == IslamicPaymentDomainEnums.InstantPaymentStatus.TIMED_OUT).count())
                .build();
    }

    private BigDecimal average(List<Long> values) {
        List<Long> filtered = values.stream().filter(java.util.Objects::nonNull).toList();
        if (filtered.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(filtered.stream().mapToLong(Long::longValue).average().orElse(0d))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal percentile(List<InstantPaymentExtension> extensions, int percentile) {
        if (extensions.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        int index = (int) Math.ceil((percentile / 100d) * extensions.size()) - 1;
        index = Math.max(0, Math.min(index, extensions.size() - 1));
        Long value = extensions.get(index).getTotalProcessingMs();
        return BigDecimal.valueOf(value != null ? value : 0L).setScale(2, RoundingMode.HALF_UP);
    }

    private PaymentInstruction loadPayment(Long paymentId) {
        return paymentInstructionRepository.findByIdWithDetails(paymentId)
                .orElseThrow(() -> new BusinessException("Payment not found", "PAYMENT_NOT_FOUND"));
    }

    private PaymentIslamicExtension loadIslamicExtension(Long paymentId) {
        return paymentIslamicExtensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Islamic payment extension not found", "PAYMENT_ISLAMIC_EXTENSION_NOT_FOUND"));
    }

    private boolean isGatewayConfirmed(String responseCode) {
        return matchesGatewayCode(responseCode, "00", "SUCCESS", "ACSC", "ACCC");
    }

    private boolean isGatewayAccepted(String responseCode) {
        return matchesGatewayCode(responseCode, "QUEUED", "PENDING", "ACSP", "RCVD", "RECEIVED", "SUBMITTED");
    }

    private boolean matchesGatewayCode(String responseCode, String... acceptedCodes) {
        if (responseCode == null) {
            return false;
        }
        for (String acceptedCode : acceptedCodes) {
            if (acceptedCode.equalsIgnoreCase(responseCode)) {
                return true;
            }
        }
        return false;
    }

    private boolean requiresFundRecovery(IslamicPaymentDomainEnums.InstantPaymentStatus priorStatus) {
        return priorStatus == IslamicPaymentDomainEnums.InstantPaymentStatus.SUBMITTED
                || priorStatus == IslamicPaymentDomainEnums.InstantPaymentStatus.CONFIRMED;
    }

    private void publishReversalEvent(PaymentInstruction payment, InstantPaymentExtension extension) {
        eventPublisher.publishEvent(new IpsReversalEvent(
                extension.getPaymentId(),
                payment.getInstructionRef(),
                extension.getIpsTransactionId(),
                extension.getIpsRail(),
                payment.getAmount(),
                payment.getCurrencyCode(),
                payment.getDebitAccountNumber(),
                extension.getResolvedAccountNumber(),
                "Deferred Shariah screening failed — payment returned",
                extension.getTenantId() != null ? extension.getTenantId().toString() : null,
                extension.getPaymentConfirmedAt(),
                LocalDateTime.now()
        ));

        log.info("Reversal event published for payment {}: ipsTransactionId={}",
                payment.getId(), extension.getIpsTransactionId());
    }
}
