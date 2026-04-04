package com.cbs.musharakah.dto;

import com.cbs.musharakah.entity.MusharakahDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class MusharakahRequests {

    private MusharakahRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateApplicationRequest {
        @NotNull
        private Long customerId;
        @NotBlank
        private String productCode;
        @NotNull
        private MusharakahDomainEnums.MusharakahType musharakahType;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal requestedFinancingAmount;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal customerEquityAmount;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal totalPropertyValue;
        @NotBlank
        private String currencyCode;
        @NotNull
        private Integer requestedTenorMonths;
        @NotBlank
        private String assetDescription;
        @NotNull
        private MusharakahDomainEnums.AssetCategory assetCategory;
        private String assetAddress;
        private BigDecimal estimatedAssetValue;
        private BigDecimal monthlyIncome;
        private BigDecimal existingObligations;
        private Long branchId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValuationRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal valuationAmount;
        private LocalDate valuationDate;
        private String valuationReference;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal bankContribution;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal customerContribution;
        @NotNull
        @DecimalMin("0.0001")
        private BigDecimal rentalRate;
        @NotNull
        private Integer tenorMonths;
        @NotNull
        private Integer totalUnits;
        @NotNull
        private BigDecimal profitSharingRatioBank;
        @NotNull
        private BigDecimal profitSharingRatioCustomer;
        private MusharakahDomainEnums.UnitPricingMethod unitPricingMethod;
        private MusharakahDomainEnums.RentalRateType rentalRateType;
        private String rentalBenchmark;
        private BigDecimal rentalMargin;
        private MusharakahDomainEnums.RentalReviewFrequency rentalReviewFrequency;
        private MusharakahDomainEnums.BuyoutFrequency buyoutFrequency;
        private BigDecimal unitsPerBuyoutDecimal;
        private Long investmentPoolId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JointOwnershipDetails {
        @NotBlank
        private String titleDeedRef;
        private String registrationAuthority;
        @NotNull
        private BigDecimal bankOwnershipPercentage;
        @NotNull
        private BigDecimal customerOwnershipPercentage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RentalReviewRequest {
        @NotNull
        private BigDecimal newRate;
        @NotNull
        private LocalDate effectiveDate;
        private String reason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferUnitsRequest {
        @NotNull
        @DecimalMin("0.0001")
        private BigDecimal unitCount;
        private LocalDate transferDate;
        private BigDecimal paymentAmount;
        private String paymentTransactionRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateFairValueRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal currentMarketValue;
        private String appraiser;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessRentalPaymentRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal paymentAmount;
        @NotNull
        private LocalDate paymentDate;
        private String narration;
        private String externalRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessBuyoutPaymentRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal paymentAmount;
        @NotNull
        private LocalDate paymentDate;
        private String externalRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CombinedPaymentRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal totalPayment;
        @NotNull
        private LocalDate paymentDate;
        private String externalRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordLossEventRequest {
        @NotNull
        private LocalDate lossDate;
        @NotNull
        private MusharakahDomainEnums.LossType lossType;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal totalLossAmount;
        @NotBlank
        private String currencyCode;
        private String description;
        private String cause;
        private String evidenceReference;
        private Boolean insured;
        private String insuranceClaimRef;
        private BigDecimal insuranceRecoveryExpected;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LossAssessmentRequest {
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal totalLossAmount;
        private String evidenceReference;
        private BigDecimal insuranceRecoveryExpected;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetTotalLossRequest {
        @NotNull
        private LocalDate lossDate;
        private BigDecimal insuranceRecoveryExpected;
        private String insuranceClaimRef;
        private String description;
        private String cause;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForcedSaleRequest {
        @NotNull
        private LocalDate saleDate;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal saleProceeds;
        @NotBlank
        private String currencyCode;
        private String description;
    }
}
