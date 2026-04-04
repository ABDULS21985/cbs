package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.AuditOverallOpinion;
import com.cbs.shariahcompliance.entity.AuditType;
import com.cbs.shariahcompliance.entity.SamplingMethodology;
import com.cbs.shariahcompliance.entity.ShariahAuditStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShariahAuditResponse {
    private Long id;
    private String auditRef;
    private AuditType auditType;
    private String auditScope;
    private String auditScopeAr;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private LocalDate auditPlanDate;
    private LocalDate auditStartDate;
    private LocalDate auditEndDate;
    private LocalDate reportDate;
    private String leadAuditor;
    private List<String> auditTeamMembers;
    private String ssbLiaison;
    private int totalTransactionsInScope;
    private int sampleSize;
    private SamplingMethodology samplingMethodology;
    private BigDecimal samplingConfidenceLevel;
    private BigDecimal samplingErrorMargin;
    private int totalFindingsCount;
    private int criticalFindings;
    private int highFindings;
    private int mediumFindings;
    private int lowFindings;
    private BigDecimal complianceScore;
    private AuditOverallOpinion overallOpinion;
    private String opinionNarrative;
    private String opinionNarrativeAr;
    private ShariahAuditStatus status;
    private String notes;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
