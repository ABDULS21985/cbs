package com.cbs.murabaha.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaProfitRecognitionReport {

    private LocalDate fromDate;
    private LocalDate toDate;
    private BigDecimal recognisedThisPeriod;
    private BigDecimal totalDeferredProfit;
    private BigDecimal totalRecognisedProfit;
    private BigDecimal totalIbraExpense;
    private BigDecimal totalImpairmentProvision;
    private Map<String, BigDecimal> byMurabahaType;
    private Map<String, BigDecimal> byRecognitionMethod;
}
