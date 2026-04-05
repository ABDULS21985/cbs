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

import java.time.LocalDateTime;

@Entity
@Table(name = "shariah_compliance_alert", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahComplianceAlert extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_ref", nullable = false, unique = true, length = 50)
    private String alertRef;

    @Column(name = "screening_result_id")
    private Long screeningResultId;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "contract_ref", length = 100)
    private String contractRef;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 30)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private ScreeningSeverity severity;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Column(name = "rule_code", length = 50)
    private String ruleCode;

    @Column(name = "matched_value", length = 200)
    private String matchedValue;

    @Column(name = "expected_value", length = 200)
    private String expectedValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AlertStatus status;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "resolution", columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "resolution_ar", columnDefinition = "TEXT")
    private String resolutionAr;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "escalated_to", length = 100)
    private String escalatedTo;

    @Column(name = "escalated_at")
    private LocalDateTime escalatedAt;

    @Column(name = "escalation_reason", length = 1000)
    private String escalationReason;

    @Column(name = "generated_snci_record", nullable = false)
    private boolean generatedSnciRecord;

    @Column(name = "snci_record_id")
    private Long snciRecordId;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "sla_breach", nullable = false)
    private boolean slaBreach;

    @Column(name = "tenant_id")
    private Long tenantId;
}
