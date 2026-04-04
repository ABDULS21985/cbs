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
public class ReserveOperationRequest {
    @NotNull
    private Long poolId;
    @NotNull
    private BigDecimal amount;
    private BigDecimal grossProfit;
    private BigDecimal actualRate;
    private BigDecimal smoothedRate;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String approvedBy;
    private String triggerEvent;
}
