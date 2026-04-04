package com.cbs.productfactory.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "islamic_product_templates", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicProductTemplate extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_product_id", nullable = false)
    private Long baseProductId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", nullable = false, length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_type_id", nullable = false)
    private IslamicContractType contractType;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_category", nullable = false, length = 20)
    private IslamicDomainEnums.IslamicProductCategory productCategory;

    @Column(name = "sub_category", length = 80)
    private String subCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_calculation_method", nullable = false, length = 40)
    private IslamicDomainEnums.ProfitCalculationMethod profitCalculationMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_rate_type", length = 20)
    private IslamicDomainEnums.ProfitRateType profitRateType;

    @Column(name = "base_rate", precision = 19, scale = 6)
    private BigDecimal baseRate;

    @Column(name = "base_rate_reference", length = 60)
    private String baseRateReference;

    @Column(name = "margin", precision = 19, scale = 6)
    private BigDecimal margin;

    @Column(name = "fixed_profit_rate", precision = 19, scale = 6)
    private BigDecimal fixedProfitRate;

    @Column(name = "profit_rate_decision_table_code", length = 100)
    private String profitRateDecisionTableCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_distribution_frequency", length = 20)
    private IslamicDomainEnums.ProfitDistributionFrequency profitDistributionFrequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_distribution_method", length = 30)
    private IslamicDomainEnums.ProfitDistributionMethod profitDistributionMethod;

    @Column(name = "bank_share_percentage", precision = 10, scale = 4)
    private BigDecimal bankSharePercentage;

    @Column(name = "customer_share_percentage", precision = 10, scale = 4)
    private BigDecimal customerSharePercentage;

    @Column(name = "profit_sharing_ratio_bank", precision = 10, scale = 4)
    private BigDecimal profitSharingRatioBank;

    @Column(name = "profit_sharing_ratio_customer", precision = 10, scale = 4)
    private BigDecimal profitSharingRatioCustomer;

    @Enumerated(EnumType.STRING)
    @Column(name = "loss_sharing_method", length = 30)
    private IslamicDomainEnums.LossSharingMethod lossSharingMethod;

    @Column(name = "diminishing_schedule", nullable = false)
    @Builder.Default
    private Boolean diminishingSchedule = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "diminishing_frequency", length = 20)
    private IslamicDomainEnums.DiminishingFrequency diminishingFrequency;

    @Column(name = "diminishing_units_total")
    private Integer diminishingUnitsTotal;

    @Column(name = "markup_rate", precision = 19, scale = 6)
    private BigDecimal markupRate;

    @Column(name = "cost_price_required", nullable = false)
    @Builder.Default
    private Boolean costPriceRequired = false;

    @Column(name = "selling_price_immutable", nullable = false)
    @Builder.Default
    private Boolean sellingPriceImmutable = false;

    @Column(name = "grace_period_days")
    private Integer gracePeriodDays;

    @Column(name = "late_penalty_to_charity", nullable = false)
    @Builder.Default
    private Boolean latePenaltyToCharity = false;

    @Column(name = "charity_gl_account_code", length = 40)
    private String charityGlAccountCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_ownership_during_tenor", length = 20)
    private IslamicDomainEnums.AssetOwnershipDuringTenor assetOwnershipDuringTenor;

    @Column(name = "asset_transfer_on_completion")
    private Boolean assetTransferOnCompletion;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_review_frequency", length = 20)
    private IslamicDomainEnums.RentalReviewFrequency rentalReviewFrequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_responsibility", length = 20)
    private IslamicDomainEnums.MaintenanceResponsibility maintenanceResponsibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "insurance_responsibility", length = 20)
    private IslamicDomainEnums.InsuranceResponsibility insuranceResponsibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "takaful_model", length = 20)
    private IslamicDomainEnums.TakafulModel takafulModel;

    @Column(name = "wakalah_fee_percentage", precision = 10, scale = 4)
    private BigDecimal wakalahFeePercentage;

    @Column(name = "takaful_pool_separation")
    private Boolean takafulPoolSeparation;

    @Column(name = "aaoifi_standard", length = 40)
    private String aaoifiStandard;

    @Column(name = "ifsb_standard", length = 40)
    private String ifsbStandard;

    @Column(name = "regulatory_product_code", length = 60)
    private String regulatoryProductCode;

    @Column(name = "risk_weight_percentage", precision = 10, scale = 4)
    private BigDecimal riskWeightPercentage;

    @Column(name = "active_fatwa_id")
    private Long activeFatwaId;

    @Column(name = "fatwa_required", nullable = false)
    @Builder.Default
    private Boolean fatwaRequired = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "shariah_compliance_status", nullable = false, length = 20)
    @Builder.Default
    private IslamicDomainEnums.ShariahComplianceStatus shariahComplianceStatus = IslamicDomainEnums.ShariahComplianceStatus.DRAFT;

    @Column(name = "last_shariah_review_date")
    private LocalDate lastShariahReviewDate;

    @Column(name = "next_shariah_review_date")
    private LocalDate nextShariahReviewDate;

    @Column(name = "shariah_rule_group_code", length = 120)
    private String shariahRuleGroupCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private IslamicDomainEnums.IslamicProductStatus status = IslamicDomainEnums.IslamicProductStatus.DRAFT;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "product_version", nullable = false)
    @Builder.Default
    private Integer productVersion = 1;

    @Column(name = "current_version_id")
    private Long currentVersionId;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "min_amount", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal minAmount = BigDecimal.ZERO;

    @Column(name = "max_amount", precision = 19, scale = 4)
    private BigDecimal maxAmount;

    @Column(name = "min_tenor_months", nullable = false)
    @Builder.Default
    private Integer minTenorMonths = 0;

    @Column(name = "max_tenor_months", nullable = false)
    @Builder.Default
    private Integer maxTenorMonths = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "currencies", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> currencies = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligible_customer_types", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> eligibleCustomerTypes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligible_segments", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> eligibleSegments = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "eligible_countries", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> eligibleCountries = new ArrayList<>();

    @Column(name = "financing_asset_gl", length = 40)
    private String financingAssetGl;

    @Column(name = "profit_receivable_gl", length = 40)
    private String profitReceivableGl;

    @Column(name = "profit_income_gl", length = 40)
    private String profitIncomeGl;

    @Column(name = "deposit_liability_gl", length = 40)
    private String depositLiabilityGl;

    @Column(name = "profit_payable_gl", length = 40)
    private String profitPayableGl;

    @Column(name = "profit_expense_gl", length = 40)
    private String profitExpenseGl;

    @Column(name = "charity_gl", length = 40)
    private String charityGl;

    @Column(name = "takaful_pool_gl", length = 40)
    private String takafulPoolGl;

    @Column(name = "suspense_gl", length = 40)
    private String suspenseGl;

    @Column(name = "tenant_id")
    private Long tenantId;
}