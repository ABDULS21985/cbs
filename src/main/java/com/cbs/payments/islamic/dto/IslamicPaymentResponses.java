package com.cbs.payments.islamic.dto;

import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class IslamicPaymentResponses {

    private IslamicPaymentResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentResponse {
        private Long paymentId;
        private String paymentRef;
        private PaymentInstruction paymentInstruction;
        private PaymentScreeningResult screeningResult;
        private String status;
        private String message;
        private String feeJournalRef;
        private BigDecimal feeCharged;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentScreeningResult {
        private Long paymentId;
        private String paymentRef;
        private IslamicPaymentDomainEnums.ScreeningOutcome outcome;
        private String screeningRef;
        private long screeningDurationMs;
        @Builder.Default
        private List<ScreeningCheckResult> checkResults = new ArrayList<>();
        private String blockReason;
        private String blockReasonAr;
        private Long alertId;
        private String alertDescription;
        private IslamicPaymentDomainEnums.PaymentScreeningResult overallResult;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreeningCheckResult {
        private IslamicPaymentDomainEnums.CheckType checkType;
        private IslamicPaymentDomainEnums.CheckResult result;
        private String matchedValue;
        private String ruleCode;
        private IslamicPaymentDomainEnums.CheckAction action;
        private String description;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentScreeningPreview {
        private String instructionRef;
        private Long standingInstructionId;
        private String debitAccountNumber;
        private String beneficiaryName;
        private BigDecimal amount;
        private IslamicPaymentDomainEnums.ScreeningOutcome outcome;
        private String blockReason;
        private String screeningRef;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentComplianceSummary {
        private long totalPayments;
        private long screenedCount;
        private long blockedCount;
        private long alertCount;
        private long overrideCount;
        private BigDecimal passRate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BeneficiaryScreeningResult {
        private String beneficiaryName;
        private IslamicPaymentDomainEnums.ScreeningOutcome outcome;
        private boolean highRisk;
        private String reason;
        private String matchedList;
        private String matchedEntry;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentScreeningReport {
        private long totalScreened;
        @Builder.Default
        private Map<String, Long> byOutcome = java.util.Collections.emptyMap();
        @Builder.Default
        private Map<String, Long> blockedByCheckType = java.util.Collections.emptyMap();
        @Builder.Default
        private Map<String, Long> topBlockedMccs = java.util.Collections.emptyMap();
        @Builder.Default
        private Map<String, Long> topFlaggedBeneficiaries = java.util.Collections.emptyMap();
        private long deferredScreenings;
        private BigDecimal averageScreeningTimeMs;
        private BigDecimal falsePositiveRate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DomesticPaymentResult {
        private Long paymentId;
        private String paymentRef;
        private String railName;
        private String railType;
        private String messageRef;
        private String status;
        private String message;
        private LocalDate valueDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DomesticPaymentSummary {
        private String countryCode;
        private LocalDate date;
        private long totalCount;
        private long submittedCount;
        private long rejectedCount;
        private BigDecimal totalAmount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrossBorderPaymentResult {
        private Long paymentId;
        private String paymentRef;
        private String swiftMessageRef;
        private String field72Narrative;
        private String status;
        private BigDecimal fxRate;
        private LocalDate fxSpotDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FxQuote {
        private String sourceCurrency;
        private String destinationCurrency;
        private BigDecimal sourceAmount;
        private BigDecimal fxRate;
        private BigDecimal destinationAmount;
        private LocalDate valueDate;
        private boolean spotCompliant;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SwiftTrackingStatus {
        private Long paymentId;
        private String paymentRef;
        private String swiftMessageRef;
        private String status;
        private LocalDateTime statusTimestamp;
        private String trackingUrl;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrossBorderPaymentSummary {
        private long totalCount;
        private long rejectedCount;
        @Builder.Default
        private Map<String, Long> byCorridor = java.util.Collections.emptyMap();
        @Builder.Default
        private Map<String, Long> byCurrency = java.util.Collections.emptyMap();
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProxyResolutionResult {
        private IslamicPaymentDomainEnums.ProxyType proxyType;
        private String proxyValue;
        private String resolvedAccountNumber;
        private String resolvedBankCode;
        private boolean found;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstantPaymentResult {
        private Long paymentId;
        private String paymentRef;
        private String ipsRail;
        private String ipsTransactionId;
        private String status;
        private long totalProcessingMs;
        private IslamicPaymentDomainEnums.InstantScreeningMode screeningMode;
        private IslamicPaymentDomainEnums.DeferredScreeningResult deferredScreeningResult;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstantPaymentPerformanceMetrics {
        private LocalDate date;
        private BigDecimal averageProcessingMs;
        private BigDecimal p95ProcessingMs;
        private BigDecimal p99ProcessingMs;
        private BigDecimal averageScreeningMs;
        private long deferredScreeningCount;
        private long successCount;
        private long rejectionCount;
        private long timeoutCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AchBatchResult {
        private String countryCode;
        private java.time.LocalDate valueDate;
        private int totalMessages;
        private int successCount;
        private int failureCount;
        private java.math.BigDecimal totalAmount;
    }
}
