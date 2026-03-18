package com.cbs.programtrading.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "program_execution")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProgramExecution extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String executionRef;

    @Column(nullable = false)
    private Long strategyId;

    @Column(nullable = false)
    private LocalDate executionDate;

    @Column(length = 30)
    private String parentOrderRef;

    private BigDecimal targetQuantity;
    private BigDecimal targetAmount;

    @Builder.Default
    private BigDecimal executedQuantity = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal executedAmount = BigDecimal.ZERO;

    private BigDecimal avgExecutionPrice;
    private BigDecimal benchmarkPrice;
    private BigDecimal slippageBps;

    @Builder.Default
    private Integer childOrderCount = 0;

    @Builder.Default
    private BigDecimal completionPct = BigDecimal.ZERO;

    private Instant startedAt;
    private Instant completedAt;
    private String cancelledReason;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";
}
