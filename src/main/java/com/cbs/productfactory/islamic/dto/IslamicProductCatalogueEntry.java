package com.cbs.productfactory.islamic.dto;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
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
public class IslamicProductCatalogueEntry {

    private Long productId;
    private String productCode;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private IslamicDomainEnums.IslamicProductCategory category;
    private String subCategory;
    private String contractTypeCode;
    private String contractTypeName;
    private String contractTypeNameAr;
    private IslamicDomainEnums.ContractCategory contractCategory;
    private String shariahBasis;
    private IslamicDomainEnums.ProfitCalculationMethod profitCalculationMethod;
    private String profitRateDisplay;
    private BigDecimal indicativeRate;
    private String profitDistributionFrequency;
    private String tenorRange;
    private String amountRange;
    @Builder.Default
    private List<String> currencies = new ArrayList<>();
    private IslamicDomainEnums.ShariahComplianceStatus complianceStatus;
    private boolean hasActiveFatwa;
    private String fatwaReference;
    private LocalDate fatwaIssueDate;
    private LocalDate fatwaExpiryDate;
    private String issuingAuthority;
    private LocalDate lastShariahReview;
    private LocalDate nextShariahReview;
    private String aaoifiStandard;
    @Builder.Default
    private List<String> keyShariahPrinciples = new ArrayList<>();
    private IslamicDomainEnums.IslamicProductStatus status;
    private boolean availableForNewContracts;
    private LocalDate availableFrom;
    private LocalDate availableTo;
    @Builder.Default
    private List<String> eligibleCustomerTypes = new ArrayList<>();
    @Builder.Default
    private List<String> eligibleSegments = new ArrayList<>();
    @Builder.Default
    private List<String> eligibleCountries = new ArrayList<>();
}