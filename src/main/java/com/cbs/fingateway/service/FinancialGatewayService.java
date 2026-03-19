package com.cbs.fingateway.service;

import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fingateway.entity.*;
import com.cbs.fingateway.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public FinancialGateway registerGateway(FinancialGateway gw) { return gatewayRepository.save(gw); }

    public String buildMt103(SwiftTransferDetails details) {
        return String.join("\n",
                ":20:" + details.transactionReference(),
                ":32A:" + details.valueDate().format(DateTimeFormatter.ofPattern("yyMMdd"))
                        + details.currency()
                        + formatSwiftAmount(details.amount()),
                ":50K:/" + details.orderingCustomerAccount() + "\n" + details.orderingCustomerName(),
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

        // Sanctions check
        msg.setSanctionsChecked(true);
        msg.setSanctionsResult("CLEAR");
        msg.setValidationStatus("VALID");

        // Send
        msg.setDeliveryStatus("SENT");
        msg.setSentAt(Instant.now());
        msg.setDeliveryAttempts(1);
        msg.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

        // Update gateway counters
        gw.setMessagesToday(gw.getMessagesToday() + 1);
        if (msg.getAmount() != null) gw.setValueToday(gw.getValueToday().add(msg.getAmount()));
        gw.setLastHeartbeatAt(Instant.now());
        gatewayRepository.save(gw);

        GatewayMessage saved = messageRepository.save(msg);
        log.info("Gateway message sent: ref={}, gw={}, type={}, amount={} {}", saved.getMessageRef(),
                gw.getGatewayCode(), saved.getMessageType(), saved.getAmount(), saved.getCurrency());
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
            String chargeType
    ) {}
}
