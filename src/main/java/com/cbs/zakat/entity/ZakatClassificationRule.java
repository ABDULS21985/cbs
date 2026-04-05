package com.cbs.zakat.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.gl.entity.IslamicAccountCategory;
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

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "zakat_classification_rule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ZakatClassificationRule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rule_code", nullable = false, unique = true, length = 80)
    private String ruleCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Column(name = "methodology_code", nullable = false, length = 80)
    private String methodologyCode;

    @Column(name = "gl_account_pattern", nullable = false, length = 80)
    private String glAccountPattern;

    @Enumerated(EnumType.STRING)
    @Column(name = "islamic_account_category", length = 80)
    private IslamicAccountCategory islamicAccountCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "zakat_classification", nullable = false, length = 40)
    private ZakatDomainEnums.ZakatClassification zakatClassification;

    @Column(name = "sub_category", length = 80)
    private String subCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "valuation_method", nullable = false, length = 30)
    private ZakatDomainEnums.ValuationMethod valuationMethod;

    @Column(name = "deduct_provisions", nullable = false)
    @Builder.Default
    private boolean deductProvisions = false;

    @Column(name = "deduct_deferred_profit", nullable = false)
    @Builder.Default
    private boolean deductDeferredProfit = false;

    @Column(name = "shariah_basis", columnDefinition = "TEXT")
    private String shariahBasis;

    @Column(name = "zatca_article_ref", length = 120)
    private String zatcaArticleRef;

    @Column(name = "is_debated", nullable = false)
    @Builder.Default
    private boolean debated = false;

    @Column(name = "alternative_classification", columnDefinition = "TEXT")
    private String alternativeClassification;

    @Column(name = "approved_by_ssb", nullable = false)
    @Builder.Default
    private boolean approvedBySsb = false;

    @Column(name = "ssb_approval_ref", length = 120)
    private String ssbApprovalRef;

    @Column(name = "approved_by_zatca")
    private Boolean approvedByZatca;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ZakatDomainEnums.RuleStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}