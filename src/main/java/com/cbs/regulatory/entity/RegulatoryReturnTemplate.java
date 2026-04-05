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
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "regulatory_return_templates", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RegulatoryReturnTemplate extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, unique = true, length = 80)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "jurisdiction", nullable = false, length = 20)
    private RegulatoryDomainEnums.Jurisdiction jurisdiction;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_type", nullable = false, length = 40)
    private RegulatoryDomainEnums.ReturnType returnType;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "name_ar", length = 255)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sections", columnDefinition = "jsonb")
    private List<Map<String, Object>> sections;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    private List<Map<String, Object>> validationRules;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "cross_validations", columnDefinition = "jsonb")
    private List<Map<String, Object>> crossValidations;

    @Enumerated(EnumType.STRING)
    @Column(name = "output_format", nullable = false, length = 20)
    private RegulatoryDomainEnums.OutputFormat outputFormat;

    @Column(name = "xbrl_taxonomy", length = 150)
    private String xbrlTaxonomy;

    @Enumerated(EnumType.STRING)
    @Column(name = "reporting_frequency", nullable = false, length = 20)
    private RegulatoryDomainEnums.ReportingPeriodType reportingFrequency;

    @Column(name = "filing_deadline_days_after_period", nullable = false)
    private Integer filingDeadlineDaysAfterPeriod;

    @Column(name = "regulator_form_number", length = 80)
    private String regulatorFormNumber;

    @Column(name = "regulator_portal_url", length = 255)
    private String regulatorPortalUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
