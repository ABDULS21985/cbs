package com.cbs.regulatory.dto;

import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class RegulatoryResponses {

    private RegulatoryResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationResult {
        private boolean valid;
        private List<Map<String, Object>> errors;
        private List<Map<String, Object>> warnings;
        private RegulatoryDomainEnums.CrossValidationStatus crossValidationStatus;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateComparisonResult {
        private String templateCode;
        private Integer version1;
        private Integer version2;
        private List<String> addedLines;
        private List<String> removedLines;
        private List<String> changedLines;
        private List<String> changedValidations;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapitalAdequacyData {
        private BigDecimal tier1Capital;
        private BigDecimal tier2Capital;
        private BigDecimal riskWeightedAssets;
        private BigDecimal iahFunds;
        private BigDecimal alphaFactor;
        private BigDecimal adjustedRiskWeightedAssets;
        private BigDecimal capitalAdequacyRatio;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShariahComplianceData {
        private long snciDetected;
        private BigDecimal charityFundBalance;
        private long screeningsTotal;
        private long screeningsBlocked;
        private long screeningsAlerted;
        private long openAuditFindings;
        private long closedAuditFindings;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AmlStatisticalData {
        private long totalSarsFiled;
        private Map<String, Long> sarsByJurisdiction;
        private long sanctionsMatches;
        private long islamicAlerts;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegulatoryCalendarEntry {
        private String templateCode;
        private String returnType;
        private String jurisdiction;
        private LocalDate periodFrom;
        private LocalDate periodTo;
        private LocalDate filingDeadline;
        private String status;
        private Long returnId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnComparison {
        private Long currentReturnId;
        private Long previousReturnId;
        private List<Map<String, Object>> variances;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegulatoryReportingDashboard {
        private Map<String, Long> returnsByStatus;
        private long upcomingDeadlines;
        private long breachedDeadlines;
        private Map<String, Long> byJurisdiction;
        private BigDecimal complianceRate;
    }
}
