package com.cbs.payments.islamic.gateway;

import com.cbs.eventing.service.EventingService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fallback IPS gateway client used when the live gateway integration is disabled.
 * Instead of attempting network delivery, it writes a manual-processing event to
 * the outbox so operations can settle the payment through the configured fallback path.
 */
@Component
@ConditionalOnProperty(name = "cbs.ips.gateway.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class StubIpsGatewayClient implements IpsGatewayClient {

    private static final String MANUAL_PROCESSING_EVENT = "IPS_MANUAL_SUBMISSION_REQUIRED";
    private static final String MANUAL_PROCESSING_TOPIC = "cbs.payments.instant.manual-processing";

    private final EventingService eventingService;

    /**
     * Queues the payment for manual IPS operations handling when the live gateway is disabled.
     *
     * @param payment the core payment instruction
     * @param extension the instant-payment specific metadata
     * @param transactionId the locally generated correlation identifier
     * @return a queued response indicating that operational processing has been requested
     */
    @Override
    public IpsGatewayResponse submit(PaymentInstruction payment,
                                     InstantPaymentExtension extension,
                                     String transactionId) {
        eventingService.publishEvent(
                MANUAL_PROCESSING_EVENT,
                "PaymentInstruction",
                payment.getId(),
                buildManualProcessingPayload(payment, extension, transactionId),
                MANUAL_PROCESSING_TOPIC
        );

        log.info("IPS fallback queue event published: paymentId={}, rail={}, transactionId={}",
                payment.getId(), extension.getIpsRail(), transactionId);

        return new IpsGatewayResponse(
                "QUEUED",
                "Payment queued for manual IPS operations handling",
                transactionId,
                false
        );
    }

    private Map<String, Object> buildManualProcessingPayload(PaymentInstruction payment,
                                                             InstantPaymentExtension extension,
                                                             String transactionId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("paymentId", payment.getId());
        payload.put("paymentRef", payment.getInstructionRef());
        payload.put("transactionId", transactionId);
        payload.put("ipsRail", extension.getIpsRail());
        payload.put("amount", payment.getAmount());
        payload.put("currency", payment.getCurrencyCode());
        payload.put("debitAccountNumber", payment.getDebitAccountNumber());
        payload.put("creditAccountNumber", extension.getResolvedAccountNumber());
        payload.put("resolvedBankCode", extension.getResolvedBankCode());
        payload.put("proxyType", extension.getProxyType() != null ? extension.getProxyType().name() : null);
        payload.put("proxyValue", extension.getProxyValue());
        payload.put("screeningMode", extension.getScreeningMode() != null ? extension.getScreeningMode().name() : null);
        payload.put("requestedAt", LocalDateTime.now());
        return payload;
    }
}