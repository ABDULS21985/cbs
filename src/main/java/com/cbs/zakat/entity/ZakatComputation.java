package com.cbs.zakat.entity;

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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "zakat_computation", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ZakatComputation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "computation_ref", nullable = false, unique = true, length = 80)
    private String computationRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "computation_type", nullable = false, length = 40)
    private ZakatDomainEnums.ComputationType computationType;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "zakat_year", nullable = false)
    private Integer zakatYear;

    @Column(name = "zakat_year_gregorian")
    private Integer zakatYearGregorian;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "period_from_hijri", length = 120)
    private String periodFromHijri;

    @Column(name = "period_to_hijri", length = 120)
    private String periodToHijri;

    @Column(name = "computation_date")
    private LocalDate computationDate;

    @Column(name = "methodology_code", nullable = false, length = 80)
    private String methodologyCode;

    @Column(name = "methodology_description", columnDefinition = "TEXT")
    private String methodologyDescription;

    @Column(name = "methodology_approval_id")
    private Long methodologyApprovalId;

    @Column(name = "methodology_approved_by_ssb", nullable = false)
    @Builder.Default
    private boolean methodologyApprovedBySsb = false;

    @Column(name = "zakatable_assets", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal zakatableAssets = BigDecimal.ZERO;

    @Column(name = "non_zakatable_assets", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal nonZakatableAssets = BigDecimal.ZERO;

    @Column(name = "total_assets", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal totalAssets = BigDecimal.ZERO;

    @Column(name = "deductible_liabilities", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal deductibleLiabilities = BigDecimal.ZERO;

    @Column(name = "zakat_base", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal zakatBase = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "asset_breakdown", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, BigDecimal> assetBreakdown = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "liability_breakdown", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, BigDecimal> liabilityBreakdown = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "excluded_asset_breakdown", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, BigDecimal> excludedAssetBreakdown = new LinkedHashMap<>();

    @Column(name = "zakat_rate", precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal zakatRate = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "zakat_rate_basis", length = 20)
    private ZakatDomainEnums.ZakatRateBasis zakatRateBasis;

    @Column(name = "zakat_amount", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal zakatAmount = BigDecimal.ZERO;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "adjustments", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> adjustments = new ArrayList<>();

    @Column(name = "total_adjustments", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal totalAdjustments = BigDecimal.ZERO;

    @Column(name = "adjusted_zakat_amount", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal adjustedZakatAmount = BigDecimal.ZERO;

    @Column(name = "zatca_return_id")
    private UUID zatcaReturnId;

    @Column(name = "zatca_assessment_ref", length = 120)
    private String zatcaAssessmentRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ZakatDomainEnums.ZakatStatus status;

    @Column(name = "calculated_by", length = 100)
    private String calculatedBy;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "ssb_reviewed_by", length = 100)
    private String ssbReviewedBy;

    @Column(name = "ssb_reviewed_at")
    private LocalDateTime ssbReviewedAt;

    @Column(name = "ssb_comments", columnDefinition = "TEXT")
    private String ssbComments;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}