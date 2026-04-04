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
public class IrrRetentionResult {
    private BigDecimal adjustmentAmount;
    private BigDecimal distributableProfitBeforeRetention;
    private BigDecimal distributableProfitAfterRetention;
    private BigDecimal irrBalanceBefore;
    private BigDecimal irrBalanceAfter;
    private BigDecimal remainingCapacity;
    private Boolean maximumReached;
}
