package com.cbs.islamicrisk.dto;

import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.lending.entity.CollateralType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class IslamicRiskRequests {

    private IslamicRiskRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreditAssessmentRequest {
        @NotNull
        private Long customerId;
        private Long applicationId;
        private String applicationRef;
        @NotBlank
        private String contractTypeCode;
        @NotBlank
        private String productCode;
        private String productCategory;
        @Builder.Default
        private Map<String, Object> inputData = new java.util.LinkedHashMap<>();
        private BigDecimal requestedAmount;
        private Integer requestedTenorMonths;
        private String assessedBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreOverrideRequest {
        @NotNull
        private Integer overriddenScore;
        private String overriddenBand;
        @NotBlank
        private String overrideReason;
        @NotBlank
        private String overrideApprovedBy;
        @NotBlank
        private String overriddenBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreModelRequest {
        @NotBlank
        private String modelCode;
        @NotBlank
        private String name;
        private String description;
        @NotBlank
        private String contractTypeCode;
        private String productCategory;
        @NotNull
        private Integer modelVersion;
        @Builder.Default
        private List<Map<String, Object>> scoreComponents = List.of();
        @NotNull
        private Integer maximumScore;
        @Builder.Default
        private List<Map<String, Object>> scoreBands = List.of();
        private LocalDate lastCalibrationDate;
        private LocalDate nextCalibrationDate;
        private String calibrationDataPeriod;
        private BigDecimal backtestingAccuracy;
        @Builder.Default
        private IslamicRiskDomainEnums.ModelStatus status = IslamicRiskDomainEnums.ModelStatus.ACTIVE;
        private String approvedBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacktestRequest {
        @NotNull
        private LocalDate from;
        @NotNull
        private LocalDate to;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EclConfigRequest {
        @NotBlank
        private String configCode;
        @NotBlank
        private String name;
        @NotBlank
        private String contractTypeCode;
        private String productCategory;
        @NotNull
        private IslamicRiskDomainEnums.PdModel pdModel;
        @Builder.Default
        private Map<String, Object> pdCalibrationData = new java.util.LinkedHashMap<>();
        @Builder.Default
        private Map<String, Object> pdTermStructure = new java.util.LinkedHashMap<>();
        private BigDecimal pdForwardLookingAdjustment;
        @Builder.Default
        private Map<String, Object> pdScenarioWeights = new java.util.LinkedHashMap<>();
        @NotNull
        private IslamicRiskDomainEnums.LgdModel lgdModel;
        private BigDecimal baseLgd;
        @Builder.Default
        private Map<String, Object> murabahaLgdFactors = new java.util.LinkedHashMap<>();
        @Builder.Default
        private Map<String, Object> ijarahLgdFactors = new java.util.LinkedHashMap<>();
        @Builder.Default
        private Map<String, Object> musharakahLgdFactors = new java.util.LinkedHashMap<>();
        @NotNull
        private IslamicRiskDomainEnums.EadCalculationMethod eadCalculationMethod;
        @Builder.Default
        private Boolean excludeDeferredProfit = Boolean.FALSE;
        @Builder.Default
        private Boolean includeAssetOwnership = Boolean.FALSE;
        @Builder.Default
        private Boolean useCurrentShareNotOriginal = Boolean.FALSE;
        @Builder.Default
        private Boolean includePer = Boolean.FALSE;
        @Builder.Default
        private Boolean includeIrr = Boolean.FALSE;
        private Integer stage1DpdThreshold;
        private Integer stage2DpdThreshold;
        private Integer stage3DpdThreshold;
        private BigDecimal significantIncreasePdThreshold;
        private LocalDate effectiveFrom;
        @Builder.Default
        private IslamicRiskDomainEnums.EclConfigStatus status = IslamicRiskDomainEnums.EclConfigStatus.ACTIVE;
        private String approvedBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterIslamicCollateralRequest {
        @NotNull
        private Long customerId;
        private Long contractId;
        private String contractTypeCode;
        @NotNull
        private CollateralType collateralType;
        @NotBlank
        private String description;
        @NotNull
        private BigDecimal marketValue;
        private BigDecimal forcedSaleValue;
        @NotBlank
        private String currencyCode;
        private String valuationSource;
        private String location;
        private String registrationNumber;
        private String registrationAuthority;
        private Boolean insured;
        private String insurancePolicyNumber;
        private LocalDate insuranceExpiryDate;
        private BigDecimal insuranceValue;
        @NotNull
        private IslamicRiskDomainEnums.IslamicCollateralType islamicCollateralType;
        private String issuerName;
        private Boolean underlyingAssetScreened;
        private IslamicRiskDomainEnums.UnderlyingScreeningResult underlyingScreeningResult;
        private LocalDate underlyingScreeningDate;
        private BigDecimal haircutPercentage;
        private Boolean takafulRequired;
        private String takafulPolicyRef;
        private String takafulProvider;
        private BigDecimal takafulCoverageAmount;
        private LocalDate takafulExpiryDate;
        private String lienRegisteredWith;
        private String lienRegistrationRef;
        private IslamicRiskDomainEnums.LienPriority lienPriority;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValuationRequest {
        @NotNull
        private LocalDate valuationDate;
        @NotNull
        private BigDecimal valuationAmount;
        private BigDecimal forcedSaleValue;
        @NotNull
        private IslamicRiskDomainEnums.IslamicCollateralValuationMethod valuationMethod;
        private String appraiserName;
        private Boolean shariahCompliantAppraiser;
        private BigDecimal haircutPercentage;
        private LocalDate nextValuationDueDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassifyContractRequest {
        @NotBlank
        private String contractTypeCode;
        @Builder.Default
        private List<String> qualitativeFactors = List.of();
        private Boolean qualitativeOverride;
        private String overriddenBy;
        private String overrideReason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WatchListRequest {
        @NotNull
        private Long contractId;
        @NotBlank
        private String contractTypeCode;
        @NotBlank
        private String reason;
        @NotBlank
        private String actionBy;
    }
}
