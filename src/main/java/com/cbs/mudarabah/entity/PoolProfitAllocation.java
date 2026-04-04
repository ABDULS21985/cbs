package com.cbs.mudarabah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pool_profit_allocation", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PoolProfitAllocation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "mudarabah_account_id", nullable = false)
    private Long mudarabahAccountId;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "total_daily_product", precision = 18, scale = 4)
    private BigDecimal totalDailyProduct;

    @Column(name = "pool_total_daily_product", precision = 18, scale = 4)
    private BigDecimal poolTotalDailyProduct;

    @Column(name = "weightage_percentage", precision = 12, scale = 8)
    private BigDecimal weightagePercentage;

    @Column(name = "pool_gross_profit", precision = 18, scale = 4)
    private BigDecimal poolGrossProfit;

    @Column(name = "gross_share_before_per", precision = 18, scale = 4)
    private BigDecimal grossShareBeforePer;

    @Builder.Default
    @Column(name = "per_adjustment", precision = 18, scale = 4)
    private BigDecimal perAdjustment = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "irr_deduction", precision = 18, scale = 4)
    private BigDecimal irrDeduction = BigDecimal.ZERO;

    @Column(name = "net_share_after_reserves", precision = 18, scale = 4)
    private BigDecimal netShareAfterReserves;

    @Column(name = "customer_psr", precision = 8, scale = 4)
    private BigDecimal customerPsr;

    @Column(name = "customer_profit_share", precision = 18, scale = 4)
    private BigDecimal customerProfitShare;

    @Column(name = "bank_profit_share", precision = 18, scale = 4)
    private BigDecimal bankProfitShare;

    @Column(name = "effective_profit_rate", precision = 8, scale = 4)
    private BigDecimal effectiveProfitRate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "distribution_status")
    private ProfitAllocationStatus distributionStatus = ProfitAllocationStatus.CALCULATED;

    @Column(name = "distributed_at")
    private LocalDateTime distributedAt;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "tenant_id")
    private Long tenantId;
}
