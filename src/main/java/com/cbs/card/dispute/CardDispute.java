package com.cbs.card.dispute;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "card_dispute", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardDispute {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "dispute_ref", nullable = false, unique = true, length = 30) private String disputeRef;
    @Column(name = "card_id", nullable = false) private Long cardId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "account_id", nullable = false) private Long accountId;
    @Column(name = "transaction_id") private Long transactionId;
    @Column(name = "transaction_ref", length = 50) private String transactionRef;
    @Column(name = "transaction_date", nullable = false) private LocalDate transactionDate;
    @Column(name = "transaction_amount", nullable = false, precision = 18, scale = 2) private BigDecimal transactionAmount;
    @Column(name = "transaction_currency", nullable = false, length = 3) private String transactionCurrency;
    @Column(name = "merchant_name", length = 200) private String merchantName;
    @Column(name = "merchant_id", length = 30) private String merchantId;

    @Column(name = "dispute_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING) private DisputeType disputeType;

    @Column(name = "dispute_reason", nullable = false, columnDefinition = "TEXT") private String disputeReason;
    @Column(name = "dispute_amount", nullable = false, precision = 18, scale = 2) private BigDecimal disputeAmount;
    @Column(name = "dispute_currency", nullable = false, length = 3) private String disputeCurrency;
    @Column(name = "card_scheme", nullable = false, length = 20) private String cardScheme;
    @Column(name = "scheme_case_id", length = 50) private String schemeCaseId;
    @Column(name = "scheme_reason_code", length = 10) private String schemeReasonCode;

    // SLA deadlines
    @Column(name = "filing_deadline", nullable = false) private LocalDate filingDeadline;
    @Column(name = "response_deadline") private LocalDate responseDeadline;
    @Column(name = "arbitration_deadline") private LocalDate arbitrationDeadline;
    @Column(name = "is_sla_breached", nullable = false) @Builder.Default private Boolean isSlaBreached = false;

    // Provisional credit
    @Column(name = "provisional_credit_amount", precision = 18, scale = 2) private BigDecimal provisionalCreditAmount;
    @Column(name = "provisional_credit_date") private LocalDate provisionalCreditDate;
    @Column(name = "provisional_credit_reversed", nullable = false) @Builder.Default private Boolean provisionalCreditReversed = false;

    // Evidence
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "evidence_documents", columnDefinition = "jsonb")
    @Builder.Default private List<String> evidenceDocuments = new ArrayList<>();

    @Column(name = "merchant_response", columnDefinition = "TEXT") private String merchantResponse;
    @Column(name = "merchant_response_date") private LocalDate merchantResponseDate;

    // Resolution
    @Column(name = "resolution_type", length = 20) private String resolutionType;
    @Column(name = "resolution_amount", precision = 18, scale = 2) private BigDecimal resolutionAmount;
    @Column(name = "resolution_date") private LocalDate resolutionDate;
    @Column(name = "resolution_notes", columnDefinition = "TEXT") private String resolutionNotes;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING) @Builder.Default private DisputeStatus status = DisputeStatus.INITIATED;

    @Column(name = "assigned_to", length = 100) private String assignedTo;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Column(name = "updated_by", length = 100) private String updatedBy;
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<DisputeTimeline> timeline = new ArrayList<>();

    public void addTimelineEntry(String action, DisputeStatus fromStatus, DisputeStatus toStatus, String performedBy, String notes) {
        DisputeTimeline entry = DisputeTimeline.builder()
                .dispute(this).action(action)
                .fromStatus(fromStatus != null ? fromStatus.name() : null)
                .toStatus(toStatus.name()).performedBy(performedBy).notes(notes).build();
        timeline.add(entry);
    }

    public boolean isSlaPastDue() {
        return filingDeadline != null && LocalDate.now().isAfter(filingDeadline) &&
                (status == DisputeStatus.INITIATED || status == DisputeStatus.INVESTIGATION);
    }
}
