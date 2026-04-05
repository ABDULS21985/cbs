package com.cbs.payments.islamic.service;

import com.cbs.eventing.service.EventingService;
import com.cbs.payments.islamic.dto.IpsReversalEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Handles IPS reversal events raised after deferred Shariah screening forces an
 * already-submitted instant payment into the fund-recovery workflow.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IpsReversalEventHandler {

    private static final String REVERSAL_EVENT_TYPE = "IPS_REVERSAL_REQUIRED";
    private static final String REVERSAL_TOPIC = "cbs.payments.instant.reversal";

    private final EventingService eventingService;

    /**
     * Persists the reversal request to the operational outbox after the parent
     * transaction commits successfully.
     *
     * @param event the reversal event raised by the instant payment service
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleReversalEvent(IpsReversalEvent event) {
        log.warn("IPS reversal requested: paymentId={}, paymentRef={}, ipsTransactionId={}, rail={}, amount={} {}",
                event.paymentId(), event.paymentRef(), event.ipsTransactionId(), event.ipsRail(), event.amount(), event.currency());
        forwardToOperationsQueue(event);
    }

    private void forwardToOperationsQueue(IpsReversalEvent event) {
        eventingService.publishEvent(
                REVERSAL_EVENT_TYPE,
                "PaymentInstruction",
                event.paymentId(),
                buildPayload(event),
                REVERSAL_TOPIC
        );

        log.info("IPS reversal forwarded to operations outbox: paymentId={}, ipsTransactionId={}",
                event.paymentId(), event.ipsTransactionId());
    }

    private Map<String, Object> buildPayload(IpsReversalEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("paymentId", event.paymentId());
        payload.put("paymentRef", event.paymentRef());
        payload.put("ipsTransactionId", event.ipsTransactionId());
        payload.put("ipsRail", event.ipsRail());
        payload.put("amount", event.amount());
        payload.put("currency", event.currency());
        payload.put("debitAccountNumber", event.debitAccountNumber());
        payload.put("creditAccountNumber", event.creditAccountNumber());
        payload.put("reversalReason", event.reversalReason());
        payload.put("tenantId", event.tenantId());
        payload.put("originalPaymentTimestamp", event.originalPaymentTimestamp());
        payload.put("reversalTimestamp", event.reversalTimestamp());
        return payload;
    }
}