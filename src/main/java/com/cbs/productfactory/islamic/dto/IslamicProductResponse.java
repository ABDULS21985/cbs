package com.cbs.productfactory.islamic.dto;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicProductResponse {

    private Long id;
    private Long baseProductId;
    private String productCode;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private Long contractTypeId;
    private String contractTypeCode;
    private String contractTypeName;
    private String contractTypeNameAr;
    private IslamicDomainEnums.IslamicProductCategory productCategory;
    private String subCategory;
    private IslamicDomainEnums.ProfitCalculationMethod profitCalculationMethod;
    private IslamicDomainEnums.ProfitRateType profitRateType;
    private BigDecimal baseRate;
    private String baseRateReference;
    private BigDecimal margin;
    private BigDecimal fixedProfitRate;
    private String profitRateDecisionTableCode;
    private IslamicDomainEnums.ProfitDistributionFrequency profitDistributionFrequency;
    private IslamicDomainEnums.ProfitDistributionMethod profitDistributionMethod;
    private BigDecimal bankSharePercentage;
    private BigDecimal customerSharePercentage;
    private BigDecimal profitSharingRatioBank;
    private BigDecimal profitSharingRatioCustomer;
    private IslamicDomainEnums.LossSharingMethod lossSharingMethod;
    private Boolean diminishingSchedule;
    private IslamicDomainEnums.DiminishingFrequency diminishingFrequency;
    private Integer diminishingUnitsTotal;
    private BigDecimal markupRate;
    private Boolean costPriceRequired;
    private Boolean sellingPriceImmutable;
    private Integer gracePeriodDays;
    private Boolean latePenaltyToCharity;
    private String charityGlAccountCode;
    private IslamicDomainEnums.AssetOwnershipDuringTenor assetOwnershipDuringTenor;
    private Boolean assetTransferOnCompletion;
    private IslamicDomainEnums.RentalReviewFrequency rentalReviewFrequency;
    private IslamicDomainEnums.MaintenanceResponsibility maintenanceResponsibility;
    private IslamicDomainEnums.InsuranceResponsibility insuranceResponsibility;
    private IslamicDomainEnums.TakafulModel takafulModel;
    private BigDecimal wakalahFeePercentage;
    private Boolean takafulPoolSeparation;
    private String aaoifiStandard;
    private String ifsbStandard;
    private String regulatoryProductCode;
    private BigDecimal riskWeightPercentage;
    private Long activeFatwaId;
    private String fatwaReference;
    private String fatwaStatus;
    private Boolean fatwaRequired;
    private IslamicDomainEnums.ShariahComplianceStatus shariahComplianceStatus;
    private LocalDate lastShariahReviewDate;
    private LocalDate nextShariahReviewDate;
    private String shariahRuleGroupCode;
    private IslamicDomainEnums.IslamicProductStatus status;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Integer productVersion;
    private Long currentVersionId;
    private String approvedBy;
    private Instant approvedAt;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private Integer minTenorMonths;
    private Integer maxTenorMonths;
    @Builder.Default
    private List<String> currencies = new ArrayList<>();
    @Builder.Default
    private List<String> eligibleCustomerTypes = new ArrayList<>();
    @Builder.Default
    private List<String> eligibleSegments = new ArrayList<>();
    @Builder.Default
    private List<String> eligibleCountries = new ArrayList<>();
    private String financingAssetGl;
    private String profitReceivableGl;
    private String profitIncomeGl;
    private String depositLiabilityGl;
    private String profitPayableGl;
    private String profitExpenseGl;
    private String charityGl;
    private String takafulPoolGl;
    private String suspenseGl;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private boolean active;
    private boolean hasActiveFatwa;
    private int activeContractCount;
    @Builder.Default
    private List<IslamicProductParameterView> parameters = new ArrayList<>();
    @Builder.Default
    private List<String> applicableShariahRules = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IslamicProductParameterView {
        private Long id;
        private String parameterName;
        private Object parameterValue;
        private IslamicDomainEnums.ParameterType parameterType;
        private String description;
        private String descriptionAr;
        private Boolean editable;
        private String validationRule;
    }
}