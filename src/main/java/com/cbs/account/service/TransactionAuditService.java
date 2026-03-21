package com.cbs.account.service;

import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.entity.TransactionAuditEvent;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.TransactionAuditEventRepository;
import com.cbs.common.audit.CurrentActorProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionAuditService {

    private final TransactionAuditEventRepository transactionAuditEventRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordEvent(TransactionJournal transaction,
                            String eventType,
                            String description,
                            String channel,
                            Map<String, Object> metadata) {
        TransactionAuditEvent event = TransactionAuditEvent.builder()
                .transaction(transaction)
                .eventType(eventType)
                .actor(currentActorProvider.getCurrentActor())
                .channel(channel)
                .description(description)
                .metadata(metadata != null ? new LinkedHashMap<>(metadata) : new LinkedHashMap<>())
                .eventTimestamp(Instant.now())
                .build();
        transactionAuditEventRepository.save(event);
    }

    public List<TransactionWorkflowDto.AuditTrailEvent> getAuditTrail(TransactionJournal transaction) {
        List<TransactionWorkflowDto.AuditTrailEvent> events = new ArrayList<>();
        events.add(TransactionWorkflowDto.AuditTrailEvent.builder()
                .eventType("POSTED")
                .actor(transaction.getCreatedBy())
                .channel(transaction.getChannel() != null ? transaction.getChannel().name() : null)
                .timestamp(transaction.getCreatedAt())
                .description("Transaction posted")
                .metadata(Map.of(
                        "status", transaction.getStatus(),
                        "channel", transaction.getChannel() != null ? transaction.getChannel().name() : "SYSTEM"
                ))
                .build());

        transactionAuditEventRepository.findByTransactionIdOrderByEventTimestampAsc(transaction.getId())
                .forEach(event -> events.add(TransactionWorkflowDto.AuditTrailEvent.builder()
                        .id(event.getId())
                        .eventType(event.getEventType())
                        .actor(event.getActor())
                        .channel(event.getChannel())
                        .timestamp(event.getEventTimestamp())
                        .description(event.getDescription())
                        .metadata(event.getMetadata())
                        .build()));

        return events;
    }
}
