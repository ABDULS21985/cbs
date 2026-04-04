package com.cbs.profitdistribution.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "profit_distribution_run", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProfitDistributionRun extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_ref", nullable = false, unique = true, length = 80)
    private String runRef;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "pool_code", length = 60)
    private String poolCode;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", length = 20)
    private PeriodType periodType;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "profit_calculation_id")
    private Long profitCalculationId;

    @Column(name = "allocation_batch_id")
    private Long allocationBatchId;

    @Column(name = "gross_pool_income", precision = 18, scale = 4)
    private BigDecimal grossPoolIncome;

    @Column(name = "charity_income_excluded", precision = 18, scale = 4)
    private BigDecimal charityIncomeExcluded;

    @Column(name = "pool_expenses", precision = 18, scale = 4)
    private BigDecimal poolExpenses;

    @Column(name = "net_distributable_profit", precision = 18, scale = 4)
    private BigDecimal netDistributableProfit;

    @Column(name = "bank_mudarib_share", precision = 18, scale = 4)
    private BigDecimal bankMudaribShare;

    @Column(name = "depositor_pool_before_reserves", precision = 18, scale = 4)
    private BigDecimal depositorPoolBeforeReserves;

    @Column(name = "per_adjustment", precision = 18, scale = 4)
    private BigDecimal perAdjustment;

    @Column(name = "irr_adjustment", precision = 18, scale = 4)
    private BigDecimal irrAdjustment;

    @Column(name = "depositor_pool_after_reserves", precision = 18, scale = 4)
    private BigDecimal depositorPoolAfterReserves;

    @Column(name = "total_distributed_to_depositors", precision = 18, scale = 4)
    private BigDecimal totalDistributedToDepositors;

    @Column(name = "total_bank_share_from_psr", precision = 18, scale = 4)
    private BigDecimal totalBankShareFromPsr;

    @Column(name = "participant_count")
    private Integer participantCount;

    @Column(name = "average_effective_rate", precision = 8, scale = 4)
    private BigDecimal averageEffectiveRate;

    @Column(name = "minimum_rate", precision = 8, scale = 4)
    private BigDecimal minimumRate;

    @Column(name = "maximum_rate", precision = 8, scale = 4)
    private BigDecimal maximumRate;

    @Column(name = "median_rate", precision = 8, scale = 4)
    private BigDecimal medianRate;

    @Builder.Default
    @Column(name = "is_loss", nullable = false)
    private boolean isLoss = false;

    @Column(name = "total_loss_amount", precision = 18, scale = 4)
    private BigDecimal totalLossAmount;

    @Column(name = "loss_absorbed_by_irr", precision = 18, scale = 4)
    private BigDecimal lossAbsorbedByIrr;

    @Column(name = "loss_passed_to_depositors", precision = 18, scale = 4)
    private BigDecimal lossPassedToDepositors;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DistributionRunStatus status = DistributionRunStatus.INITIATED;

    // Audit trail fields
    @Column(name = "initiated_by", length = 100)
    private String initiatedBy;

    @Column(name = "initiated_at")
    private LocalDateTime initiatedAt;

    @Column(name = "calculated_by", length = 100)
    private String calculatedBy;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "calculation_approved_by", length = 100)
    private String calculationApprovedBy;

    @Column(name = "calculation_approved_at")
    private LocalDateTime calculationApprovedAt;

    @Column(name = "reserves_applied_by", length = 100)
    private String reservesAppliedBy;

    @Column(name = "reserves_applied_at")
    private LocalDateTime reservesAppliedAt;

    @Column(name = "allocated_by", length = 100)
    private String allocatedBy;

    @Column(name = "allocated_at")
    private LocalDateTime allocatedAt;

    @Column(name = "allocation_approved_by", length = 100)
    private String allocationApprovedBy;

    @Column(name = "allocation_approved_at")
    private LocalDateTime allocationApprovedAt;

    @Column(name = "distributed_by", length = 100)
    private String distributedBy;

    @Column(name = "distributed_at")
    private LocalDateTime distributedAt;

    @Column(name = "ssb_reviewed_by", length = 100)
    private String ssbReviewedBy;

    @Column(name = "ssb_reviewed_at")
    private LocalDateTime ssbReviewedAt;

    @Column(name = "ssb_certification_ref", length = 100)
    private String ssbCertificationRef;

    @Column(name = "ssb_comments", columnDefinition = "TEXT")
    private String ssbComments;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Failure fields
    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "failed_step", length = 60)
    private String failedStep;

    @Builder.Default
    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    // Reversal fields
    @Column(name = "reversed_at")
    private LocalDateTime reversedAt;

    @Column(name = "reversed_by", length = 100)
    private String reversedBy;

    @Column(name = "reversal_reason", columnDefinition = "TEXT")
    private String reversalReason;

    @Column(name = "reversal_journal_ref", length = 50)
    private String reversalJournalRef;

    @Column(name = "tenant_id")
    private Long tenantId;
}
