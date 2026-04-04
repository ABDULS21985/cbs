package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_str_sar", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IslamicStrSar extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_sar_id")
    private Long baseSarId;

    @Column(name = "sar_ref", nullable = false, unique = true, length = 50)
    private String sarRef;

    @Column(name = "sar_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SarType sarType;

    @Column(name = "jurisdiction", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SarJurisdiction jurisdiction;

    @Column(name = "template_version", length = 20)
    private String templateVersion;

    @Column(name = "subject_customer_id", nullable = false)
    private Long subjectCustomerId;

    @Column(name = "subject_customer_name", length = 300)
    private String subjectCustomerName;

    @Column(name = "subject_customer_type", length = 20)
    private String subjectCustomerType;

    @Column(name = "subject_national_id", length = 50)
    private String subjectNationalId;

    @Column(name = "subject_passport_number", length = 50)
    private String subjectPassportNumber;

    @Column(name = "subject_nationality", length = 3)
    private String subjectNationality;

    @Column(name = "subject_address", columnDefinition = "TEXT")
    private String subjectAddress;

    @Column(name = "islamic_product_involved", length = 50)
    private String islamicProductInvolved;

    @Column(name = "islamic_contract_ref", length = 100)
    private String islamicContractRef;

    @Column(name = "islamic_typology", length = 200)
    private String islamicTypology;

    @Column(name = "shariah_compliance_alert")
    private Long shariahComplianceAlert;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "suspicious_transactions", columnDefinition = "jsonb")
    private List<Map<String, Object>> suspiciousTransactions;

    @Column(name = "total_suspicious_amount", precision = 18, scale = 4)
    private BigDecimal totalSuspiciousAmount;

    @Column(name = "suspicious_period_from")
    private LocalDate suspiciousPeriodFrom;

    @Column(name = "suspicious_period_to")
    private LocalDate suspiciousPeriodTo;

    @Column(name = "narrative_summary", columnDefinition = "TEXT")
    private String narrativeSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "suspicious_indicators", columnDefinition = "jsonb")
    private List<String> suspiciousIndicators;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default private SarStatus status = SarStatus.DRAFT;

    @Column(name = "prepared_by", length = 100)
    private String preparedBy;

    @Column(name = "prepared_at")
    private LocalDateTime preparedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "mlro_approved_by", length = 100)
    private String mlroApprovedBy;

    @Column(name = "mlro_approved_at")
    private LocalDateTime mlroApprovedAt;

    @Column(name = "filed_at")
    private LocalDateTime filedAt;

    @Column(name = "filed_via", length = 30)
    @Enumerated(EnumType.STRING)
    private SarFilingMethod filedVia;

    @Column(name = "fiu_reference_number", length = 100)
    private String fiuReferenceNumber;

    @Column(name = "fiu_acknowledged_at")
    private LocalDateTime fiuAcknowledgedAt;

    @Column(name = "fiu_response_notes", columnDefinition = "TEXT")
    private String fiuResponseNotes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linked_alert_ids", columnDefinition = "jsonb")
    private List<Long> linkedAlertIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linked_sanctions_result_ids", columnDefinition = "jsonb")
    private List<Long> linkedSanctionsResultIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linked_shariah_alert_ids", columnDefinition = "jsonb")
    private List<Long> linkedShariahAlertIds;

    @Column(name = "filing_deadline", nullable = false)
    private LocalDate filingDeadline;

    @Column(name = "is_urgent", nullable = false)
    @Builder.Default private boolean isUrgent = false;

    @Column(name = "deadline_breach", nullable = false)
    @Builder.Default private boolean deadlineBreach = false;

    @Column(name = "tenant_id")
    private Long tenantId;
}
