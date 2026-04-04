package com.cbs.ijarah.dto;

import com.cbs.ijarah.entity.IjarahDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class IjarahResponses {

    private IjarahResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahApplicationResponse {
        private Long id;
        private String applicationRef;
        private Long customerId;
        private String productCode;
        private IjarahDomainEnums.IjarahType ijarahType;
        private String requestedAssetDescription;
        private IjarahDomainEnums.AssetCategory requestedAssetCategory;
        private BigDecimal estimatedAssetCost;
        private Integer requestedTenorMonths;
        private String currencyCode;
        private BigDecimal proposedRentalAmount;
        private IjarahDomainEnums.RentalFrequency proposedRentalFrequency;
        private Integer proposedAdvanceRentals;
        private BigDecimal proposedSecurityDeposit;
        private BigDecimal dsrWithProposedRental;
        private Integer creditScore;
        private IjarahDomainEnums.ApplicationStatus status;
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
    public static class IjarahContractResponse {
        private Long id;
        private String contractRef;
        private Long applicationId;
        private Long customerId;
        private Long accountId;
        private String productCode;
        private String contractTypeCode;
        private IjarahDomainEnums.IjarahType ijarahType;
        private Long ijarahAssetId;
        private String assetDescription;
        private IjarahDomainEnums.AssetCategory assetCategory;
        private String assetLocation;
        private BigDecimal assetAcquisitionCost;
        private BigDecimal assetResidualValue;
        private String currencyCode;
        private LocalDate leaseStartDate;
        private LocalDate leaseEndDate;
        private Integer tenorMonths;
        private Integer totalLeasePeriods;
        private IjarahDomainEnums.RentalFrequency rentalFrequency;
        private BigDecimal baseRentalAmount;
        private IjarahDomainEnums.RentalType rentalType;
        private String rentalReviewFrequency;
        private LocalDate nextRentalReviewDate;
        private Integer advanceRentals;
        private BigDecimal advanceRentalAmount;
        private BigDecimal securityDeposit;
        private BigDecimal totalRentalsExpected;
        private BigDecimal totalRentalsReceived;
        private BigDecimal totalRentalArrears;
        private Boolean assetOwnedByBank;
        private String insurancePolicyRef;
        private LocalDate insuranceExpiryDate;
        private Boolean latePenaltyToCharity;
        private Long imbTransferMechanismId;
        private IjarahDomainEnums.TransferType imbTransferType;
        private Boolean imbTransferScheduled;
        private Boolean imbTransferCompleted;
        private LocalDate imbTransferDate;
        private IjarahDomainEnums.ContractStatus status;
        private Instant executedAt;
        private String executedBy;
        private Long investmentPoolId;
        private Long poolAssetAssignmentId;
        private String lastScreeningRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahPortfolioSummary {
        private int totalContracts;
        private BigDecimal totalAssetsUnderIjarah;
        private BigDecimal rentalIncomeYtd;
        private Map<String, Long> byType;
        private Map<String, Long> byStatus;
        private long upcomingMaturities;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahAssetDashboard {
        private int totalAssets;
        private BigDecimal totalCost;
        private BigDecimal totalAcquisitionCost;
        private BigDecimal totalNetBookValue;
        private BigDecimal totalAccumulatedDepreciation;
        private Map<String, Long> byCategory;
        private Map<String, Long> byStatus;
        private long expiringInsuranceCount;
        private long maintenanceDueCount;
        private long fullyDepreciatedCount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaintenanceObligationSummary {
        private Long contractId;
        private Long assetId;
        private LocalDate nextMajorMaintenanceDueDate;
        private LocalDate insuranceExpiryDate;
        private BigDecimal totalMaintenanceSpend;
        private List<String> alerts;
        private List<String> obligations;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahRentalSummary {
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
    public static class IjarahBalanceSheetView {
        private BigDecimal grossIjarahAssets;
        private BigDecimal accumulatedDepreciation;
        private BigDecimal impairmentProvision;
        private BigDecimal netIjarahAssets;
        private BigDecimal rentalReceivable;
        private BigDecimal rentalIncome;
        private BigDecimal depreciationExpense;
        private BigDecimal maintenanceExpense;
        private BigDecimal insuranceExpense;
        private BigDecimal netIjarahIncomeContribution;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahIncomeReport {
        private LocalDate fromDate;
        private LocalDate toDate;
        private BigDecimal rentalIncome;
        private BigDecimal depreciationExpense;
        private BigDecimal maintenanceExpense;
        private BigDecimal insuranceExpense;
        private BigDecimal netIncome;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahTransferResponse {
        private Long id;
        private String transferRef;
        private Long ijarahContractId;
        private IjarahDomainEnums.TransferType transferType;
        private Boolean isSeparateDocument;
        private String documentReference;
        private LocalDate documentDate;
        private IjarahDomainEnums.TransferDocumentType documentType;
        private Boolean signedByBank;
        private Boolean signedByCustomer;
        private BigDecimal nominalSalePrice;
        private BigDecimal actualFairValue;
        private Integer totalTransferUnits;
        private Integer unitsTransferredToDate;
        private LocalDate nextUnitTransferDate;
        private IjarahDomainEnums.TransferStatus status;
        private String transferJournalRef;
        private BigDecimal assetNetBookValueAtTransfer;
        private BigDecimal gainLossOnTransfer;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnitTransferScheduleLine {
        private Integer unitNumber;
        private LocalDate scheduledDate;
        private BigDecimal unitPercentage;
        private BigDecimal unitPrice;
        private BigDecimal cumulativeOwnership;
        private IjarahDomainEnums.UnitTransferStatus status;
    }
}
