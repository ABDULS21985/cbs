package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReserveImpactAnalysis {

    private Long distributionRunId;
    private BigDecimal originalAmount;
    private BigDecimal afterPer;
    private BigDecimal afterIrr;
    private BigDecimal finalAmount;
    private BigDecimal totalRetained;
    private BigDecimal totalReleased;
    private BigDecimal netImpact;
    private List<ReserveExecutionResult> transactions;
}
