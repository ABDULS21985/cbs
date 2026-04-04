package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExecuteFullDistributionRunRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    @NotNull(message = "Period from is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to is required")
    private LocalDate periodTo;

    @NotBlank(message = "Period type is required")
    private String periodType;

    @Builder.Default
    private boolean autoApprove = false;

    private String calculationApprovedBy;
    private String allocationApprovedBy;
}
