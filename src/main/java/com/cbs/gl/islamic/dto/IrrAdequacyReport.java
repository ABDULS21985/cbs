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
public class IrrAdequacyReport {
    private String poolCode;
    private BigDecimal irrBalance;
    private BigDecimal expectedCreditLoss;
    private BigDecimal coverageRatio;
}
