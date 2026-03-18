package com.cbs.tdframework.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "td_framework_summary", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"agreement_id", "snapshot_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TdFrameworkSummary extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agreement_id", nullable = false)
    private Long agreementId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "active_deposits")
    @Builder.Default
    private Integer activeDeposits = 0;

    @Column(name = "total_principal", precision = 20, scale = 4)
    private BigDecimal totalPrincipal;

    @Column(name = "total_accrued_interest", precision = 20, scale = 4)
    private BigDecimal totalAccruedInterest;

    @Column(name = "weighted_avg_rate", precision = 8, scale = 4)
    private BigDecimal weightedAvgRate;

    @Column(name = "weighted_avg_tenor_days")
    private Integer weightedAvgTenorDays;

    @Column(name = "maturing_next_30_days", precision = 20, scale = 4)
    private BigDecimal maturingNext30Days;

    @Column(name = "maturing_next_60_days", precision = 20, scale = 4)
    private BigDecimal maturingNext60Days;

    @Column(name = "maturing_next_90_days", precision = 20, scale = 4)
    private BigDecimal maturingNext90Days;

    @Column(name = "expected_rollover_pct", precision = 5, scale = 2)
    private BigDecimal expectedRolloverPct;

    @Column(name = "concentration_pct", precision = 5, scale = 2)
    private BigDecimal concentrationPct;
}
