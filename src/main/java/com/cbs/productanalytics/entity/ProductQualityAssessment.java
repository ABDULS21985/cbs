package com.cbs.productanalytics.entity;

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
@Table(name = "product_quality_assessment", uniqueConstraints = @UniqueConstraint(columnNames = {"product_code", "assessment_period", "period_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProductQualityAssessment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String assessmentCode;

    @Column(nullable = false, length = 30)
    private String productCode;

    @Column(length = 200)
    private String productName;

    @Column(nullable = false, length = 10)
    private String assessmentPeriod;

    @Column(nullable = false)
    private LocalDate periodDate;

    private BigDecimal customerSatisfactionScore;

    @Builder.Default
    private Integer complaintCount = 0;

    @Column(name = "complaints_per_1000_accounts")
    private BigDecimal complaintsPer1000Accounts;

    private BigDecimal defectRate;

    @Builder.Default
    private Integer processingErrorCount = 0;

    @Builder.Default
    private Integer slaBreachCount = 0;

    private BigDecimal slaMeetPct;
    private BigDecimal avgOnboardingTimeDays;
    private BigDecimal avgClaimSettlementDays;

    @Builder.Default
    private Integer regulatoryFindingsCount = 0;

    @Builder.Default
    private Integer auditFindingsCount = 0;

    @Builder.Default
    private Integer pendingRemediations = 0;

    private BigDecimal complianceScorePct;
    private BigDecimal marketSharePct;
    private Integer competitorBenchmarkPosition;

    @Column(length = 15)
    private String pricingCompetitiveness;

    private BigDecimal channelAvailabilityPct;
    private BigDecimal straightThroughProcessingPct;
    private BigDecimal manualInterventionRate;

    @Column(nullable = false, length = 20)
    private String overallQualityRating;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> actionItems;

    @Column(length = 200)
    private String assessedBy;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
