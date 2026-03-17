package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "dead_letter_queue")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeadLetterQueue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long messageId;
    @Column(nullable = false) private Long routeId;
    @Column(nullable = false, columnDefinition = "TEXT") private String failureReason;
    @Column(columnDefinition = "TEXT") private String originalPayload;
    @Builder.Default private Integer retryCount = 0;
    @Builder.Default private Integer maxRetries = 3;
    private Instant nextRetryAt;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    private String resolvedBy;
    private Instant resolvedAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
