package com.cbs.security.siem.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "siem_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SiemEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "event_source", nullable = false, length = 50) private String eventSource;
    @Column(name = "event_category", nullable = false, length = 30) private String eventCategory;
    @Column(name = "severity", nullable = false, length = 10) private String severity;
    @Column(name = "event_description", nullable = false, columnDefinition = "TEXT") private String eventDescription;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "event_data", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> eventData = new HashMap<>();
    @Column(name = "user_id", length = 100) private String userId;
    @Column(name = "ip_address", length = 45) private String ipAddress;
    @Column(name = "session_id", length = 100) private String sessionId;
    @Column(name = "correlation_id", length = 50) private String correlationId;
    @Column(name = "forwarded_to_siem", nullable = false) @Builder.Default private Boolean forwardedToSiem = false;
    @Column(name = "siem_event_id", length = 100) private String siemEventId;
    @Column(name = "forwarded_at") private Instant forwardedAt;
    @Column(name = "event_timestamp", nullable = false) @Builder.Default private Instant eventTimestamp = Instant.now();
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
