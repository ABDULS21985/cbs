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
@Table(name = "shariah_audit_finding", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahAuditFinding extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "finding_ref", nullable = false, unique = true, length = 50)
    private String findingRef;

    @Column(name = "sample_id")
    private Long sampleId;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "title_ar", length = 500)
    private String titleAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private FindingCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private FindingSeverity severity;

    @Column(name = "shariah_rule_violated", length = 200)
    private String shariahRuleViolated;

    @Column(name = "impact", columnDefinition = "TEXT")
    private String impact;

    @Column(name = "impact_ar", columnDefinition = "TEXT")
    private String impactAr;

    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    @Column(name = "recommendation_ar", columnDefinition = "TEXT")
    private String recommendationAr;

    @Column(name = "has_snci_implication", nullable = false)
    private boolean hasSnciImplication;

    @Column(name = "snci_amount", precision = 18, scale = 4)
    private BigDecimal snciAmount;

    @Column(name = "snci_record_id")
    private Long snciRecordId;

    @Enumerated(EnumType.STRING)
    @Column(name = "remediation_status", nullable = false, length = 20)
    private RemediationStatus remediationStatus;

    @Column(name = "remediation_owner", length = 200)
    private String remediationOwner;

    @Column(name = "remediation_due_date")
    private LocalDate remediationDueDate;

    @Column(name = "remediation_completed_date")
    private LocalDate remediationCompletedDate;

    @Column(name = "remediation_notes", columnDefinition = "TEXT")
    private String remediationNotes;

    @Column(name = "remediation_verified_by", length = 100)
    private String remediationVerifiedBy;

    @Column(name = "remediation_verified_at")
    private LocalDateTime remediationVerifiedAt;

    @Column(name = "management_response", columnDefinition = "TEXT")
    private String managementResponse;

    @Column(name = "management_responded_by", length = 100)
    private String managementRespondedBy;

    @Column(name = "management_responded_at")
    private LocalDateTime managementRespondedAt;

    @Column(name = "ssb_accepted", nullable = false)
    private boolean ssbAccepted;

    @Column(name = "tenant_id")
    private Long tenantId;
}
