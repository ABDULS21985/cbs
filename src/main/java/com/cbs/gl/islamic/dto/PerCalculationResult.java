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
public class PerCalculationResult {
    private String adjustmentType;
    private BigDecimal adjustmentAmount;
    private BigDecimal grossProfit;
    private BigDecimal distributedProfit;
    private BigDecimal actualProfitRate;
    private BigDecimal smoothedProfitRate;
    private BigDecimal perBalanceBefore;
    private BigDecimal perBalanceAfter;
    private BigDecimal remainingCapacity;
    private Boolean maximumReached;
}
