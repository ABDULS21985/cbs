package com.cbs.fees.islamic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class IslamicFeeResponses {

    private IslamicFeeResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeCalculationContext {
        private BigDecimal transactionAmount;
        private BigDecimal financingAmount;
        private BigDecimal accountBalance;
        private String customerSegment;
        private Integer tenorMonths;
        private Integer daysOverdue;
        private String transferType;
        private String currencyCode;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeCalculationResult {
        private Long feeConfigId;
        private String feeCode;
        private String feeName;
        private BigDecimal calculatedAmount;
        private String calculationBreakdown;
        private String classification;
        private boolean charityRouted;
        private String glAccountCode;
        private String currencyCode;
        private boolean antiRibaCheckPassed;
        private String antiRibaNote;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeChargeResult {
        private Long feeChargeLogId;
        private BigDecimal chargedAmount;
        private String journalRef;
        private boolean charityRouted;
        private Long charityFundEntryId;
        private String feeCode;
        private String classification;
        private String glAccountCode;
        private String message;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductFeeSchedule {
        private String productCode;
        private String productName;
        @Builder.Default
        private List<FeeScheduleEntry> fees = new ArrayList<>();

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class FeeScheduleEntry {
            private String feeCode;
            private String feeName;
            private String feeNameAr;
            private String feeType;
            private BigDecimal amount;
            private BigDecimal rate;
            private String shariahClassification;
            private boolean charityRouted;
            private String chargeFrequency;
            private String chargeTiming;
            private String shariahJustification;
        }
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatePenaltyRequest {
        private Long contractId;
        private String contractRef;
        private String contractTypeCode;
        private Long installmentId;
        private BigDecimal overdueAmount;
        private Integer daysOverdue;
        private LocalDate penaltyDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatePenaltyResult {
        private boolean penaltyCharged;
        private BigDecimal penaltyAmount;
        private String reason;
        private String journalRef;
        private boolean charityRouted;
        private Long charityFundEntryId;
        private BigDecimal totalPenaltiesOnContract;
        private Long latePenaltyRecordId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatePenaltySummary {
        private BigDecimal totalChargedToday;
        private BigDecimal totalChargedMonthToDate;
        private BigDecimal totalChargedYearToDate;
        private BigDecimal averagePenaltyPerInstallment;
        private long compoundingAttemptsBlockedCount;
        private Map<String, BigDecimal> byContractType;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeReceivableAging {
        private BigDecimal currentBucket;
        private BigDecimal bucket30Days;
        private BigDecimal bucket60Days;
        private BigDecimal bucket90Days;
        private BigDecimal bucket90PlusDays;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeIncomeReport {
        private LocalDate fromDate;
        private LocalDate toDate;
        private BigDecimal ujrahIncome;
        private BigDecimal charityRoutedAmount;
        private BigDecimal deferredFeeBalance;
        private BigDecimal feeReceivableBalance;
        private Map<String, BigDecimal> byFeeCategory;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeWaiverSummary {
        private BigDecimal totalWaived;
        private BigDecimal ujrahWaived;
        private BigDecimal charityPenaltyWaived;
        private Map<String, BigDecimal> byReason;
        private Map<String, BigDecimal> byAuthorityLevel;
    }
}
