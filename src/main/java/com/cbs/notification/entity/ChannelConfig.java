package com.cbs.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity(name = "NotificationChannelConfig")
@Table(name = "channel_config", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private NotificationChannel channel;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String provider = "DEFAULT";

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> config = Map.of();

    @Column(name = "sender_address", length = 200)
    private String senderAddress;

    @Column(name = "api_key", length = 500)
    private String apiKey;

    @Column(name = "api_secret", length = 500)
    private String apiSecret;

    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;

    @Column(name = "rate_limit")
    @Builder.Default
    private Integer rateLimit = 100;

    @Column(name = "retry_enabled", nullable = false)
    @Builder.Default
    private Boolean retryEnabled = true;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    private Long version;
}
