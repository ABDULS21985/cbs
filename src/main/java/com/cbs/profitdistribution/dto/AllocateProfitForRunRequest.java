package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AllocateProfitForRunRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    @NotNull(message = "Profit calculation ID is required")
    private Long profitCalculationId;
}
