package com.cbs.murabaha.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaPortfolioSummary {

    private long totalContracts;
    private BigDecimal totalOutstanding;
    private BigDecimal totalDeferredProfit;
    private BigDecimal totalRecognisedProfit;
    private BigDecimal totalImpairmentProvision;
    private BigDecimal averageMarkupRate;
    private BigDecimal nplRatio;
    private Map<String, Long> byType;
    private Map<String, Long> byStatus;
}
