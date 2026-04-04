package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReserveExecutionSummary {

    private ReserveExecutionResult perResult;
    private ReserveExecutionResult irrResult;
    private BigDecimal originalDepositorPool;
    private BigDecimal afterPer;
    private BigDecimal afterIrr;
    private BigDecimal finalDistributableAmount;
    private BigDecimal totalReserveImpact;
    private BigDecimal effectiveRateOriginal;
    private BigDecimal effectiveRateFinal;
    private String smoothingDescription;
}
