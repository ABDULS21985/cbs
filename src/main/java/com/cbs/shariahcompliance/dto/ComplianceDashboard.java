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
}
