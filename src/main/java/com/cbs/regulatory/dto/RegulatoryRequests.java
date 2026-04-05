package com.cbs.regulatory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class RegulatoryRequests {

    private RegulatoryRequests() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTemplateRequest {
        private String templateCode;
        private String jurisdiction;
        private String returnType;
        private String name;
        private String nameAr;
        private String description;
        private Integer version;
        private LocalDate effectiveFrom;
        private LocalDate effectiveTo;
        private List<Map<String, Object>> sections;
        private List<Map<String, Object>> validationRules;
        private List<Map<String, Object>> crossValidations;
        private String outputFormat;
        private String xbrlTaxonomy;
        private String reportingFrequency;
        private Integer filingDeadlineDaysAfterPeriod;
        private Boolean filingDeadlineBusinessDays;
        private String filingCalendarCode;
        private String regulatorFormNumber;
        private String regulatorPortalUrl;
        private Map<String, Object> schemaDefinition;
        private Map<String, Object> submissionConfig;
        private Boolean isActive;
        private String approvedBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateTemplateRequest {
        private String name;
        private String nameAr;
        private String description;
        private LocalDate effectiveFrom;
        private LocalDate effectiveTo;
        private List<Map<String, Object>> sections;
        private List<Map<String, Object>> validationRules;
        private List<Map<String, Object>> crossValidations;
        private String outputFormat;
        private String xbrlTaxonomy;
        private String reportingFrequency;
        private Integer filingDeadlineDaysAfterPeriod;
        private Boolean filingDeadlineBusinessDays;
        private String filingCalendarCode;
        private String regulatorFormNumber;
        private String regulatorPortalUrl;
        private Map<String, Object> schemaDefinition;
        private Map<String, Object> submissionConfig;
        private Boolean isActive;
        private String approvedBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateReturnRequest {
        private String templateCode;
        private LocalDate reportingDate;
        private LocalDate periodFrom;
        private LocalDate periodTo;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverrideLineItemRequest {
        private String lineNumber;
        private String newValue;
        private String reason;
        private String overrideBy;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewDetails {
        private String reviewer;
        private String comments;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmissionDetails {
        private String submittedBy;
        private String submissionMethod;
        private String regulatorReferenceNumber;
        private String regulatorPortal;
        private String endpointOverride;
        private Map<String, String> headers;
        private Boolean dryRun;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AcknowledgmentDetails {
        private String regulatorReferenceNumber;
        private String feedback;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectionDetails {
        private String feedback;
        private String rejectedBy;
    }
}
