package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.repository.InstantPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
        extension.setIpsTransactionId(paymentSupport.nextMessageRef("IPS", payment.getId()));
        extension.setIpsResponseCode("00");
        extension.setIpsResponseMessage("APPROVED");
        extension.setRequestReceivedAt(extension.getRequestReceivedAt() != null ? extension.getRequestReceivedAt() : start);
        extension.setScreeningCompletedAt(start.plusNanos(screeningDurationMs * 1_000_000));
        extension.setScreeningDurationMs(screeningDurationMs);
        extension.setPaymentSubmittedAt(LocalDateTime.now());
        extension.setPaymentConfirmedAt(LocalDateTime.now());
        extension.setTotalProcessingMs(Math.max(screeningDurationMs, 20L));
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
        extension.setStatus(IslamicPaymentDomainEnums.InstantPaymentStatus.CONFIRMED);
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
        extension.setDeferredScreeningResult(IslamicPaymentDomainEnums.DeferredScreeningResult.PASS);
        extension.setDeferredScreeningCompletedAt(LocalDateTime.now());
        extensionRepository.save(extension);
    }

    public void processDeferredScreeningBatch() {
        extensionRepository.findByDeferredScreeningResult(IslamicPaymentDomainEnums.DeferredScreeningResult.PENDING)
                .forEach(extension -> processDeferredScreening(extension.getPaymentId()));
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.ProxyResolutionResult resolveProxy(IslamicPaymentDomainEnums.ProxyType proxyType,
                                                                      String proxyValue) {
        String digits = proxyValue == null ? "" : proxyValue.replaceAll("\\D", "");
        String resolvedAccount = digits.isEmpty() ? proxyValue : String.format("IPS%s", digits);
        String bankCode = switch (proxyType) {
            case MOBILE, EMAIL -> "IPS";
            case NATIONAL_ID, CR_NUMBER, IBAN -> "BANK";
        };
        return IslamicPaymentResponses.ProxyResolutionResult.builder()
                .proxyType(proxyType)
                .proxyValue(proxyValue)
                .resolvedAccountNumber(resolvedAccount)
                .resolvedBankCode(bankCode)
                .found(true)
                .build();
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
                .successCount(extensions.stream().filter(extension -> extension.getStatus() == IslamicPaymentDomainEnums.InstantPaymentStatus.CONFIRMED).count())
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
        return paymentInstructionRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException("Payment not found", "PAYMENT_NOT_FOUND"));
    }

    private PaymentIslamicExtension loadIslamicExtension(Long paymentId) {
        return paymentIslamicExtensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Islamic payment extension not found", "PAYMENT_ISLAMIC_EXTENSION_NOT_FOUND"));
    }
}
