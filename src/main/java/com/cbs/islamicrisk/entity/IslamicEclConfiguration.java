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
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "islamic_ecl_configurations", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicEclConfiguration extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_code", nullable = false, unique = true, length = 40)
    private String configCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "product_category", length = 80)
    private String productCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "pd_model", nullable = false, length = 30)
    private IslamicRiskDomainEnums.PdModel pdModel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pd_calibration_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> pdCalibrationData = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pd_term_structure", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> pdTermStructure = new LinkedHashMap<>();

    @Column(name = "pd_forward_looking_adjustment", precision = 10, scale = 6)
    private BigDecimal pdForwardLookingAdjustment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pd_scenario_weights", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> pdScenarioWeights = new LinkedHashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "lgd_model", nullable = false, length = 30)
    private IslamicRiskDomainEnums.LgdModel lgdModel;

    @Column(name = "base_lgd", precision = 10, scale = 6)
    private BigDecimal baseLgd;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "murabaha_lgd_factors", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> murabahaLgdFactors = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ijarah_lgd_factors", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> ijarahLgdFactors = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "musharakah_lgd_factors", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> musharakahLgdFactors = new LinkedHashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "ead_calculation_method", nullable = false, length = 30)
    private IslamicRiskDomainEnums.EadCalculationMethod eadCalculationMethod;

    @Column(name = "exclude_deferred_profit", nullable = false)
    @Builder.Default
    private Boolean excludeDeferredProfit = false;

    @Column(name = "include_asset_ownership", nullable = false)
    @Builder.Default
    private Boolean includeAssetOwnership = false;

    @Column(name = "use_current_share_not_original", nullable = false)
    @Builder.Default
    private Boolean useCurrentShareNotOriginal = false;

    @Column(name = "include_per", nullable = false)
    @Builder.Default
    private Boolean includePer = false;

    @Column(name = "include_irr", nullable = false)
    @Builder.Default
    private Boolean includeIrr = false;

    @Column(name = "stage1_dpd_threshold")
    private Integer stage1DpdThreshold;

    @Column(name = "stage2_dpd_threshold")
    private Integer stage2DpdThreshold;

    @Column(name = "stage3_dpd_threshold")
    private Integer stage3DpdThreshold;

    @Column(name = "significant_increase_pd_threshold", precision = 10, scale = 6)
    private BigDecimal significantIncreasePdThreshold;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IslamicRiskDomainEnums.EclConfigStatus status;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
