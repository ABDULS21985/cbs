package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.DomesticPaymentConfig;
import com.cbs.payments.islamic.entity.DomesticPaymentMessage;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.repository.DomesticPaymentConfigRepository;
import com.cbs.payments.islamic.repository.DomesticPaymentMessageRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DomesticPaymentService {

    private final DomesticPaymentConfigRepository configRepository;
    private final DomesticPaymentMessageRepository messageRepository;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final PaymentIslamicExtensionRepository extensionRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPaymentSupport paymentSupport;

    public IslamicPaymentResponses.DomesticPaymentResult processDomesticPayment(Long paymentId) {
        PaymentInstruction payment = loadPayment(paymentId);
        PaymentIslamicExtension extension = loadExtension(paymentId);
        DomesticPaymentConfig config = resolveConfig(payment, null, null, null);
        return createOrUpdateMessage(payment, extension, config);
    }

    public IslamicPaymentResponses.DomesticPaymentResult processDomesticPayment(Long paymentId,
                                                                               String countryCode,
                                                                               String railName,
                                                                               String railType) {
        PaymentInstruction payment = loadPayment(paymentId);
        PaymentIslamicExtension extension = loadExtension(paymentId);
        DomesticPaymentConfig config = resolveConfig(payment, countryCode, railName, railType);
        return createOrUpdateMessage(payment, extension, config);
    }

    @Transactional(readOnly = true)
    public DomesticPaymentMessage getPaymentMessage(Long paymentId) {
        return messageRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Domestic payment message not found", "DOMESTIC_MESSAGE_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public List<DomesticPaymentMessage> getPendingMessages(String countryCode) {
        return configRepository.findByCountryCodeAndActiveTrueOrderByRailNameAsc(countryCode).stream()
                .flatMap(config -> messageRepository.findByRailConfigIdAndStatus(config.getId(), IslamicPaymentDomainEnums.MessageStatus.PENDING).stream())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DomesticPaymentMessage> getRejectedMessages(LocalDate from, LocalDate to) {
        return messageRepository.findByStatusAndSubmittedAtBetween(
                IslamicPaymentDomainEnums.MessageStatus.REJECTED,
                from.atStartOfDay(),
                to.plusDays(1).atStartOfDay().minusNanos(1)
        );
    }

    @Transactional(readOnly = true)
    public IslamicPaymentResponses.DomesticPaymentSummary getDailySummary(String countryCode, LocalDate date) {
        List<DomesticPaymentMessage> messages = configRepository.findByCountryCodeAndActiveTrueOrderByRailNameAsc(countryCode).stream()
                .flatMap(config -> messageRepository.findByRailConfigIdAndStatus(config.getId(), IslamicPaymentDomainEnums.MessageStatus.SUBMITTED).stream())
                .filter(message -> message.getSubmittedAt() != null && message.getSubmittedAt().toLocalDate().isEqual(date))
                .toList();

        long rejected = getRejectedMessages(date, date).stream()
                .filter(message -> configRepository.findById(message.getRailConfigId())
                        .map(config -> countryCode.equalsIgnoreCase(config.getCountryCode()))
                        .orElse(false))
                .count();
        BigDecimal totalAmount = messages.stream()
                .map(message -> paymentInstructionRepository.findById(message.getPaymentId()).orElse(null))
                .filter(payment -> payment != null)
                .map(PaymentInstruction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return IslamicPaymentResponses.DomesticPaymentSummary.builder()
                .countryCode(countryCode)
                .date(date)
                .totalCount(messages.size() + rejected)
                .submittedCount(messages.size())
                .rejectedCount(rejected)
                .totalAmount(totalAmount)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean isRailAvailable(String countryCode, String railType) {
        IslamicPaymentDomainEnums.RailType resolvedRailType = IslamicPaymentDomainEnums.RailType.valueOf(railType.toUpperCase(Locale.ROOT));
        DomesticPaymentConfig config = configRepository.findByCountryCodeAndRailTypeAndActiveTrue(countryCode, resolvedRailType)
                .orElse(null);
        if (config == null) {
            return false;
        }
        if (!hijriCalendarService.isIslamicBusinessDay(LocalDate.now())) {
            return false;
        }
        if (config.getOperatingDays() != null && !config.getOperatingDays().isEmpty()) {
            String today = DayOfWeek.from(LocalDate.now()).name();
            if (!config.getOperatingDays().contains(today)) {
                return false;
            }
        }
        if (!StringUtils.hasText(config.getOperatingHoursStart()) || !StringUtils.hasText(config.getOperatingHoursEnd())) {
            return true;
        }
        LocalTime now = LocalTime.now();
        return !now.isBefore(LocalTime.parse(config.getOperatingHoursStart()))
                && !now.isAfter(LocalTime.parse(config.getOperatingHoursEnd()));
    }

    @Transactional(readOnly = true)
    public List<DomesticPaymentConfig> getConfigurations() {
        return configRepository.findByActiveTrueOrderByCountryCodeAscRailNameAsc();
    }

    public DomesticPaymentConfig updateConfig(Long configId, DomesticPaymentConfig update) {
        DomesticPaymentConfig existing = configRepository.findById(configId)
                .orElseThrow(() -> new BusinessException("Domestic payment config not found", "DOMESTIC_CONFIG_NOT_FOUND"));
        existing.setOperatingHoursStart(update.getOperatingHoursStart());
        existing.setOperatingHoursEnd(update.getOperatingHoursEnd());
        existing.setOperatingDays(update.getOperatingDays());
        existing.setMinimumAmount(update.getMinimumAmount());
        existing.setMaximumAmount(update.getMaximumAmount());
        existing.setSettlementCutoffTime(update.getSettlementCutoffTime());
        existing.setBankParticipantCode(update.getBankParticipantCode());
        existing.setActive(update.isActive());
        return configRepository.save(existing);
    }

    public IslamicPaymentResponses.AchBatchResult submitAchBatch(String countryCode, LocalDate valueDate) {
        log.info("Submitting ACH batch for country={} valueDate={}", countryCode, valueDate);

        DomesticPaymentConfig config = configRepository.findByCountryCodeIgnoreCaseOrderByRailNameAsc(countryCode).stream()
            .filter(candidate -> candidate.getRailType() == IslamicPaymentDomainEnums.RailType.ACH)
            .findFirst()
            .or(() -> configRepository.findByCountryCodeIgnoreCaseOrderByRailNameAsc(countryCode).stream().findFirst())
                .orElseThrow(() -> new BusinessException(
                        "No domestic payment config found for country: " + countryCode, "ACH_CONFIG_NOT_FOUND"));
        if (!config.isActive()) {
            throw new BusinessException("ACH rail is not active for country: " + countryCode, "ACH_RAIL_INACTIVE");
        }
        if (!hijriCalendarService.isIslamicBusinessDay(valueDate)) {
            throw new BusinessException(
                    "Value date " + valueDate + " is not an Islamic business day", "ACH_INVALID_VALUE_DATE");
        }

        List<DomesticPaymentMessage> pendingMessages = messageRepository
                .findByRailConfigIdAndStatus(config.getId(), IslamicPaymentDomainEnums.MessageStatus.PENDING);
        if (pendingMessages.isEmpty()) {
            log.info("No pending ACH messages for country={} valueDate={}", countryCode, valueDate);
            return IslamicPaymentResponses.AchBatchResult.builder()
                    .countryCode(countryCode).valueDate(valueDate)
                    .totalMessages(0).successCount(0).failureCount(0)
                    .build();
        }

        int successCount = 0;
        int failureCount = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        String batchRef = countryCode + "-ACH-" + valueDate + "-" + System.currentTimeMillis();

        for (DomesticPaymentMessage message : pendingMessages) {
            try {
                PaymentIslamicExtension extension = extensionRepository.findByPaymentId(message.getPaymentId())
                        .orElse(null);
                if (extension != null && !Boolean.TRUE.equals(extension.isShariahScreened())) {
                    message.setStatus(IslamicPaymentDomainEnums.MessageStatus.REJECTED);
                    message.setRejectionReason("Payment not Shariah-screened before ACH submission");
                    message.setRejectedAt(LocalDateTime.now());
                    messageRepository.save(message);
                    failureCount++;
                    continue;
                }
                message.setStatus(IslamicPaymentDomainEnums.MessageStatus.SUBMITTED);
                message.setSubmittedAt(LocalDateTime.now());
                messageRepository.save(message);

                PaymentInstruction payment = paymentInstructionRepository.findById(message.getPaymentId()).orElse(null);
                if (payment != null && payment.getAmount() != null) {
                    totalAmount = totalAmount.add(payment.getAmount());
                }
                successCount++;
            } catch (Exception e) {
                log.error("Failed to submit ACH message id={}: {}", message.getId(), e.getMessage());
                message.setStatus(IslamicPaymentDomainEnums.MessageStatus.REJECTED);
                message.setRejectionReason(e.getMessage());
                message.setRejectedAt(LocalDateTime.now());
                messageRepository.save(message);
                failureCount++;
            }
        }

        log.info("ACH batch submitted: country={}, valueDate={}, batch={}, total={}, success={}, failed={}",
                countryCode, valueDate, batchRef, pendingMessages.size(), successCount, failureCount);

        return IslamicPaymentResponses.AchBatchResult.builder()
                .countryCode(countryCode).valueDate(valueDate)
                .totalMessages(pendingMessages.size()).successCount(successCount).failureCount(failureCount)
                .totalAmount(totalAmount)
                .build();
    }

    private IslamicPaymentResponses.DomesticPaymentResult createOrUpdateMessage(PaymentInstruction payment,
                                                                                PaymentIslamicExtension extension,
                                                                                DomesticPaymentConfig config) {
        if (!Boolean.TRUE.equals(extension.isShariahScreened())) {
            throw new BusinessException("Payment must be screened before domestic rail submission", "PAYMENT_NOT_SCREENED");
        }
        validateAmount(payment.getAmount(), config);

        boolean railAvailable = isRailAvailable(config.getCountryCode(), config.getRailType().name());
        LocalDate valueDate = railAvailable ? LocalDate.now() : hijriCalendarService.getNextIslamicBusinessDay(LocalDate.now().plusDays(1));
        IslamicPaymentDomainEnums.MessageStatus status = railAvailable
                ? IslamicPaymentDomainEnums.MessageStatus.SUBMITTED
                : IslamicPaymentDomainEnums.MessageStatus.PENDING;

        DomesticPaymentMessage message = messageRepository.findByPaymentId(payment.getId()).orElseGet(() ->
                DomesticPaymentMessage.builder()
                        .paymentId(payment.getId())
                        .railConfigId(config.getId())
                        .messageRef(paymentSupport.nextMessageRef("DPM", payment.getId()))
                        .messageDirection(IslamicPaymentDomainEnums.MessageDirection.OUTBOUND)
                        .tenantId(paymentSupport.currentTenantId())
                        .build());
        message.setRailConfigId(config.getId());
        message.setMessageType(config.getMessageFormat() == IslamicPaymentDomainEnums.MessageFormat.ISO_20022
                ? "pacs.008.001.08"
                : "LOCAL-CREDIT");
        message.setMessageContent(buildMessageContent(payment, extension, config, valueDate));
        message.setIslamicTransactionCode(extension.getIslamicTransactionCode());
        message.setShariahComplianceFlag("Y");
        message.setStatus(status);
        message.setSubmittedAt(railAvailable ? LocalDateTime.now() : null);
        if (!railAvailable) {
            message.setRejectionReason("Queued for next Islamic business day due to rail availability window");
        }
        messageRepository.save(message);

        return IslamicPaymentResponses.DomesticPaymentResult.builder()
                .paymentId(payment.getId())
                .paymentRef(payment.getInstructionRef())
                .railName(config.getRailName())
                .railType(config.getRailType().name())
                .messageRef(message.getMessageRef())
                .status(status.name())
                .message(railAvailable ? "Domestic payment submitted to rail" : "Domestic payment queued for next business day")
                .valueDate(valueDate)
                .build();
    }

    private DomesticPaymentConfig resolveConfig(PaymentInstruction payment,
                                                String countryCode,
                                                String railName,
                                                String railType) {
        String resolvedCountry = StringUtils.hasText(countryCode)
                ? countryCode.toUpperCase(Locale.ROOT)
                : inferCountryFromCurrency(payment.getCurrencyCode());
        if (StringUtils.hasText(railName)) {
            return configRepository.findByCountryCodeAndRailName(resolvedCountry, railName)
                    .orElseThrow(() -> new BusinessException("Domestic rail config not found", "DOMESTIC_RAIL_NOT_FOUND"));
        }
        IslamicPaymentDomainEnums.RailType resolvedType = StringUtils.hasText(railType)
                ? IslamicPaymentDomainEnums.RailType.valueOf(railType.toUpperCase(Locale.ROOT))
                : inferRailType(payment);
        return configRepository.findByCountryCodeAndRailTypeAndActiveTrue(resolvedCountry, resolvedType)
                .orElseThrow(() -> new BusinessException("Domestic rail config not found", "DOMESTIC_RAIL_NOT_FOUND"));
    }

    private void validateAmount(BigDecimal amount, DomesticPaymentConfig config) {
        if (config.getMinimumAmount() != null && amount.compareTo(config.getMinimumAmount()) < 0) {
            throw new BusinessException("Payment amount below rail minimum", "DOMESTIC_MIN_AMOUNT");
        }
        if (config.getMaximumAmount() != null && amount.compareTo(config.getMaximumAmount()) > 0) {
            throw new BusinessException("Payment amount above rail maximum", "DOMESTIC_MAX_AMOUNT");
        }
    }

    private IslamicPaymentDomainEnums.RailType inferRailType(PaymentInstruction payment) {
        String rail = paymentSupport.uppercase(payment.getPaymentRail());
        if ("IPS".equals(rail) || payment.getPaymentType() == com.cbs.payments.entity.PaymentType.DOMESTIC_INSTANT) {
            return IslamicPaymentDomainEnums.RailType.IPS;
        }
        return payment.getAmount() != null && payment.getAmount().compareTo(new BigDecimal("50000.00")) >= 0
                ? IslamicPaymentDomainEnums.RailType.RTGS
                : IslamicPaymentDomainEnums.RailType.ACH;
    }

    private String inferCountryFromCurrency(String currencyCode) {
        return switch (paymentSupport.uppercase(currencyCode)) {
            case "SAR" -> "SA";
            case "AED" -> "AE";
            case "QAR" -> "QA";
            case "BHD" -> "BH";
            case "KWD" -> "KW";
            case "OMR" -> "OM";
            default -> "NG";
        };
    }

    private String buildMessageContent(PaymentInstruction payment,
                                       PaymentIslamicExtension extension,
                                       DomesticPaymentConfig config,
                                       LocalDate valueDate) {
        return "{"
                + "\"instructionRef\":\"" + payment.getInstructionRef() + "\","
                + "\"rail\":\"" + config.getRailName() + "\","
                + "\"amount\":\"" + payment.getAmount() + "\","
                + "\"currency\":\"" + payment.getCurrencyCode() + "\","
                + "\"valueDate\":\"" + valueDate + "\","
                + "\"shariahFlag\":\"Y\","
                + "\"islamicTxnCode\":\"" + extension.getIslamicTransactionCode() + "\""
                + "}";
    }

    private PaymentInstruction loadPayment(Long paymentId) {
        return paymentInstructionRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException("Payment not found", "PAYMENT_NOT_FOUND"));
    }

    private PaymentIslamicExtension loadExtension(Long paymentId) {
        return extensionRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException("Islamic payment extension not found", "PAYMENT_ISLAMIC_EXTENSION_NOT_FOUND"));
    }
}
