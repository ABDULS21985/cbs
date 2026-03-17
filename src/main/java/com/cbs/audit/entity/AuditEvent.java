package com.cbs.audit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "audit_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "entity_type", nullable = false, length = 50) private String entityType;
    @Column(name = "entity_id", nullable = false) private Long entityId;
    @Column(name = "performed_by", nullable = false, length = 100) private String performedBy;
    @Column(name = "performed_from_ip", length = 45) private String performedFromIp;
    @Column(name = "session_id", length = 100) private String sessionId;
    @Column(name = "channel", length = 20) private String channel;

    @Column(name = "action", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) private AuditAction action;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "before_state", columnDefinition = "jsonb") private Map<String, Object> beforeState;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "after_state", columnDefinition = "jsonb") private Map<String, Object> afterState;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "changed_fields", columnDefinition = "jsonb") private List<String> changedFields;
    @Column(name = "description", columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "metadata", columnDefinition = "jsonb") private Map<String, Object> metadata;
    @Column(name = "event_timestamp", nullable = false) @Builder.Default private Instant eventTimestamp = Instant.now();
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
