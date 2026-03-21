package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "security_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String eventId;
    @Column(nullable = false, length = 40) private String eventCategory;
    @Column(nullable = false, length = 10) private String severity;
    @Column(nullable = false, length = 80) private String eventSource;
    @Column(nullable = false, length = 100) private String eventType;
    @Column(columnDefinition = "TEXT") private String description;
    private Long userId;
    @Column(length = 80) private String username;
    @Column(length = 50) private String ipAddress;
    @Column(columnDefinition = "TEXT") private String userAgent;
    @Column(length = 100) private String geoLocation;
    @Column(length = 60) private String resourceType;
    @Column(length = 100) private String resourceId;
    @Column(length = 40) private String actionTaken;
    @Builder.Default private Integer threatScore = 0;
    @Column(length = 80) private String correlationId;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> rawPayload;
    @Column(nullable = false) @Builder.Default private Boolean isAcknowledged = false;
    @Column(length = 80) private String acknowledgedBy;
    private Instant acknowledgedAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
