package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertStatistics {
    private long totalAlerts;
    private long newCount;
    private long underReviewCount;
    private long resolvedCount;
    private long escalatedCount;
    private long slaBreach;
    private Map<String, Long> byType;
    private Map<String, Long> bySeverity;
}
