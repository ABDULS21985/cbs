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

public final class IslamicFeeRequests {

    private IslamicFeeRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveIslamicFeeRequest {
        private Long baseFeeId;
        private String feeCode;
        private String name;
        private String nameAr;
        private String description;
        private String descriptionAr;
        private String shariahClassification;
        private String shariahJustification;
        private String shariahJustificationAr;
        private String shariahReference;
        private Boolean ssbApproved;
        private String feeType;
        private BigDecimal flatAmount;
        private BigDecimal percentageRate;
        private BigDecimal minimumAmount;
        private BigDecimal maximumAmount;
        private String tierDecisionTableCode;
        private String formulaExpression;
        @Builder.Default
        private List<String> applicableContractTypes = new ArrayList<>();
        @Builder.Default
        private List<String> applicableProductCodes = new ArrayList<>();
        @Builder.Default
        private List<String> applicableTransactionTypes = new ArrayList<>();
        private String feeCategory;
        private String chargeFrequency;
        private String chargeTiming;
        private String incomeGlAccount;
        private Boolean charityRouted;
        private String charityGlAccount;
        private Boolean percentageOfFinancingProhibited;
        private Boolean compoundingProhibited;
        private BigDecimal maximumAsPercentOfFinancing;
        private BigDecimal annualPenaltyCapAmount;
        private String status;
        private LocalDate effectiveFrom;
        private LocalDate effectiveTo;
        private String currencyCode;
        private String triggerEvent;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeSsbApprovalRequest {
        private String approvedBy;
        private String approvalRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuspendFeeRequest {
        private String reason;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeCalculationRequest {
        private String feeCode;
        private IslamicFeeResponses.FeeCalculationContext context;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChargeFeeRequest {
        private String feeCode;
        private Long accountId;
        private BigDecimal transactionAmount;
        private BigDecimal financingAmount;
        private BigDecimal accountBalance;
        private String customerSegment;
        private Integer tenorMonths;
        private Long contractId;
        private String contractRef;
        private String contractTypeCode;
        private Long installmentId;
        private String transactionType;
        private String triggerRef;
        private String narration;
        private String currencyCode;
        private Long customerId;
        private String transferType;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequestFeeWaiverRequest {
        private Long feeConfigId;
        private Long feeChargeLogId;
        private Long contractId;
        private Long accountId;
        private Long customerId;
        private BigDecimal originalFeeAmount;
        private BigDecimal waivedAmount;
        private String currencyCode;
        private String waiverType;
        private String reason;
        private String justificationDetail;
        private LocalDate deferredUntil;
        private String convertedFeeCode;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectWaiverRequest {
        private String reason;
        private String rejectedBy;
    }
}
