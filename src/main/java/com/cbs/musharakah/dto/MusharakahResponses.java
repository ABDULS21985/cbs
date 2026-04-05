package com.cbs.musharakah.dto;

import com.cbs.musharakah.entity.MusharakahDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class MusharakahResponses {

    private MusharakahResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahApplicationResponse {
        private Long id;
        private String applicationRef;
        private Long customerId;
        private String productCode;
        private MusharakahDomainEnums.MusharakahType musharakahType;
        private BigDecimal requestedFinancingAmount;
        private BigDecimal customerEquityAmount;
        private BigDecimal totalPropertyValue;
        private String currencyCode;
        private Integer requestedTenorMonths;
        private String assetDescription;
        private MusharakahDomainEnums.AssetCategory assetCategory;
        private BigDecimal estimatedAssetValue;
        private BigDecimal estimatedMonthlyPayment;
        private BigDecimal dsr;
        private BigDecimal proposedBankContribution;
        private BigDecimal proposedCustomerContribution;
        private BigDecimal proposedBankPercentage;
        private BigDecimal proposedCustomerPercentage;
        private BigDecimal proposedRentalRate;
        private Integer proposedUnitsTotal;
        private BigDecimal proposedProfitSharingBank;
        private BigDecimal proposedProfitSharingCustomer;
        private MusharakahDomainEnums.ApplicationStatus status;
        private String approvedBy;
        private Instant approvedAt;
        private Long contractId;
        private List<String> warnings;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahContractResponse {
        private Long id;
        private String contractRef;
        private Long applicationId;
        private Long customerId;
        private Long accountId;
        private String productCode;
        private String contractTypeCode;
        private MusharakahDomainEnums.MusharakahType musharakahType;
        private String assetDescription;
        private MusharakahDomainEnums.AssetCategory assetCategory;
        private String assetAddress;
        private String assetTitleDeedRef;
        private BigDecimal assetPurchasePrice;
        private BigDecimal assetCurrentMarketValue;
        private String currencyCode;
        private BigDecimal bankCapitalContribution;
        private BigDecimal customerCapitalContribution;
        private BigDecimal totalCapital;
        private Integer totalOwnershipUnits;
        private BigDecimal bankCurrentUnits;
        private BigDecimal customerCurrentUnits;
        private BigDecimal bankOwnershipPercentage;
        private BigDecimal customerOwnershipPercentage;
        private BigDecimal unitValue;
        private MusharakahDomainEnums.UnitPricingMethod unitPricingMethod;
        private BigDecimal profitSharingRatioBank;
        private BigDecimal profitSharingRatioCustomer;
        private MusharakahDomainEnums.LossSharingMethod lossSharingMethod;
        private MusharakahDomainEnums.RentalFrequency rentalFrequency;
        private BigDecimal baseRentalRate;
        private MusharakahDomainEnums.BuyoutFrequency buyoutFrequency;
        private BigDecimal unitsPerBuyoutDecimal;
        private BigDecimal totalRentalExpected;
        private BigDecimal totalRentalReceived;
        private BigDecimal totalBuyoutPaymentsExpected;
        private BigDecimal totalBuyoutPaymentsReceived;
        private BigDecimal estimatedMonthlyPayment;
        private MusharakahDomainEnums.ContractStatus status;
        private Instant executedAt;
        private String executedBy;
        private LocalDate fullyBoughtOutAt;
        private LocalDate dissolvedAt;
        private Integer tenorMonths;
        private LocalDate startDate;
        private LocalDate maturityDate;
        private LocalDate firstPaymentDate;
        private Integer gracePeriodDays;
        private Boolean latePenaltyToCharity;
        private MusharakahDomainEnums.RentalRateType rentalRateType;
        private String rentalBenchmark;
        private BigDecimal rentalMargin;
        private MusharakahDomainEnums.RentalReviewFrequency rentalReviewFrequency;
        private LocalDate nextRentalReviewDate;
        private Boolean earlyBuyoutAllowed;
        private MusharakahDomainEnums.EarlyBuyoutPricingMethod earlyBuyoutPricingMethod;
        private LocalDate earlyBuyoutDate;
        private BigDecimal earlyBuyoutAmount;
        private Long islamicProductTemplateId;
        private Long investmentPoolId;
        private Long poolAssetAssignmentId;
        private String lastScreeningRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OwnershipState {
        private Long contractId;
        private Integer totalUnits;
        private BigDecimal bankUnits;
        private BigDecimal customerUnits;
        private BigDecimal bankPercentage;
        private BigDecimal customerPercentage;
        private BigDecimal currentUnitValue;
        private BigDecimal bankShareValue;
        private BigDecimal customerShareValue;
        private Boolean fullyBoughtOut;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EarlyBuyoutQuote {
        private Long contractId;
        private LocalDate quoteDate;
        private BigDecimal remainingBankUnits;
        private BigDecimal pricePerUnit;
        private BigDecimal buyoutAmount;
        private BigDecimal rentalArrears;
        private BigDecimal totalAmount;
        private String pricingMethod;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahPortfolioSummary {
        private int totalContracts;
        private BigDecimal totalBankCapital;
        private BigDecimal totalRentalExpected;
        private BigDecimal totalRentalReceived;
        private BigDecimal totalBuyoutExpected;
        private BigDecimal totalBuyoutReceived;
        private Map<String, Long> byType;
        private Map<String, Long> byStatus;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OwnershipTimelinePoint {
        private Integer transferNumber;
        private LocalDate transferDate;
        private BigDecimal bankPercentage;
        private BigDecimal customerPercentage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OwnershipTimeline {
        private Long contractId;
        private List<OwnershipTimelinePoint> points;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahRentalSummary {
        private Long contractId;
        private BigDecimal totalExpected;
        private BigDecimal totalReceived;
        private BigDecimal totalOutstanding;
        private BigDecimal totalOverdue;
        private LocalDate nextDueDate;
        private BigDecimal nextDueAmount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CombinedInstallment {
        private Integer installmentNumber;
        private LocalDate dueDate;
        private BigDecimal rentalPortion;
        private BigDecimal buyoutPortion;
        private BigDecimal totalPayment;
        private BigDecimal bankOwnershipBefore;
        private BigDecimal bankOwnershipAfter;
        private BigDecimal cumulativeTotalPaid;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahCombinedSchedule {
        private List<CombinedInstallment> installments;
        private BigDecimal totalRentalOverLifetime;
        private BigDecimal totalBuyoutOverLifetime;
        private BigDecimal totalPaymentOverLifetime;
        private BigDecimal firstPayment;
        private BigDecimal lastPayment;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahBuyoutSummary {
        private Long contractId;
        private Integer totalUnits;
        private BigDecimal unitsBoughtToDate;
        private BigDecimal unitsRemaining;
        private BigDecimal completionPercentage;
        private LocalDate estimatedCompletionDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CombinedPaymentResult {
        private Long contractId;
        private BigDecimal rentalPaid;
        private BigDecimal buyoutPaid;
        private BigDecimal unitsTransferred;
        private BigDecimal unappliedAmount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahLossEventResponse {
        private Long id;
        private Long contractId;
        private String lossEventRef;
        private LocalDate lossDate;
        private MusharakahDomainEnums.LossType lossType;
        private BigDecimal totalLossAmount;
        private BigDecimal bankCapitalRatioAtLoss;
        private BigDecimal customerCapitalRatioAtLoss;
        private BigDecimal bankLossShare;
        private BigDecimal customerLossShare;
        private String allocationMethod;
        private Boolean requiresComplianceVerification;
        private Boolean verifiedByCompliance;
        private String verifiedBy;
        private LocalDateTime verifiedAt;
        private BigDecimal bankShareValueAfterLoss;
        private BigDecimal customerShareValueAfterLoss;
        private BigDecimal assetValueAfterLoss;
        private BigDecimal insuranceRecoveryExpected;
        private BigDecimal netLossAfterInsurance;
        private MusharakahDomainEnums.LossStatus status;
    }
}
