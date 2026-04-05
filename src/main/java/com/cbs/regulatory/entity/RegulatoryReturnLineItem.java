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

import java.math.BigDecimal;

@Entity
@Table(name = "regulatory_return_line_items", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RegulatoryReturnLineItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_id", nullable = false)
    private Long returnId;

    @Column(name = "line_number", nullable = false, length = 40)
    private String lineNumber;

    @Column(name = "section_code", length = 40)
    private String sectionCode;

    @Column(name = "line_description", nullable = false, length = 255)
    private String lineDescription;

    @Column(name = "line_description_ar", length = 255)
    private String lineDescriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    private RegulatoryDomainEnums.ReturnLineDataType dataType;

    @Column(name = "line_value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "previous_period_value", columnDefinition = "TEXT")
    private String previousPeriodValue;

    @Column(name = "variance", columnDefinition = "TEXT")
    private String variance;

    @Column(name = "variance_percentage", precision = 18, scale = 6)
    private BigDecimal variancePercentage;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 20)
    private RegulatoryDomainEnums.ReturnSourceType sourceType;

    @Column(name = "source_gl_account_code", length = 120)
    private String sourceGlAccountCode;

    @Column(name = "source_query", columnDefinition = "TEXT")
    private String sourceQuery;

    @Column(name = "calculation_formula", columnDefinition = "TEXT")
    private String calculationFormula;

    @Column(name = "manual_override", nullable = false)
    @Builder.Default
    private Boolean manualOverride = false;

    @Column(name = "manual_override_by", length = 100)
    private String manualOverrideBy;

    @Column(name = "manual_override_reason", columnDefinition = "TEXT")
    private String manualOverrideReason;

    @Column(name = "is_valid", nullable = false)
    @Builder.Default
    private Boolean isValid = true;

    @Column(name = "validation_message", columnDefinition = "TEXT")
    private String validationMessage;
}
