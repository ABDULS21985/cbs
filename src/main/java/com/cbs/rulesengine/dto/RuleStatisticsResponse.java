package com.cbs.rulesengine.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleStatisticsResponse {
    private Long totalRules;
    private Long activeCount;
    private Long draftCount;
    private Long suspendedCount;
    private Long retiredCount;
    private Map<String, Long> byCategory;
    private List<BusinessRuleSummary> recentlyModified;
}
