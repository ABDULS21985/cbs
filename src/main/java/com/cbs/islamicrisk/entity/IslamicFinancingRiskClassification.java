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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_financing_risk_classifications", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicFinancingRiskClassification extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "contract_ref", nullable = false, length = 60)
    private String contractRef;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "classification_date", nullable = false)
    private LocalDate classificationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "ifrs9_stage", nullable = false, length = 20)
    private IslamicRiskDomainEnums.Stage ifrs9Stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "ifrs9_stage_previous", length = 20)
    private IslamicRiskDomainEnums.Stage ifrs9StagePrevious;

    @Column(name = "ifrs9_stage_changed_date")
    private LocalDate ifrs9StageChangedDate;

    @Column(name = "ifrs9_staging_reason", columnDefinition = "TEXT")
    private String ifrs9StagingReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "aaoifi_classification", nullable = false, length = 20)
    private IslamicRiskDomainEnums.AaoifiClassification aaoifiClassification;

    @Enumerated(EnumType.STRING)
    @Column(name = "aaoifi_classification_previous", length = 20)
    private IslamicRiskDomainEnums.AaoifiClassification aaoifiClassificationPrevious;

    @Column(name = "aaoifi_classification_reason", columnDefinition = "TEXT")
    private String aaoifiClassificationReason;

    @Column(name = "aaoifi_minimum_provision_rate", precision = 10, scale = 6)
    private BigDecimal aaoifiMinimumProvisionRate;

    @Column(name = "days_past_due")
    private Integer daysPastDue;

    @Column(name = "consecutive_missed_payments")
    private Integer consecutiveMissedPayments;

    @Column(name = "total_overdue_amount", precision = 18, scale = 2)
    private BigDecimal totalOverdueAmount;

    @Column(name = "outstanding_exposure", precision = 18, scale = 2)
    private BigDecimal outstandingExposure;

    @Column(name = "collateral_coverage_ratio", precision = 10, scale = 6)
    private BigDecimal collateralCoverageRatio;

    @Column(name = "pd_at_origination", precision = 10, scale = 6)
    private BigDecimal pdAtOrigination;

    @Column(name = "pd_current", precision = 10, scale = 6)
    private BigDecimal pdCurrent;

    @Column(name = "pd_change", precision = 10, scale = 6)
    private BigDecimal pdChange;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contract_specific_risk", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> contractSpecificRisk = new LinkedHashMap<>();

    @Column(name = "qualitative_override", nullable = false)
    @Builder.Default
    private Boolean qualitativeOverride = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "qualitative_factors", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> qualitativeFactors = new ArrayList<>();

    @Column(name = "overridden_by", length = 100)
    private String overriddenBy;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "on_watch_list", nullable = false)
    @Builder.Default
    private Boolean onWatchList = false;

    @Column(name = "watch_list_date")
    private LocalDate watchListDate;

    @Column(name = "watch_list_reason", columnDefinition = "TEXT")
    private String watchListReason;

    @Column(name = "watch_list_review_date")
    private LocalDate watchListReviewDate;

    @Column(name = "classified_by", length = 100)
    private String classifiedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
