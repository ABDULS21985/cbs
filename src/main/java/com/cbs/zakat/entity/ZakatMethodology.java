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

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "zakat_methodology", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ZakatMethodology extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "methodology_code", nullable = false, unique = true, length = 80)
    private String methodologyCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "method_type", nullable = false, length = 30)
    private ZakatDomainEnums.MethodType methodType;

    @Enumerated(EnumType.STRING)
    @Column(name = "zakat_rate_basis", nullable = false, length = 20)
    private ZakatDomainEnums.ZakatRateBasis zakatRateBasis;

    @Enumerated(EnumType.STRING)
    @Column(name = "balance_method", nullable = false, length = 20)
    private ZakatDomainEnums.BalanceMethod balanceMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "nisab_basis", nullable = false, length = 20)
    private ZakatDomainEnums.NisabBasis nisabBasis;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_zakat_deduction_policy", nullable = false, length = 30)
    private ZakatDomainEnums.CustomerZakatDeductionPolicy customerZakatDeductionPolicy;

    @Enumerated(EnumType.STRING)
    @Column(name = "iah_treatment", nullable = false, length = 20)
    private ZakatDomainEnums.IahTreatment iahTreatment;

    @Enumerated(EnumType.STRING)
    @Column(name = "per_irr_treatment", nullable = false, length = 20)
    private ZakatDomainEnums.PerIrrTreatment perIrrTreatment;

    @Column(name = "fatwa_id")
    private Long fatwaId;

    @Column(name = "fatwa_ref", length = 60)
    private String fatwaRef;

    @Column(name = "ssb_approved", nullable = false)
    @Builder.Default
    private boolean ssbApproved = false;

    @Column(name = "ssb_approval_date")
    private LocalDate ssbApprovalDate;

    @Column(name = "ssb_approved_by", length = 100)
    private String ssbApprovedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "ssb_review_frequency", nullable = false, length = 20)
    private ZakatDomainEnums.ReviewFrequency ssbReviewFrequency;

    @Column(name = "next_ssb_review_date")
    private LocalDate nextSsbReviewDate;

    @Column(name = "zatca_accepted")
    private Boolean zatcaAccepted;

    @Column(name = "zatca_acceptance_ref", length = 120)
    private String zatcaAcceptanceRef;

    @Column(name = "classification_rule_set_code", nullable = false, length = 80)
    private String classificationRuleSetCode;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ZakatDomainEnums.MethodologyStatus status;

    @Column(name = "methodology_version", nullable = false)
    @Builder.Default
    private Integer methodologyVersion = 1;

    @Column(name = "tenant_id")
    private Long tenantId;
}