package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

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
    private List<OverAssignmentAlert> overAssignments;
    private boolean hasCurrencyMismatch;
    private List<String> currencyMismatches;
    private boolean hasOverdueAssets;
    private List<String> overdueAssets;
    private long defaultedAssetCount;
    private String validatedAt;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OverAssignmentAlert {
        private Long assetReferenceId;
        private String assetReferenceCode;
        private BigDecimal assignedAcrossPools;
        private BigDecimal currentOutstanding;
        private BigDecimal excessAmount;
    }
}
