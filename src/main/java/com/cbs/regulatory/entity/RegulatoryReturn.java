package com.cbs.regulatory.entity;

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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "regulatory_returns", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RegulatoryReturn extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_ref", nullable = false, unique = true, length = 100)
    private String returnRef;

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    @Column(name = "template_code", nullable = false, length = 80)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "jurisdiction", nullable = false, length = 20)
    private RegulatoryDomainEnums.Jurisdiction jurisdiction;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_type", nullable = false, length = 40)
    private RegulatoryDomainEnums.ReturnType returnType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reporting_period_type", nullable = false, length = 20)
    private RegulatoryDomainEnums.ReportingPeriodType reportingPeriodType;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "reporting_date", nullable = false)
    private LocalDate reportingDate;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_extraction_status", nullable = false, length = 20)
    private RegulatoryDomainEnums.DataExtractionStatus dataExtractionStatus;

    @Column(name = "data_extracted_at")
    private LocalDateTime dataExtractedAt;

    @Column(name = "data_extracted_by", length = 100)
    private String dataExtractedBy;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extraction_errors", columnDefinition = "jsonb")
    private Map<String, Object> extractionErrors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "return_data", columnDefinition = "jsonb")
    private Map<String, Object> returnData;

    @Column(name = "return_data_version", nullable = false)
    @Builder.Default
    private Integer returnDataVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private RegulatoryDomainEnums.ReturnValidationStatus validationStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_errors", columnDefinition = "jsonb")
    private Map<String, Object> validationErrors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_warnings", columnDefinition = "jsonb")
    private Map<String, Object> validationWarnings;

    @Enumerated(EnumType.STRING)
    @Column(name = "cross_validation_status", length = 20)
    private RegulatoryDomainEnums.CrossValidationStatus crossValidationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RegulatoryDomainEnums.ReturnStatus status;

    @Column(name = "generated_by", length = 100)
    private String generatedBy;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_method", length = 20)
    private RegulatoryDomainEnums.SubmissionMethod submissionMethod;

    @Column(name = "regulator_reference_number", length = 120)
    private String regulatorReferenceNumber;

    @Column(name = "regulator_acknowledged_at")
    private LocalDateTime regulatorAcknowledgedAt;

    @Column(name = "regulator_feedback", columnDefinition = "TEXT")
    private String regulatorFeedback;

    @Column(name = "filing_deadline", nullable = false)
    private LocalDate filingDeadline;

    @Column(name = "deadline_breach", nullable = false)
    @Builder.Default
    private Boolean deadlineBreach = false;

    @Column(name = "is_amendment", nullable = false)
    @Builder.Default
    private Boolean isAmendment = false;

    @Column(name = "original_return_id")
    private Long originalReturnId;

    @Column(name = "amendment_reason", columnDefinition = "TEXT")
    private String amendmentReason;

    @Column(name = "previous_period_return_id")
    private Long previousPeriodReturnId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variance_from_previous", columnDefinition = "jsonb")
    private Map<String, Object> varianceFromPrevious;

    @Column(name = "tenant_id")
    private Long tenantId;
}
