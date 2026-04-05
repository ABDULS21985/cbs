package com.cbs.zakat.dto;

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

public final class ZakatResponses {

    private ZakatResponses() {
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatClassificationResult {
        private String glAccountCode;
        private String glAccountName;
        private String currencyCode;
        @Builder.Default
        private BigDecimal glBalance = BigDecimal.ZERO;
        private String zakatClassification;
        private String subCategory;
        private String valuationMethod;
        @Builder.Default
        private BigDecimal adjustedAmount = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal provisionDeducted = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal deferredProfitDeducted = BigDecimal.ZERO;
        @Builder.Default
        private boolean includedInZakatBase = false;
        private String classificationRuleCode;
        private String exclusionReason;
        @Builder.Default
        private boolean debated = false;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatCalculationResult {
        @Builder.Default
        private BigDecimal zakatableAssets = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal nonZakatableAssets = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal deductibleLiabilities = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal nonDeductibleLiabilities = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalAssetsFromClassification = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalAssetsFromGl = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatBase = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatRate = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatAmount = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalAdjustments = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal adjustedZakatAmount = BigDecimal.ZERO;
        @Builder.Default
        private boolean belowNisab = false;
        private String noZakatDueReason;
        @Builder.Default
        private Map<String, BigDecimal> assetBreakdown = new LinkedHashMap<>();
        @Builder.Default
        private Map<String, BigDecimal> liabilityBreakdown = new LinkedHashMap<>();
        @Builder.Default
        private Map<String, BigDecimal> excludedAssetBreakdown = new LinkedHashMap<>();
        @Builder.Default
        private List<Map<String, Object>> appliedAdjustments = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerAccountZakatBreakdown {
        private Long accountId;
        private String accountNumber;
        private String contractType;
        private String balanceMethodUsed;
        private LocalDate openedDate;
        private LocalDate zakatDueDate;
        @Builder.Default
        private boolean haulMet = false;
        private String currencyCode;
        @Builder.Default
        private BigDecimal sourceBalance = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatableBalance = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatAmount = BigDecimal.ZERO;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerZakatResult {
        private Long customerId;
        private String customerName;
        private Integer zakatYear;
        private String methodologyCode;
        @Builder.Default
        private BigDecimal totalZakatableBalance = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal nisabThreshold = BigDecimal.ZERO;
        @Builder.Default
        private boolean belowNisab = false;
        @Builder.Default
        private BigDecimal totalZakat = BigDecimal.ZERO;
        @Builder.Default
        private boolean deductionEligible = false;
        @Builder.Default
        private boolean deductionAllowed = false;
        private String rateBasis;
        @Builder.Default
        private List<CustomerAccountZakatBreakdown> accountBreakdown = new ArrayList<>();
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatCertificate {
        private String certificateRef;
        private Long customerId;
        private String customerName;
        private Integer zakatYear;
        private LocalDate computationDate;
        private String methodologyCode;
        private String fatwaRef;
        private String paymentStatus;
        private String zatcaReference;
        private String englishText;
        private String arabicText;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MethodologyComparisonResult {
        private String methodologyCode1;
        private String methodologyCode2;
        @Builder.Default
        private Map<String, String> differences = new LinkedHashMap<>();
        @Builder.Default
        private boolean significantImpact = false;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatTrendItem {
        private Integer zakatYear;
        @Builder.Default
        private BigDecimal zakatBase = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatAmount = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal adjustedZakatAmount = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal effectiveRate = BigDecimal.ZERO;
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatTrendReport {
        private Integer fromYear;
        private Integer toYear;
        @Builder.Default
        private List<ZakatTrendItem> items = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZatcaFilingHistory {
        @Builder.Default
        private List<Map<String, Object>> returns = new ArrayList<>();
        @Builder.Default
        private Map<String, Long> countsByStatus = new LinkedHashMap<>();
        @Builder.Default
        private long totalReturns = 0L;
        @Builder.Default
        private long totalPaid = 0L;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClassificationSummary {
        @Builder.Default
        private List<ZakatClassificationResult> items = new ArrayList<>();
        @Builder.Default
        private List<String> unclassifiedAccounts = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FiledReturnReference {
        private UUID returnId;
        private String returnRef;
        private String filingConfirmationRef;
    }
}