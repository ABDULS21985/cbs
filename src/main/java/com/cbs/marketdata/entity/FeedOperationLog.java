package com.cbs.marketdata.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "feed_operation_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeedOperationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long feedId;

    @Column(nullable = false, length = 25)
    private String operationType;

    @Column(nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    private Integer recordsReceived;
    private Integer recordsProcessed;
    private Integer recordsRejected;
    private Integer latencyMs;

    @Column(length = 30)
    private String errorCode;

    private String errorMessage;

    @Column(length = 200)
    private String recoveryAction;

    private Integer connectionDurationSeconds;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
