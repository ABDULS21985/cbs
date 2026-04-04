package com.cbs.islamicaml.dto;

import lombok.*;

import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicAmlAlertStatistics {
    private long totalAlerts;
    private long newCount;
    private long underInvestigation;
    private long escalated;
    private long sarFiled;
    private long closedNoAction;
    private long closedFalsePositive;
    private long overdueCount;
    private Map<String, Long> byTypology;
}
