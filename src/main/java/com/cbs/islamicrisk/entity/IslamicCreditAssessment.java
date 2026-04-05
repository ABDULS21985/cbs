package com.cbs.islamicrisk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_credit_assessments", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCreditAssessment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long versionLock;

    @Column(name = "assessment_ref", nullable = false, unique = true, length = 50)
    private String assessmentRef;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "application_ref", length = 60)
    private String applicationRef;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "model_code", nullable = false, length = 40)
    private String modelCode;

    @Column(name = "assessment_date", nullable = false)
    private LocalDate assessmentDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> inputData = new java.util.LinkedHashMap<>();

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    @Column(name = "score_band", nullable = false, length = 10)
    private String scoreBand;

    @Column(name = "score_band_label", length = 100)
    private String scoreBandLabel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "component_scores", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> componentScores = new ArrayList<>();

    @Column(name = "estimated_pd", precision = 10, scale = 6)
    private BigDecimal estimatedPd;

    @Column(name = "risk_rating", length = 30)
    private String riskRating;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_recommendation", length = 30)
    private IslamicRiskDomainEnums.ApprovalRecommendation approvalRecommendation;

    @Column(name = "max_approved_amount", precision = 18, scale = 2)
    private BigDecimal maxApprovedAmount;

    @Column(name = "max_approved_tenor")
    private Integer maxApprovedTenor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> conditions = new ArrayList<>();

    @Column(name = "assessed_by", length = 100)
    private String assessedBy;

    @Column(name = "overridden_by", length = 100)
    private String overriddenBy;

    @Column(name = "overridden_score")
    private Integer overriddenScore;

    @Column(name = "overridden_band", length = 10)
    private String overriddenBand;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "override_approved_by", length = 100)
    private String overrideApprovedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IslamicRiskDomainEnums.AssessmentStatus status;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "tenant_id")
    private Long tenantId;
}
