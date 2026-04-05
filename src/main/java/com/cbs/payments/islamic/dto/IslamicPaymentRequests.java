package com.cbs.payments.islamic.dto;

import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class IslamicPaymentRequests {

    private IslamicPaymentRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IslamicPaymentRequest {
        @NotNull
        private Long sourceAccountId;
        @NotBlank
        private String destinationAccountNumber;
        private String destinationBankCode;
        private String destinationBankSwift;
        private String beneficiaryName;
        private String beneficiaryBankName;
        @NotNull
        private BigDecimal amount;
        @NotBlank
        private String currencyCode;
        private String destinationCurrencyCode;
        @NotBlank
        private String paymentChannel;
        @Builder.Default
        private IslamicPaymentDomainEnums.PaymentPurpose purpose = IslamicPaymentDomainEnums.PaymentPurpose.GENERAL;
        private String purposeDescription;
        private String reference;
        @Builder.Default
        private boolean requireShariahScreening = true;
        private String merchantCategoryCode;
        private String merchantName;
        private String merchantCountry;
        private String correspondentBankSwift;
        private String correspondentBankName;
        private String chargeOption;
        private String islamicTransactionCode;
        private String aaoifiReportingCategory;
        private String proxyType;
        private String proxyValue;
        private Boolean forwardFxRequested;
        private LocalDate fxValueDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualOverrideRequest {
        @NotBlank
        private String reason;
        @NotBlank
        private String approvedBy;
        private String approvalReference;
        private String documentedJustification;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreenBeneficiaryRequest {
        @NotBlank
        private String beneficiaryName;
        private String beneficiaryId;
        private String beneficiaryBankSwift;
        private String beneficiaryBankName;
        private String beneficiaryCountry;
        private String merchantCategoryCode;
        private String beneficiaryCategory;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StandingOrderBatchScreenRequest {
        @NotNull
        private LocalDate executionDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DomesticPaymentProcessRequest {
        @NotNull
        private Long paymentId;
        private String countryCode;
        private String railName;
        private String railType;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AchBatchRequest {
        @NotBlank
        private String countryCode;
        @NotNull
        private LocalDate valueDate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrossBorderProcessRequest {
        @NotNull
        private Long paymentId;
        private String correspondentBankSwift;
        private String correspondentBankName;
        private String beneficiaryBankSwift;
        private String beneficiaryBankName;
        private String beneficiaryBankCountry;
        private String regulatoryReportingCode;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProxyResolutionRequest {
        @NotNull
        private IslamicPaymentDomainEnums.ProxyType proxyType;
        @NotBlank
        private String proxyValue;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstantPaymentProcessRequest {
        @NotNull
        private Long paymentId;
    }
}
