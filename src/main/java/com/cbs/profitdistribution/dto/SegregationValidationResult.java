package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SegregationValidationResult {

    private Long poolId;
    private String poolCode;
    private boolean isSegregated;
    private BigDecimal totalAssignedAssets;
    private BigDecimal totalParticipantBalances;
    private BigDecimal mismatchAmount;
    private BigDecimal mismatchPercentage;
    private boolean hasOverAssignedAssets;
    private String validatedAt;
}
