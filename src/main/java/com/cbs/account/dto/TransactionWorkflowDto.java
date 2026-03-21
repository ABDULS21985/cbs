package com.cbs.account.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class TransactionWorkflowDto {

    private TransactionWorkflowDto() {
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AmlFlag {
        private String alertRef;
        private String caseRef;
        private String description;
        private Integer score;
        private Instant flaggedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditTrailEvent {
        private Long id;
        private String eventType;
        private String actor;
        private String channel;
        private Instant timestamp;
        private String description;
        private Map<String, Object> metadata;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DisputeSummary {
        private Long id;
        private String disputeRef;
        private String reasonCode;
        private String status;
        private Instant filedAt;
        private Instant lastUpdatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DisputeRecord {
        private Long id;
        private String disputeRef;
        private Long transactionId;
        private String transactionRef;
        private BigDecimal amount;
        private String currencyCode;
        private String reasonCode;
        private String description;
        private String contactEmail;
        private String contactPhone;
        private String status;
        private String assignedTo;
        private Instant filedAt;
        private String filedBy;
        private Instant lastUpdatedAt;
        private String updatedBy;
        private Instant closedAt;
        private String closedBy;
        private String responseNotes;
        private String escalationNotes;
        private String closingNotes;
        private List<Long> supportingDocumentIds;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReversalCounts {
        private long pendingApproval;
        private long completed;
        private long rejected;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DisputeDashboard {
        private long total;
        private long pendingResponse;
        private long underReview;
        private long resolved;
        private long escalated;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DisputeActionRequest {
        private String response;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReversalRequest {
        private String reasonCategory;
        private String subReason;
        private String notes;
        private String requestedSettlement;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReversalPreview {
        private Long transactionId;
        private String transactionRef;
        private BigDecimal originalAmount;
        private String originalAccountNumber;
        private String originalDirection;
        private String reversalDirection;
        private String customerAccountNumber;
        private String counterpartyAccountNumber;
        private String glDebitAccount;
        private String glCreditAccount;
        private String settlementTiming;
        private boolean dualAuthorizationRequired;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReversalResult {
        private String requestRef;
        private String status;
        private String reversalRef;
        private boolean approvalRequired;
        private String approvalRequestCode;
        private String adviceDownloadUrl;
        private String message;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReversalRecord {
        private Long id;
        private String requestRef;
        private Long transactionId;
        private String transactionRef;
        private String accountNumber;
        private String accountName;
        private BigDecimal amount;
        private String currencyCode;
        private String reasonCategory;
        private String subReason;
        private String notes;
        private String requestedSettlement;
        private String status;
        private String requestedBy;
        private Instant requestedAt;
        private String approvedBy;
        private Instant approvedAt;
        private String rejectedBy;
        private Instant rejectedAt;
        private String rejectionReason;
        private String reversalRef;
        private String approvalRequestCode;
        private String adviceDownloadUrl;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatementRequest {
        private String accountNumber;
        private LocalDate fromDate;
        private LocalDate toDate;
        private String format;
        private Boolean emailToHolder;
        private String emailAddress;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatementDelivery {
        private String status;
        private String accountNumber;
        private String emailAddress;
        private Instant generatedAt;
        private String message;
    }
}
