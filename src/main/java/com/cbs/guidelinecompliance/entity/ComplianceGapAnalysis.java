package com.cbs.guidelinecompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "compliance_gap_analysis", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ComplianceGapAnalysis extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "analysis_code", nullable = false, unique = true, length = 30)
    private String analysisCode;

    @Column(name = "assessment_id")
    private Long assessmentId;

    @Column(name = "requirement_ref", length = 80)
    private String requirementRef;

    @Column(name = "requirement_description", columnDefinition = "TEXT")
    private String requirementDescription;

    @Column(name = "regulatory_source", length = 60)
    private String regulatorySource;

    @Column(name = "clause_reference", length = 80)
    private String clauseReference;

    @Column(name = "current_state", columnDefinition = "TEXT")
    private String currentState;

    @Column(name = "target_state", columnDefinition = "TEXT")
    private String targetState;

    @Column(name = "gap_description", columnDefinition = "TEXT")
    private String gapDescription;

    @Column(name = "gap_severity", length = 12)
    private String gapSeverity;

    @Column(name = "gap_category", length = 15)
    private String gapCategory;

    @Column(name = "risk_if_unaddressed", length = 10)
    private String riskIfUnaddressed;

    @Column(name = "remediation_owner", length = 200)
    private String remediationOwner;

    @Column(name = "remediation_description", columnDefinition = "TEXT")
    private String remediationDescription;

    @Column(name = "remediation_cost", precision = 15, scale = 4)
    private BigDecimal remediationCost;

    @Column(name = "remediation_start_date")
    private LocalDate remediationStartDate;

    @Column(name = "remediation_target_date")
    private LocalDate remediationTargetDate;

    @Column(name = "remediation_actual_date")
    private LocalDate remediationActualDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "remediation_milestones")
    private Map<String, Object> remediationMilestones;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence_refs")
    private Map<String, Object> evidenceRefs;

    @Column(name = "verified_by", length = 80)
    private String verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "IDENTIFIED";
}
