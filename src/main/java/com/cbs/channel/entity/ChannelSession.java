package com.cbs.channel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "channel_session", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "session_id", nullable = false, unique = true, length = 50) private String sessionId;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "channel", nullable = false, length = 20) private String channel;
    @Column(name = "device_id", length = 100) private String deviceId;
    @Column(name = "device_type", length = 20) private String deviceType;
    @Column(name = "ip_address", length = 45) private String ipAddress;
    @Column(name = "user_agent", length = 500) private String userAgent;
    @Column(name = "geo_latitude", precision = 10, scale = 7) private BigDecimal geoLatitude;
    @Column(name = "geo_longitude", precision = 10, scale = 7) private BigDecimal geoLongitude;
    @Column(name = "started_at", nullable = false) @Builder.Default private Instant startedAt = Instant.now();
    @Column(name = "last_activity_at", nullable = false) @Builder.Default private Instant lastActivityAt = Instant.now();
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "timeout_seconds", nullable = false) @Builder.Default private Integer timeoutSeconds = 300;
    @Column(name = "parent_session_id", length = 50) private String parentSessionId;
    @Column(name = "handoff_from_channel", length = 20) private String handoffFromChannel;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "context_data", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> contextData = new HashMap<>();
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();

    public boolean isExpired() {
        return Instant.now().isAfter(lastActivityAt.plusSeconds(timeoutSeconds));
    }

    public void handoffTo(String newChannel, String newSessionId) {
        this.status = "HANDED_OFF";
        this.endedAt = Instant.now();
    }
}
