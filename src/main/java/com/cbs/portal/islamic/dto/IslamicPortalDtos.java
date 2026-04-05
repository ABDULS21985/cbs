package com.cbs.portal.islamic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * All DTOs for the Islamic Internet Banking Portal.
 */
public class IslamicPortalDtos {

    // ── Dashboard ────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicAccountDashboardDTO {
        private String customerName;
        private String customerNameAr;
        private String customerId;
        private String lastLoginDate;
        private String lastLoginHijri;
        private List<IslamicAccountSummaryDTO> accounts;
        private List<IslamicFinancingSummaryDTO> financings;
        private List<IslamicCardSummaryDTO> cards;
        private List<QuickAction> quickActions;
        private List<IslamicNotificationDTO> notifications;
        private BigDecimal totalDeposits;
        private BigDecimal totalFinancingOutstanding;
        private String currency;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicAccountSummaryDTO {
        private String accountId;
        private String accountNumber;
        private String accountName;
        private String accountNameAr;
        private String contractType;
        private String productName;
        private String productNameAr;
        private BigDecimal availableBalance;
        private BigDecimal currentBalance;
        private String currency;
        private String status;
        private BigDecimal indicativeRate;
        private BigDecimal lastHibahAmount;
        private String lastProfitDate;
        private boolean zakatEligible;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicFinancingSummaryDTO {
        private String financingId;
        private String contractType;
        private String productName;
        private String productNameAr;
        private BigDecimal originalAmount;
        private BigDecimal outstandingBalance;
        private BigDecimal monthlyPayment;
        private String nextPaymentDate;
        private String nextPaymentHijri;
        private String currency;
        private String status;
        private BigDecimal completionPercentage;
        private int remainingTenureMonths;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicCardSummaryDTO {
        private String cardId;
        private String cardNumber;
        private String cardType;
        private String cardName;
        private String contractType;
        private BigDecimal availableLimit;
        private BigDecimal usedAmount;
        private BigDecimal totalLimit;
        private String currency;
        private String status;
        private String expiryDate;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuickAction {
        private String code;
        private String label;
        private String labelAr;
        private String icon;
        private String route;
        private boolean enabled;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicNotificationDTO {
        private String id;
        private String title;
        private String titleAr;
        private String message;
        private String messageAr;
        private String type;
        private String severity;
        private Instant timestamp;
        private boolean read;
    }

    // ── Account Detail ───────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicAccountDetailDTO {
        private String accountId;
        private String accountNumber;
        private String iban;
        private String accountName;
        private String accountNameAr;
        private String contractType;
        private String productCode;
        private String productName;
        private String productNameAr;
        private BigDecimal availableBalance;
        private BigDecimal currentBalance;
        private BigDecimal holdBalance;
        private String currency;
        private String status;
        private LocalDate openDate;
        private String openDateHijri;
        private boolean zakatEligible;
        private BigDecimal zakatableAmount;
        // Wadiah-specific
        private WadiahAccountDetailDTO wadiahDetail;
        // Mudarabah-specific
        private MudarabahAccountDetailDTO mudarabahDetail;
        private List<IslamicTransactionDTO> recentTransactions;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WadiahAccountDetailDTO {
        private boolean guaranteedPrincipal;
        private BigDecimal lastHibahAmount;
        private String lastHibahDate;
        private BigDecimal ytdHibah;
        private List<HibahHistoryItem> hibahHistory;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MudarabahAccountDetailDTO {
        private BigDecimal profitSharingRatio;
        private BigDecimal indicativeRate;
        private BigDecimal lastProfitAmount;
        private String lastProfitDate;
        private BigDecimal ytdProfit;
        private String investmentPool;
        private BigDecimal perRate;
        private BigDecimal irrRate;
        private List<ProfitDistributionHistoryItem> profitHistory;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HibahHistoryItem {
        private String date;
        private String dateHijri;
        private BigDecimal amount;
        private String currency;
        private String reference;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfitDistributionHistoryItem {
        private String periodStart;
        private String periodEnd;
        private String periodStartHijri;
        private String periodEndHijri;
        private BigDecimal grossProfit;
        private BigDecimal customerShare;
        private BigDecimal effectiveRate;
        private BigDecimal perDeduction;
        private BigDecimal irrDeduction;
        private BigDecimal netDistributed;
        private String reference;
    }

    // ── Transaction ──────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicTransactionDTO {
        private String transactionId;
        private String accountId;
        private LocalDate transactionDate;
        private LocalDate valueDate;
        private String transactionDateHijri;
        private String description;
        private String descriptionAr;
        private BigDecimal amount;
        private String currency;
        private String type;
        private BigDecimal runningBalance;
        private String reference;
        private String category;
        private String channel;
    }

    // ── Financing Detail ─────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicFinancingDetailDTO {
        private String financingId;
        private String contractReference;
        private String contractType;
        private String productCode;
        private String productName;
        private String productNameAr;
        private BigDecimal originalAmount;
        private BigDecimal outstandingBalance;
        private BigDecimal totalPaid;
        private String currency;
        private String status;
        private LocalDate contractDate;
        private String contractDateHijri;
        private LocalDate maturityDate;
        private String maturityDateHijri;
        private int originalTenureMonths;
        private int remainingTenureMonths;
        private BigDecimal completionPercentage;
        private BigDecimal monthlyPayment;
        private String nextPaymentDate;
        private String nextPaymentHijri;
        private ShariahInfoDTO shariahInfo;
        // Contract-type-specific details
        private MurabahaPortalDTO murabahaDetail;
        private IjarahPortalDTO ijarahDetail;
        private MusharakahPortalDTO musharakahDetail;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MurabahaPortalDTO {
        private BigDecimal costPrice;
        private BigDecimal sellingPrice;
        private BigDecimal profitAmount;
        private BigDecimal profitRate;
        private BigDecimal totalPrincipalPaid;
        private BigDecimal totalProfitPaid;
        private BigDecimal remainingPrincipal;
        private BigDecimal remainingProfit;
        private String assetDescription;
        private List<InstallmentScheduleDTO> schedule;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IjarahPortalDTO {
        private BigDecimal assetCost;
        private BigDecimal residualValue;
        private BigDecimal monthlyRental;
        private BigDecimal securityDeposit;
        private BigDecimal totalRentalPaid;
        private BigDecimal remainingRentals;
        private String assetDescription;
        private String ownershipTransferMethod;
        private boolean ijarahMuntahiaBittamleek;
        private BigDecimal currentAssetValue;
        private List<RentalScheduleDTO> schedule;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MusharakahPortalDTO {
        private BigDecimal totalAssetValue;
        private BigDecimal customerEquity;
        private BigDecimal bankEquity;
        private BigDecimal customerOwnershipPercentage;
        private BigDecimal bankOwnershipPercentage;
        private int totalUnits;
        private int customerUnits;
        private int bankUnits;
        private BigDecimal unitPrice;
        private BigDecimal monthlyRental;
        private BigDecimal monthlyAcquisition;
        private BigDecimal totalMonthlyPayment;
        private String assetDescription;
        private List<CombinedScheduleDTO> schedule;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShariahInfoDTO {
        private String contractType;
        private String contractTypeAr;
        private String shariahBoardApprovalRef;
        private String shariahStandard;
        private String aaiofiStandard;
        private String lastAuditDate;
        private String complianceStatus;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InstallmentScheduleDTO {
        private int installmentNumber;
        private String dueDate;
        private String dueDateHijri;
        private BigDecimal principalPortion;
        private BigDecimal profitPortion;
        private BigDecimal totalAmount;
        private BigDecimal outstandingAfter;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RentalScheduleDTO {
        private int periodNumber;
        private String dueDate;
        private String dueDateHijri;
        private BigDecimal rentalAmount;
        private BigDecimal maintenanceReserve;
        private BigDecimal takafulPortion;
        private BigDecimal totalAmount;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CombinedScheduleDTO {
        private int periodNumber;
        private String dueDate;
        private String dueDateHijri;
        private BigDecimal rentalPortion;
        private BigDecimal acquisitionPortion;
        private BigDecimal totalAmount;
        private int unitsAcquired;
        private int cumulativeUnitsOwned;
        private BigDecimal ownershipPercentageAfter;
        private String status;
    }

    // ── Product Marketplace ──────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicProductMarketplaceDTO {
        private List<ProductCategoryDTO> categories;
        private List<ProductCardDTO> featuredProducts;
        private List<ProductCardDTO> allProducts;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductCategoryDTO {
        private String code;
        private String name;
        private String nameAr;
        private String icon;
        private String description;
        private String descriptionAr;
        private int productCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductCardDTO {
        private String productCode;
        private String productName;
        private String productNameAr;
        private String contractType;
        private String category;
        private String shortDescription;
        private String shortDescriptionAr;
        private String fullDescription;
        private String fullDescriptionAr;
        private List<KeyFeatureDTO> keyFeatures;
        private List<ShariahBadgeDTO> shariahBadges;
        private BigDecimal indicativeRate;
        private BigDecimal minimumAmount;
        private BigDecimal maximumAmount;
        private String currency;
        private int minimumTenureMonths;
        private int maximumTenureMonths;
        private boolean featured;
        private boolean availableOnline;
        private String imageUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class KeyFeatureDTO {
        private String icon;
        private String text;
        private String textAr;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShariahBadgeDTO {
        private String code;
        private String label;
        private String labelAr;
        private String tooltip;
        private String tooltipAr;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductComparisonDTO {
        private List<ProductCardDTO> products;
        private List<ComparisonRow> comparisonRows;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ComparisonRow {
        private String attribute;
        private String attributeAr;
        private Map<String, String> values;
    }

    // ── Profit Distribution Portal ───────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfitDistributionPortalDTO {
        private String accountId;
        private String accountNumber;
        private String contractType;
        private String investmentPool;
        private BigDecimal profitSharingRatio;
        private BigDecimal indicativeRate;
        private BigDecimal ytdProfit;
        private BigDecimal lifetimeProfit;
        private PoolInfoDTO poolInfo;
        private List<ProfitDistributionPeriodDTO> periods;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfitDistributionPeriodDTO {
        private String periodStart;
        private String periodEnd;
        private String periodStartHijri;
        private String periodEndHijri;
        private BigDecimal poolRevenue;
        private BigDecimal grossProfit;
        private BigDecimal customerShare;
        private BigDecimal perDeduction;
        private BigDecimal irrDeduction;
        private BigDecimal netDistributed;
        private BigDecimal effectiveRate;
        private BigDecimal averageBalance;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PoolInfoDTO {
        private String poolId;
        private String poolName;
        private String poolNameAr;
        private BigDecimal totalPoolSize;
        private BigDecimal poolReturnRate;
        private BigDecimal perBalance;
        private BigDecimal irrBalance;
        private String lastUpdated;
    }

    // ── Application Flow ─────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IslamicApplicationFlowDTO {
        private String contractType;
        private String productCode;
        private String productName;
        private String productNameAr;
        private List<ApplicationStepDTO> steps;
        private int totalSteps;
        private int currentStep;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApplicationStepDTO {
        private int stepNumber;
        private String stepCode;
        private String stepName;
        private String stepNameAr;
        private boolean mandatory;
        private boolean requiresConsent;
        private boolean completed;
        private boolean current;
    }

    // ── Shariah Disclosure ────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShariahDisclosurePortalDTO {
        private String contractType;
        private String disclosureVersion;
        private List<DisclosureItem> items;
        private int totalItems;
        private int mandatoryItems;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DisclosureItem {
        private Long id;
        private int itemOrder;
        private String textEn;
        private String textAr;
        private boolean requiresExplicitConsent;
        private boolean consented;
    }

    // ── Shariah Consent Request ──────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShariahConsentRequest {
        private Long customerId;
        private String applicationRef;
        private String productCode;
        private String contractType;
        private String disclosureVersion;
        private boolean allItemsConsented;
        private List<Long> consentedItemIds;
        private String consentMethod;
        private String ipAddress;
        private String deviceInfo;
        private String userAgent;
    }

    // ── Application Submission ────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApplicationSubmissionResult {
        private String applicationRef;
        private String status;
        private String message;
        private String messageAr;
        private String submittedAt;
        private String submittedAtHijri;
        private String estimatedProcessingDays;
        private String trackingUrl;
    }

    // ── Application Status ───────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApplicationStatusDTO {
        private String applicationRef;
        private String productCode;
        private String productName;
        private String productNameAr;
        private String contractType;
        private String status;
        private String statusAr;
        private String submittedDate;
        private String submittedDateHijri;
        private String lastUpdatedDate;
        private String lastUpdatedDateHijri;
        private int currentStep;
        private int totalSteps;
        private String currentStepName;
        private String currentStepNameAr;
        private String remarks;
        private String remarksAr;
    }

    // ── Early Settlement ─────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EarlySettlementPortalDTO {
        private String financingId;
        private String contractType;
        private String contractReference;
        private BigDecimal outstandingBalance;
        private BigDecimal totalRemainingProfit;
        private BigDecimal ibraAmount;
        private BigDecimal earlySettlementAmount;
        private BigDecimal penaltyAmount;
        private String currency;
        private LocalDate quoteValidUntil;
        private String quoteValidUntilHijri;
        private String ibraPolicy;
        private String ibraPolicyAr;
        private boolean ibraApplied;
    }

    // ── Repayment Summary ────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RepaymentSummaryDTO {
        private String financingId;
        private String contractType;
        private BigDecimal totalAmountDue;
        private BigDecimal totalPrincipalPaid;
        private BigDecimal totalProfitPaid;
        private BigDecimal totalPaid;
        private BigDecimal nextPaymentAmount;
        private String nextPaymentDate;
        private String nextPaymentDateHijri;
        private int paymentsMade;
        private int paymentsRemaining;
        private BigDecimal completionPercentage;
        private String currency;
        private boolean overdue;
        private BigDecimal overdueAmount;
        private int overdueDays;
    }

    // ── Statement ────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StatementRequest {
        private String accountId;
        private LocalDate fromDate;
        private LocalDate toDate;
        private String format;
        private String language;
        private boolean includeHijriDates;
        private List<String> transactionTypes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StatementOption {
        private String format;
        private String label;
        private String labelAr;
        private String description;
        private String descriptionAr;
        private boolean available;
    }
}
