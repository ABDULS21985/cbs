package com.cbs.zakat.entity;

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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "zatca_return", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ZatcaReturn extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "return_ref", nullable = false, unique = true, length = 80)
    private String returnRef;

    @Column(name = "computation_id", nullable = false)
    private UUID computationId;

    @Column(name = "zakat_year", nullable = false)
    private Integer zakatYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_type", nullable = false, length = 30)
    private ZakatDomainEnums.ZatcaReturnType returnType;

    @Enumerated(EnumType.STRING)
    @Column(name = "filing_method", nullable = false, length = 30)
    private ZakatDomainEnums.FilingMethod filingMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "zatca_form_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> zatcaFormData = new LinkedHashMap<>();

    @Column(name = "filing_date")
    private LocalDate filingDate;

    @Column(name = "filing_confirmation_ref", length = 120)
    private String filingConfirmationRef;

    @Column(name = "filed_by", length = 100)
    private String filedBy;

    @Column(name = "assessment_date")
    private LocalDate assessmentDate;

    @Column(name = "assessment_ref", length = 120)
    private String assessmentRef;

    @Column(name = "assessed_zakat_amount", precision = 22, scale = 2)
    private BigDecimal assessedZakatAmount;

    @Column(name = "assessment_difference", precision = 22, scale = 2)
    private BigDecimal assessmentDifference;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_status", length = 20)
    private ZakatDomainEnums.AssessmentStatus assessmentStatus;

    @Column(name = "assessment_notes", columnDefinition = "TEXT")
    private String assessmentNotes;

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "payment_amount", precision = 22, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "payment_ref", length = 120)
    private String paymentRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    private ZakatDomainEnums.PaymentStatus paymentStatus;

    @Column(name = "appeal_filed", nullable = false)
    @Builder.Default
    private boolean appealFiled = false;

    @Column(name = "appeal_date")
    private LocalDate appealDate;

    @Column(name = "appeal_ref", length = 120)
    private String appealRef;

    @Column(name = "appeal_reason", columnDefinition = "TEXT")
    private String appealReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "appeal_outcome", length = 25)
    private ZakatDomainEnums.AppealOutcome appealOutcome;

    @Column(name = "appeal_outcome_date")
    private LocalDate appealOutcomeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ZakatDomainEnums.ZatcaReturnStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}