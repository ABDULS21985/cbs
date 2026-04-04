package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "shariah_audit", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahAudit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_ref", nullable = false, unique = true, length = 50)
    private String auditRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_type", nullable = false, length = 20)
    private AuditType auditType;

    @Column(name = "audit_scope", columnDefinition = "TEXT")
    private String auditScope;

    @Column(name = "audit_scope_ar", columnDefinition = "TEXT")
    private String auditScopeAr;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "audit_plan_date")
    private LocalDate auditPlanDate;

    @Column(name = "audit_start_date")
    private LocalDate auditStartDate;

    @Column(name = "audit_end_date")
    private LocalDate auditEndDate;

    @Column(name = "report_date")
    private LocalDate reportDate;

    @Column(name = "lead_auditor", length = 100)
    private String leadAuditor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "audit_team_members", columnDefinition = "jsonb")
    private List<String> auditTeamMembers;

    @Column(name = "ssb_liaison", length = 100)
    private String ssbLiaison;

    @Column(name = "total_transactions_in_scope")
    private int totalTransactionsInScope;

    @Column(name = "sample_size")
    private int sampleSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "sampling_methodology", length = 20)
    private SamplingMethodology samplingMethodology;

    @Column(name = "sampling_confidence_level", precision = 8, scale = 4)
    private BigDecimal samplingConfidenceLevel;

    @Column(name = "sampling_error_margin", precision = 8, scale = 4)
    private BigDecimal samplingErrorMargin;

    @Column(name = "total_findings_count")
    private int totalFindingsCount;

    @Column(name = "critical_findings")
    private int criticalFindings;

    @Column(name = "high_findings")
    private int highFindings;

    @Column(name = "medium_findings")
    private int mediumFindings;

    @Column(name = "low_findings")
    private int lowFindings;

    @Column(name = "compliance_score", precision = 8, scale = 4)
    private BigDecimal complianceScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_opinion", length = 30)
    private AuditOverallOpinion overallOpinion;

    @Column(name = "opinion_narrative", columnDefinition = "TEXT")
    private String opinionNarrative;

    @Column(name = "opinion_narrative_ar", columnDefinition = "TEXT")
    private String opinionNarrativeAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ShariahAuditStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
