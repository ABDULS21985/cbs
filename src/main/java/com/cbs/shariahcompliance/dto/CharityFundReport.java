package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CharityFundReport {
    private BigDecimal totalInFund;
    private BigDecimal totalFromLatePenalties;
    private BigDecimal totalFromSnci;
    private BigDecimal totalDisbursed;
    private BigDecimal currentBalance;
}
