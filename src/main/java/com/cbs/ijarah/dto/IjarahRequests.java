package com.cbs.ijarah.dto;

import com.cbs.ijarah.entity.IjarahDomainEnums;
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
import java.util.Map;

public final class IjarahRequests {

    private IjarahRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateIjarahApplicationRequest {
        @NotNull
        private Long customerId;
        @NotBlank
        private String productCode;
        @NotNull
        private IjarahDomainEnums.IjarahType ijarahType;
        @NotBlank
        private String requestedAssetDescription;
        @NotNull
        private IjarahDomainEnums.AssetCategory requestedAssetCategory;
        @NotNull
        @DecimalMin("0.01")
        private BigDecimal estimatedAssetCost;
        @NotNull
        private Integer requestedTenorMonths;
        @NotBlank
        private String currencyCode;
        private IjarahDomainEnums.Purpose purpose;
        private BigDecimal monthlyIncome;
        private BigDecimal existingObligations;
        private Long branchId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreditAssessmentRequest {
        private BigDecimal monthlyIncome;
        private BigDecimal existingObligations;
        private Integer creditScore;
        private BigDecimal proposedMonthlyRental;
        private Long assignedOfficerId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahPricingRequest {
        @NotNull
        private BigDecimal assetCost;
        @NotNull
        private BigDecimal residualValue;
        @NotNull
        private BigDecimal targetProfit;
        @NotNull
        private Integer tenorMonths;
        @NotNull
        private IjarahDomainEnums.RentalFrequency rentalFrequency;
        @NotNull
        private IjarahDomainEnums.RentalType rentalType;
        private String variableRentalBenchmark;
        private BigDecimal variableRentalMargin;
        private String rentalReviewFrequency;
        private BigDecimal rentalEscalationRate;
        private Integer advanceRentals;
        private BigDecimal securityDeposit;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetProcurementRequest {
        @NotBlank
        private String assetDescription;
        @NotNull
        private IjarahDomainEnums.AssetCategory assetCategory;
        private String assetSerialNumber;
        private String assetLocation;
        @NotNull
        private BigDecimal acquisitionCost;
        private BigDecimal fairValueAtInception;
        private BigDecimal residualValue;
        private String currencyCode;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetOwnershipConfirmation {
        @NotBlank
        private String ownershipEvidenceRef;
        @NotBlank
        private String registeredOwner;
        private String registrationNumber;
        private String registrationAuthority;
        private LocalDate registrationDate;
        private String supplierName;
        private String supplierInvoiceRef;
        private LocalDate acquisitionDate;
        private IjarahDomainEnums.AssetAcquisitionMethod acquisitionMethod;
        private IjarahDomainEnums.DepreciationMethod depreciationMethod;
        private Integer usefulLifeMonths;
        private BigDecimal residualValue;
        private String insurancePolicyRef;
        private String insuranceProvider;
        private BigDecimal insuranceCoverageAmount;
        private BigDecimal insurancePremiumAnnual;
        private LocalDate insuranceExpiryDate;
        private Map<String, Object> detailedSpecification;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetDamageReport {
        private boolean totalLoss;
        private boolean majorDamage;
        private String description;
        private BigDecimal estimatedCost;
        private LocalDate eventDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetTotalLossRequest {
        private LocalDate lossDate;
        private BigDecimal insuranceRecovery;
        private String reason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsuranceRenewalDetails {
        private String insurancePolicyRef;
        private String insuranceProvider;
        private BigDecimal coverageAmount;
        private BigDecimal premiumAmount;
        private LocalDate expiryDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaintenanceRecordRequest {
        private IjarahDomainEnums.MaintenanceType maintenanceType;
        private IjarahDomainEnums.ResponsibleParty responsibleParty;
        private String description;
        private BigDecimal cost;
        private String currencyCode;
        private String vendorName;
        private String invoiceRef;
        private LocalDate maintenanceDate;
        private LocalDate completionDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EarlyTerminationRequest {
        private LocalDate terminationDate;
        private String reason;
        private BigDecimal negotiatedPurchaseAmount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RentalReviewRequest {
        @NotNull
        private BigDecimal newRentalAmount;
        @NotNull
        private LocalDate effectiveDate;
        private String reason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTransferMechanismRequest {
        @NotNull
        private IjarahDomainEnums.TransferType transferType;
        @NotNull
        private Boolean isSeparateDocument;
        @NotBlank
        private String documentReference;
        @NotNull
        private LocalDate documentDate;
        @NotNull
        private IjarahDomainEnums.TransferDocumentType documentType;
        private String transferDescription;
        private String transferDescriptionAr;
        private String giftCondition;
        private LocalDate giftEffectiveDate;
        private BigDecimal nominalSalePrice;
        private String saleCurrency;
        private String saleCondition;
        private String fairValueDeterminationMethod;
        private String fairValueAppraiser;
        private BigDecimal estimatedFairValue;
        private Integer totalTransferUnits;
        private IjarahDomainEnums.UnitTransferFrequency unitTransferFrequency;
        private BigDecimal unitTransferAmount;
        private LocalDate firstUnitTransferDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignatureDetails {
        private boolean signedByBank;
        private boolean signedByCustomer;
        private String bankRepresentative;
        private LocalDate signedDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferExecutionRequest {
        private BigDecimal actualFairValue;
        private LocalDate actualFairValueDate;
        private String titleTransferDocRef;
        private String registrationAuthority;
        private String newRegistrationNumber;
        private String assetConditionAtTransfer;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordMaintenanceRequest {
        private IjarahDomainEnums.MaintenanceType maintenanceType;
        private IjarahDomainEnums.ResponsibleParty responsibleParty;
        private String description;
        private BigDecimal cost;
        private String currencyCode;
        private String vendorName;
        private String invoiceRef;
        private LocalDate maintenanceDate;
        private LocalDate completionDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsuranceUpdateRequest {
        private boolean insured;
        private String insurancePolicyRef;
        private String insuranceProvider;
        private BigDecimal insuranceCoverageAmount;
        private BigDecimal insurancePremiumAnnual;
        private LocalDate insuranceExpiryDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValuationRequest {
        private LocalDate valuationDate;
        private BigDecimal valuationAmount;
        private String valuationMethod;
        private String appraiserName;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetDisposalRequest {
        private LocalDate disposalDate;
        private IjarahDomainEnums.DisposalMethod disposalMethod;
        private BigDecimal disposalProceeds;
        private String reason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessRentalPaymentRequest {
        private BigDecimal paymentAmount;
        private LocalDate paymentDate;
        private Long debitAccountId;
        private String externalRef;
        private String narration;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpairAssetRequest {
        private BigDecimal impairmentAmount;
        private String reason;
    }
}
