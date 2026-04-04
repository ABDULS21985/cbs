package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.DistributionRunStatus;
import com.cbs.profitdistribution.entity.PeriodType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProfitDistributionRunResponse {

    private Long id;
    private String runRef;
    private Long poolId;
    private String poolCode;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private PeriodType periodType;
    private String currencyCode;
    private Long profitCalculationId;
    private Long allocationBatchId;

    // Financial metrics
    private BigDecimal grossPoolIncome;
    private BigDecimal charityIncomeExcluded;
    private BigDecimal poolExpenses;
    private BigDecimal netDistributableProfit;
    private BigDecimal bankMudaribShare;
    private BigDecimal depositorPoolBeforeReserves;
    private BigDecimal perAdjustment;
    private BigDecimal irrAdjustment;
    private BigDecimal depositorPoolAfterReserves;
    private BigDecimal totalDistributedToDepositors;
    private BigDecimal totalBankShareFromPsr;

    // Distribution metrics
    private Integer participantCount;
    private BigDecimal averageEffectiveRate;
    private BigDecimal minimumRate;
    private BigDecimal maximumRate;
    private BigDecimal medianRate;

    // Loss handling
    private boolean isLoss;
    private BigDecimal totalLossAmount;
    private BigDecimal lossAbsorbedByIrr;
    private BigDecimal lossPassedToDepositors;

    // Status
    private DistributionRunStatus status;

    // Audit trail
    private String initiatedBy;
    private LocalDateTime initiatedAt;
    private String calculatedBy;
    private LocalDateTime calculatedAt;
    private String calculationApprovedBy;
    private LocalDateTime calculationApprovedAt;
    private String reservesAppliedBy;
    private LocalDateTime reservesAppliedAt;
    private String allocatedBy;
    private LocalDateTime allocatedAt;
    private String allocationApprovedBy;
    private LocalDateTime allocationApprovedAt;
    private String distributedBy;
    private LocalDateTime distributedAt;
    private String ssbReviewedBy;
    private LocalDateTime ssbReviewedAt;
    private String ssbCertificationRef;
    private String ssbComments;
    private LocalDateTime completedAt;

    // Failure fields
    private LocalDateTime failedAt;
    private String failureReason;
    private String failedStep;
    private int retryCount;

    // Reversal fields
    private LocalDateTime reversedAt;
    private String reversedBy;
    private String reversalReason;
    private String reversalJournalRef;

    private Long tenantId;
}
