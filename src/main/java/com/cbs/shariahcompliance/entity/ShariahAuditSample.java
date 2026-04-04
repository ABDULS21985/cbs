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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "shariah_audit_sample", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahAuditSample extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "sample_number")
    private int sampleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", length = 30)
    private AuditEntityType entityType;

    @Column(name = "entity_ref", length = 100)
    private String entityRef;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    @Column(name = "amount", precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private SampleReviewStatus reviewStatus;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "compliance_result", length = 20)
    private ComplianceResult complianceResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence_collected", columnDefinition = "jsonb")
    private List<Map<String, Object>> evidenceCollected;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "checklist_results", columnDefinition = "jsonb")
    private List<Map<String, Object>> checklistResults;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
