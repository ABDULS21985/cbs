package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceDashboard {
    private BigDecimal overallComplianceScore;
    private long totalScreenings;
    private BigDecimal screeningPassRate;
    private long totalAlerts;
    private long openAlerts;
    private BigDecimal totalSnci;
    private BigDecimal unpurifiedSnci;
    private String latestAuditOpinion;
    private long openFindings;
    private long overdueRemediations;
    private BigDecimal screeningControlScore;
    private BigDecimal alertResolutionScore;
    private BigDecimal snciResolutionScore;
    private BigDecimal remediationScore;
    private BigDecimal evidenceCoverageRate;
    private long overdueAlerts;
    private String slaPosture;
    private Map<String, Long> alertsBySeverity;
    private Map<String, Long> alertsByType;
    private Map<String, Long> findingsBySeverity;
    private Map<String, Long> findingsByStatus;
    private Map<String, BigDecimal> snciByStatus;
    private List<String> priorityActions;
}
