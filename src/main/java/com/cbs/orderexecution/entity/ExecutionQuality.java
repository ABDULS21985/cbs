package com.cbs.orderexecution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "execution_quality")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExecutionQuality {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false, length = 20)
    private String benchmarkType;

    @Column(nullable = false)
    private BigDecimal benchmarkPrice;

    @Column(nullable = false)
    private BigDecimal avgExecutionPrice;

    private BigDecimal slippageBps;
    private BigDecimal implementationShortfall;
    private BigDecimal marketImpactBps;
    private BigDecimal timingCostBps;
    private Integer executionDurationSeconds;
    private BigDecimal fillRatePct;
    private Integer numberOfFills;

    @Column(nullable = false)
    private LocalDate analysisDate;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
