package com.cbs.zakat.dto;

import com.cbs.zakat.entity.ZakatDomainEnums;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ZakatRequests {

    private ZakatRequests() {
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ComputeBankZakatRequest {
        @NotNull
        private Integer zakatYear;
        @NotBlank
        private String methodologyCode;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ComputeCustomerAggregateRequest {
        @NotNull
        private Integer zakatYear;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CalculateZakatRequest {
        @Builder.Default
        private List<ZakatResponses.ZakatClassificationResult> classifiedAccounts = new ArrayList<>();
        @NotNull
        private ZakatDomainEnums.ZakatRateBasis rateBasis;
        private String methodologyCode;
        @Builder.Default
        private Boolean checkNisab = false;
        private BigDecimal nisabThreshold;
        @Builder.Default
        private List<Map<String, Object>> adjustments = new ArrayList<>();
        private BigDecimal expectedTotalAssets;
        @Builder.Default
        private String targetCurrency = "SAR";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AccrueZakatRequest {
        @NotNull
        private LocalDate asOfDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SsbReviewRequest {
        @Builder.Default
        private boolean approved = true;
        private String reviewedBy;
        private String comments;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApproveComputationRequest {
        @NotBlank
        private String approvedBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PayZakatRequest {
        @NotNull
        private BigDecimal paymentAmount;
        @NotNull
        private LocalDate paymentDate;
        private String paymentReference;
        private String cashGlCode;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerZakatDeductionRequest {
        @NotNull
        private Integer zakatYear;
        @NotNull
        private BigDecimal zakatAmount;
        private String sourceAccountNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrepareZatcaReturnRequest {
        @NotNull
        private UUID computationId;
        @NotNull
        private ZakatDomainEnums.ZatcaReturnType returnType;
        @NotNull
        private ZakatDomainEnums.FilingMethod filingMethod;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZatcaAssessmentDetails {
        @NotNull
        private LocalDate assessmentDate;
        @NotBlank
        private String assessmentRef;
        @NotNull
        private BigDecimal assessedZakatAmount;
        @NotNull
        private ZakatDomainEnums.AssessmentStatus assessmentStatus;
        private String assessmentNotes;
        private LocalDate paymentDueDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentDetails {
        @NotNull
        private BigDecimal paymentAmount;
        @NotNull
        private LocalDate paymentDate;
        @NotBlank
        private String paymentRef;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppealDetails {
        @NotNull
        private LocalDate appealDate;
        @NotBlank
        private String appealRef;
        @NotBlank
        private String appealReason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppealOutcomeDetails {
        @NotNull
        private ZakatDomainEnums.AppealOutcome appealOutcome;
        @NotNull
        private LocalDate appealOutcomeDate;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SsbApprovalDetails {
        private Long fatwaId;
        @NotBlank
        private String approvedBy;
        @NotNull
        private LocalDate approvalDate;
        private LocalDate nextReviewDate;
        private Boolean zatcaAccepted;
        private String zatcaAcceptanceRef;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdjustmentRequest {
        @NotBlank
        private String code;
        private String description;
        @NotNull
        private BigDecimal amount;
        @NotNull
        private ZakatDomainEnums.AdjustmentDirection direction;

        public Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("code", code);
            map.put("description", description);
            map.put("amount", amount);
            map.put("direction", direction != null ? direction.name() : null);
            return map;
        }
    }
}