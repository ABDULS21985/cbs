package com.cbs.productfactory.islamic.dto;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicProductRequest {

    private Long baseProductId;

    @Size(max = 30)
    private String productCode;

    @Size(max = 200)
    private String name;

    @Size(max = 200)
    private String nameAr;

    private String description;
    private String descriptionAr;
    private Long contractTypeId;
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
    private Long fatwaId;
    private Boolean fatwaRequired;
    private String shariahRuleGroupCode;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
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
    private String baseTemplateCategory;
    private String changeDescription;
}