package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity @Table(name = "webhook_delivery")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WebhookDelivery {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long webhookId;
    @Column(nullable = false, length = 100) private String event;
    @Builder.Default private Integer httpStatus = 0;
    @Builder.Default private Integer durationMs = 0;
    @Column(columnDefinition = "TEXT") private String requestBody;
    @Column(columnDefinition = "TEXT") private String responseBody;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Builder.Default private Integer attemptCount = 1;
    private Instant nextRetryAt;
    @Builder.Default private Instant deliveredAt = Instant.now();
}
