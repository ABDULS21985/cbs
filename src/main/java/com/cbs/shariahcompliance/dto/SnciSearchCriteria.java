package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SnciSearchCriteria {
    private String quarantineStatus;
    private String nonComplianceType;
    private String detectionMethod;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private String sourceContractRef;
    private String sourceTransactionRef;
    private String incomeType;
}
