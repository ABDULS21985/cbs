package com.cbs.audit.service;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.entity.AuditEvent;
import com.cbs.audit.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    /**
     * Logs an audit event asynchronously with full before/after state.
     * Runs in a separate transaction so audit logging never causes business failures.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, String entityType, Long entityId,
                           AuditAction action, String performedBy, String ipAddress,
                           String sessionId, String channel, String description,
                           Map<String, Object> beforeState, Map<String, Object> afterState,
                           List<String> changedFields, Map<String, Object> metadata) {
        AuditEvent event = AuditEvent.builder()
                .eventType(eventType).entityType(entityType).entityId(entityId)
                .action(action).performedBy(performedBy)
                .performedFromIp(ipAddress).sessionId(sessionId).channel(channel)
                .description(description)
                .beforeState(beforeState).afterState(afterState)
                .changedFields(changedFields).metadata(metadata)
                .eventTimestamp(Instant.now()).build();

        auditEventRepository.save(event);
        log.debug("Audit: {} {} {} by {} from {}", action, entityType, entityId, performedBy, ipAddress);
    }

    /** Simplified overload for common operations. */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType, Long entityId, AuditAction action,
                      String performedBy, String description) {
        logEvent(action.name() + "_" + entityType, entityType, entityId,
                action, performedBy, null, null, null, description,
                null, null, null, null);
    }

    public Page<AuditEvent> getEntityAuditTrail(String entityType, Long entityId, Pageable pageable) {
        return auditEventRepository.findByEntityTypeAndEntityIdOrderByEventTimestampDesc(entityType, entityId, pageable);
    }

    public Page<AuditEvent> getUserAuditTrail(String performedBy, Pageable pageable) {
        return auditEventRepository.findByPerformedByOrderByEventTimestampDesc(performedBy, pageable);
    }

    public Page<AuditEvent> getByAction(AuditAction action, Pageable pageable) {
        return auditEventRepository.findByActionOrderByEventTimestampDesc(action, pageable);
    }
}
