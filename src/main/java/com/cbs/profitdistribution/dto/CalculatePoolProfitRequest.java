package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CalculatePoolProfitRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    @NotNull(message = "Period from is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to is required")
    private LocalDate periodTo;

    private String periodType;
}
