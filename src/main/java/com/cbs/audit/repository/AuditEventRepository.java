package com.cbs.audit.repository;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.entity.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    Page<AuditEvent> findByEntityTypeAndEntityIdOrderByEventTimestampDesc(String entityType, Long entityId, Pageable pageable);
    Page<AuditEvent> findByPerformedByOrderByEventTimestampDesc(String performedBy, Pageable pageable);
    Page<AuditEvent> findByActionOrderByEventTimestampDesc(AuditAction action, Pageable pageable);
    Page<AuditEvent> findByEventTypeOrderByEventTimestampDesc(String eventType, Pageable pageable);
}
