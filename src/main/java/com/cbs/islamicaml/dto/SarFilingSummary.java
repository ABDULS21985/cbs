package com.cbs.islamicaml.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SarFilingSummary {
    private long totalFiled;
    private Map<String, Long> byJurisdiction;
    private Map<String, Long> byTypology;
    private BigDecimal averageFilingDays;
    private long deadlineBreaches;
    private long pendingMlroApproval;
}
