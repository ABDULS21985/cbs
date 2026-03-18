package com.cbs.custody.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "settlement_batch")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SettlementBatch extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String batchRef;

    @Column(length = 30)
    private String depositoryCode;

    private LocalDate settlementDate;

    @Builder.Default
    private Integer totalInstructions = 0;

    @Builder.Default
    private Integer settledCount = 0;

    @Builder.Default
    private Integer failedCount = 0;

    @Builder.Default
    private Integer pendingCount = 0;

    private BigDecimal totalDebitAmount;

    private BigDecimal totalCreditAmount;

    private BigDecimal netAmount;

    @Column(length = 3)
    private String currency;

    private LocalTime cutoffTime;

    private Instant submittedAt;

    private Instant completedAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PREPARING";
}
