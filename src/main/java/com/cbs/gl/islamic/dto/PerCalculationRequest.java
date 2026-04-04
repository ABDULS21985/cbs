package com.cbs.gl.islamic.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerCalculationRequest {
    @NotNull
    private Long poolId;
    @NotNull
    private BigDecimal grossProfit;
    @NotNull
    private LocalDate periodFrom;
    @NotNull
    private LocalDate periodTo;
}
