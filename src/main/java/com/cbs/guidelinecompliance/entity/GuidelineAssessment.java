package com.cbs.guidelinecompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "guideline_assessment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuidelineAssessment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String assessmentCode;

    @Column(nullable = false, length = 300)
    private String guidelineName;

    @Column(nullable = false, length = 30)
    private String guidelineSource;

    @Column(length = 100)
    private String guidelineReference;

    @Column(nullable = false, length = 20)
    private String assessmentType;

    @Column(nullable = false)
    private LocalDate assessmentDate;

    @Column(length = 200)
    private String assessor;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalControls = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer compliantControls = 0;

    @Builder.Default
    private Integer partiallyCompliant = 0;

    @Builder.Default
    private Integer nonCompliant = 0;

    @Builder.Default
    private Integer notApplicable = 0;

    private BigDecimal complianceScorePct;

    @Column(length = 15)
    private String overallRating;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> findings;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> remediationPlan;

    private LocalDate nextAssessmentDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "IN_PROGRESS";
}
