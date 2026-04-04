package com.cbs.gl.islamic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IrrReleaseResult {
    private BigDecimal lossAmount;
    private BigDecimal absorbed;
    private BigDecimal remainingLoss;
    private BigDecimal irrBalanceBefore;
    private BigDecimal irrBalanceAfter;
    private Boolean triggered;
}
