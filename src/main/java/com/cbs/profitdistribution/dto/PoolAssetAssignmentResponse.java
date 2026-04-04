package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.AssetType;
import com.cbs.profitdistribution.entity.AssignmentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolAssetAssignmentResponse {

    private Long id;
    private Long poolId;
    private AssetType assetType;
    private Long assetReferenceId;
    private String assetReferenceCode;
    private String assetDescription;
    private BigDecimal assignedAmount;
    private BigDecimal currentOutstanding;
    private String currencyCode;
    private LocalDate assignedDate;
    private LocalDate unassignedDate;
    private AssignmentStatus assignmentStatus;
    private BigDecimal expectedReturnRate;
    private BigDecimal riskWeight;
    private String contractTypeCode;
    private LocalDate maturityDate;
    private LocalDate lastIncomeDate;
    private Long tenantId;
}
