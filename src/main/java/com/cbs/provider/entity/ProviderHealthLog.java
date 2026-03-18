package com.cbs.provider.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "provider_health_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderHealthLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(name = "check_timestamp", nullable = false)
    @Builder.Default
    private Instant checkTimestamp = Instant.now();

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    @Column(name = "http_status_code")
    private Integer httpStatusCode;

    @Column(name = "is_healthy")
    private Boolean isHealthy;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "request_count")
    private Integer requestCount;

    @Column(name = "error_count")
    private Integer errorCount;

    @Column(name = "error_rate_pct", precision = 5, scale = 2)
    private BigDecimal errorRatePct;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
