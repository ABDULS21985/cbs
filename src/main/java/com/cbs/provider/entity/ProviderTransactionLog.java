package com.cbs.provider.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "provider_transaction_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderTransactionLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;

    @Column(name = "operation_type", length = 25)
    private String operationType;

    @Column(name = "request_timestamp")
    private Instant requestTimestamp;

    @Column(name = "response_timestamp")
    private Instant responseTimestamp;

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    @Column(name = "request_payload_ref", length = 200)
    private String requestPayloadRef;

    @Column(name = "response_code", length = 20)
    private String responseCode;

    @Column(name = "response_status", length = 10)
    private String responseStatus;

    @Column(name = "cost_charged", precision = 12, scale = 4)
    private BigDecimal costCharged;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "error_code", length = 30)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
