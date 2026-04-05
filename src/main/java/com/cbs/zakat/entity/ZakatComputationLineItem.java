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

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "zakat_computation_line_item", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ZakatComputationLineItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "computation_id", nullable = false)
    private UUID computationId;

    @Column(name = "line_number", nullable = false, length = 20)
    private String lineNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private ZakatDomainEnums.ZakatClassification category;

    @Column(name = "sub_category", length = 80)
    private String subCategory;

    @Column(name = "description", length = 250)
    private String description;

    @Column(name = "description_ar", length = 250)
    private String descriptionAr;

    @Column(name = "gl_account_code", length = 40)
    private String glAccountCode;

    @Column(name = "amount", precision = 22, scale = 2)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "is_included_in_base", nullable = false)
    @Builder.Default
    private boolean includedInBase = true;

    @Column(name = "exclusion_reason", columnDefinition = "TEXT")
    private String exclusionReason;

    @Column(name = "classification_rule", length = 80)
    private String classificationRule;

    @Column(name = "manual_override", nullable = false)
    @Builder.Default
    private boolean manualOverride = false;

    @Column(name = "override_by", length = 100)
    private String overrideBy;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;
}