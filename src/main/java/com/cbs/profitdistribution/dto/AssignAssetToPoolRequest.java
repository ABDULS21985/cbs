package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignAssetToPoolRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    @NotBlank(message = "Asset type is required")
    private String assetType;

    private Long assetReferenceId;

    private String assetReferenceCode;

    private String assetDescription;

    @NotNull(message = "Assigned amount is required")
    private BigDecimal assignedAmount;

    @NotNull(message = "Current outstanding is required")
    private BigDecimal currentOutstanding;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    private String contractTypeCode;

    private BigDecimal expectedReturnRate;

    private LocalDate maturityDate;
}
