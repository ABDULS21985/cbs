package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "snci_record", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SnciRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snci_ref", nullable = false, unique = true, length = 50)
    private String snciRef;

    @Column(name = "detection_date")
    private LocalDate detectionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "detection_method", nullable = false, length = 30)
    private DetectionMethod detectionMethod;

    @Column(name = "detection_source", length = 200)
    private String detectionSource;

    @Column(name = "source_transaction_ref", length = 100)
    private String sourceTransactionRef;

    @Column(name = "source_contract_ref", length = 100)
    private String sourceContractRef;

    @Column(name = "source_contract_type", length = 30)
    private String sourceContractType;

    @Column(name = "source_account_code", length = 20)
    private String sourceAccountCode;

    @Column(name = "income_type", length = 30)
    private String incomeType;

    @Column(name = "amount", precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "income_date")
    private LocalDate incomeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "non_compliance_type", nullable = false, length = 40)
    private NonComplianceType nonComplianceType;

    @Column(name = "non_compliance_description", columnDefinition = "TEXT")
    private String nonComplianceDescription;

    @Column(name = "non_compliance_description_ar", columnDefinition = "TEXT")
    private String nonComplianceDescriptionAr;

    @Column(name = "shariah_rule_violated", length = 200)
    private String shariahRuleViolated;

    @Column(name = "ssb_ruling_ref", length = 100)
    private String ssbRulingRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "quarantine_status", nullable = false, length = 30)
    private QuarantineStatus quarantineStatus;

    @Column(name = "quarantined_at")
    private LocalDateTime quarantinedAt;

    @Column(name = "quarantine_journal_ref", length = 50)
    private String quarantineJournalRef;

    @Column(name = "quarantine_gl_account", length = 20)
    private String quarantineGlAccount;

    @Column(name = "purification_batch_id")
    private Long purificationBatchId;

    @Column(name = "purified_at")
    private LocalDateTime purifiedAt;

    @Column(name = "purification_journal_ref", length = 50)
    private String purificationJournalRef;

    @Column(name = "charity_recipient", length = 200)
    private String charityRecipient;

    @Column(name = "approved_for_purification_by", length = 100)
    private String approvedForPurificationBy;

    @Column(name = "approved_for_purification_at")
    private LocalDateTime approvedForPurificationAt;

    @Column(name = "disputed_by", length = 100)
    private String disputedBy;

    @Column(name = "dispute_reason", columnDefinition = "TEXT")
    private String disputeReason;

    @Column(name = "dispute_resolved_by", length = 100)
    private String disputeResolvedBy;

    @Column(name = "dispute_resolved_at")
    private LocalDateTime disputeResolvedAt;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "audit_finding_id")
    private Long auditFindingId;

    @Column(name = "tenant_id")
    private Long tenantId;
}
