package com.cbs.fingateway.service;

import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fingateway.entity.*;
import com.cbs.fingateway.repository.*;
import com.cbs.sanctions.service.SanctionsScreeningService;
import com.cbs.sanctions.entity.ScreeningRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class FinancialGatewayService {

    private final FinancialGatewayRepository gatewayRepository;
    private final GatewayMessageRepository messageRepository;
    private final SanctionsScreeningService sanctionsScreeningService;
    private final RestTemplate restTemplate;

    @Transactional
    public FinancialGateway registerGateway(FinancialGateway gw) { return gatewayRepository.save(gw); }

    public String buildMt103(SwiftTransferDetails details) {
        return String.join("\n",
                ":20:" + details.transactionReference(),
                ":23B:CRED",
                ":32A:" + details.valueDate().format(DateTimeFormatter.ofPattern("yyMMdd"))
                        + details.currency()
                        + formatSwiftAmount(details.amount()),
                ":50K:/" + details.orderingCustomerAccount() + "\n" + details.orderingCustomerName(),
                ":53A:" + (details.senderCorrespondentBic() != null ? details.senderCorrespondentBic() : ""),
                ":57A:" + (details.accountWithInstitutionBic() != null ? details.accountWithInstitutionBic() : ""),
                ":59:/" + details.beneficiaryAccountNumber() + "\n" + details.beneficiaryName(),
                ":70:" + (details.remittanceInfo() != null ? details.remittanceInfo() : ""),
                ":71A:" + details.chargeType()
        );
    }

    @Transactional
    public GatewayMessage sendMessage(GatewayMessage msg) {
        SyntheticCapabilityGuard.requireSyntheticServices(
                "Financial gateway delivery",
                "Connect this service to a real gateway transport or explicitly enable synthetic services for isolated test/load execution."
        );

        long startTime = System.currentTimeMillis();
        msg.setMessageRef("GW-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        FinancialGateway gw = gatewayRepository.findById(msg.getGatewayId())
                .orElseThrow(() -> new ResourceNotFoundException("FinancialGateway", "id", msg.getGatewayId()));

        if (!"CONNECTED".equals(gw.getConnectionStatus()))
            throw new BusinessException("Gateway not connected: " + gw.getGatewayCode() + " (" + gw.getConnectionStatus() + ")");

        // Real sanctions screening via SanctionsScreeningService
        msg.setSanctionsChecked(true);
        try {
            ScreeningRequest screeningResult = sanctionsScreeningService.screenName(
                    "GATEWAY_MESSAGE",
                    msg.getReceiverBic() != null ? msg.getReceiverBic() : "",
                    "INSTITUTION",
                    null, null, null, null,
                    msg.getMessageRef(),
                    null, null
            );
            msg.setSanctionsResult(screeningResult.getStatus());
            log.info("Sanctions screening completed for message ref={}: result={}",
                    msg.getMessageRef(), screeningResult.getStatus());

            if (!"CLEAR".equals(screeningResult.getStatus())) {
                msg.setDeliveryStatus("BLOCKED");
                msg.setValidationStatus("SANCTIONS_HOLD");
                msg.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));
                GatewayMessage blocked = messageRepository.save(msg);
                log.warn("Gateway message blocked by sanctions screening: ref={}, screeningStatus={}",
                        msg.getMessageRef(), screeningResult.getStatus());
                return blocked;
            }
        } catch (Exception e) {
            log.error("Sanctions screening failed for message ref={}: {}", msg.getMessageRef(), e.getMessage());
            msg.setSanctionsResult("ERROR");
            msg.setDeliveryStatus("BLOCKED");
            msg.setValidationStatus("SANCTIONS_ERROR");
            msg.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));
            return messageRepository.save(msg);
        }
        msg.setValidationStatus("VALID");

        // Persist to outbox with PENDING status before attempting delivery
        msg.setDeliveryStatus("PENDING");
        msg.setDeliveryAttempts(0);
        GatewayMessage saved = messageRepository.save(msg);

        // Attempt delivery via RestTemplate
        try {
            String deliveryUrl = gw.getEndpointUrl();
            if (deliveryUrl != null) {
                restTemplate.postForEntity(deliveryUrl, msg, String.class);
                saved.setDeliveryStatus("SENT");
                saved.setSentAt(Instant.now());
                saved.setDeliveryAttempts(1);
                log.info("Gateway message delivered: ref={}, gw={}", saved.getMessageRef(), gw.getGatewayCode());
            } else {
                log.warn("No endpoint URL configured for gateway {}; message remains PENDING for retry",
                        gw.getGatewayCode());
            }
        } catch (Exception e) {
            saved.setDeliveryAttempts(saved.getDeliveryAttempts() + 1);
            log.warn("Gateway message delivery failed, will retry: ref={}, attempt={}, error={}",
                    saved.getMessageRef(), saved.getDeliveryAttempts(), e.getMessage());
            // Leave status as PENDING for retry by a scheduled process
        }

        saved.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

        // Update gateway counters
        gw.setMessagesToday(gw.getMessagesToday() + 1);
        if (msg.getAmount() != null) gw.setValueToday(gw.getValueToday().add(msg.getAmount()));
        gw.setLastHeartbeatAt(Instant.now());
        gatewayRepository.save(gw);

        saved = messageRepository.save(saved);
        log.info("Gateway message processed: ref={}, gw={}, type={}, deliveryStatus={}, amount={} {}",
                saved.getMessageRef(), gw.getGatewayCode(), saved.getMessageType(),
                saved.getDeliveryStatus(), saved.getAmount(), saved.getCurrency());
        return saved;
    }

    @Transactional
    public GatewayMessage acknowledgeMessage(String messageRef, String ackReference) {
        GatewayMessage msg = getMessage(messageRef);
        msg.setDeliveryStatus("ACKNOWLEDGED");
        msg.setAckReference(ackReference);
        msg.setAckAt(Instant.now());
        return messageRepository.save(msg);
    }

    @Transactional
    public GatewayMessage nackMessage(String messageRef, String reason) {
        GatewayMessage msg = getMessage(messageRef);
        msg.setDeliveryStatus("NACKED");
        msg.setNackReason(reason);
        return messageRepository.save(msg);
    }

    public List<GatewayMessage> getQueuedMessages(Long gatewayId) {
        return messageRepository.findByGatewayIdAndDeliveryStatusOrderByQueuedAtAsc(gatewayId, "QUEUED");
    }

    public List<FinancialGateway> getByType(String type) { return gatewayRepository.findByGatewayTypeAndIsActiveTrueOrderByGatewayNameAsc(type); }
    public List<GatewayMessage> getAllMessages() { return messageRepository.findAll(); }

    private GatewayMessage getMessage(String ref) {
        return messageRepository.findByMessageRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("GatewayMessage", "messageRef", ref));
    }

    private String formatSwiftAmount(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
    }

    public record SwiftTransferDetails(
            String transactionReference,
            LocalDate valueDate,
            String currency,
            BigDecimal amount,
            String orderingCustomerAccount,
            String orderingCustomerName,
            String beneficiaryAccountNumber,
            String beneficiaryName,
            String remittanceInfo,
            String chargeType,
            String senderCorrespondentBic,
            String accountWithInstitutionBic
    ) {}
}
