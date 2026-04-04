package com.cbs.shariahcompliance.dto;

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

public final class CharityFundDtos {

    private CharityFundDtos() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DisburseFundsRequest {
        private Long charityRecipientId;
        private BigDecimal amount;
        private String currencyCode;
        private String purpose;
        private String notes;
        private String reference;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateBatchDisbursementRequest {
        private LocalDate periodFrom;
        private LocalDate periodTo;
        private String allocationMethod;
        @Builder.Default
        private List<BatchAllocation> allocations = new ArrayList<>();
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchAllocation {
        private Long charityRecipientId;
        private BigDecimal amount;
        private String notes;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CharityFundDisbursementResult {
        private String reference;
        private String journalRef;
        private BigDecimal amount;
        private BigDecimal remainingBalance;
        private Long ledgerEntryId;
        private Long batchId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CharityFundReportDetail {
        private LocalDate fromDate;
        private LocalDate toDate;
        private BigDecimal openingBalance;
        private BigDecimal totalInflows;
        private BigDecimal totalOutflows;
        private BigDecimal closingBalance;
        private Map<String, BigDecimal> inflowsBySource;
        private Map<String, BigDecimal> outflowsByRecipient;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CharityFundBreakdown {
        private Map<String, BigDecimal> latePenaltiesByContractType;
        private Map<String, BigDecimal> snciByType;
        private BigDecimal otherInflows;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CharityFundComplianceReport {
        private LocalDate fromDate;
        private LocalDate toDate;
        private BigDecimal totalLatePenaltiesCollected;
        private BigDecimal totalSnciPurified;
        private BigDecimal totalDisbursed;
        private BigDecimal currentBalance;
        private boolean zeroBankUsageVerified;
        private boolean approvedRecipientsOnlyVerified;
    }
}
