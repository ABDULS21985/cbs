package com.cbs.productfactory.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "islamic_contract_types", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicContractType extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private IslamicDomainEnums.ContractCategory category;

    @Column(name = "shariah_basis", columnDefinition = "TEXT")
    private String shariahBasis;

    @Column(name = "shariah_basis_ar", columnDefinition = "TEXT")
    private String shariahBasisAr;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_product_fields", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> requiredProductFields = new ArrayList<>();

    @Column(name = "shariah_rule_group_code", length = 120)
    private String shariahRuleGroupCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_shariah_principles", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> keyShariahPrinciples = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_shariah_principles_ar", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> keyShariahPrinciplesAr = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prohibitions", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> prohibitions = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prohibitions_ar", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> prohibitionsAr = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "accounting_treatment", nullable = false, length = 30)
    private IslamicDomainEnums.AccountingTreatment accountingTreatment;

    @Column(name = "aaoifi_standard", length = 40)
    private String aaoifiStandard;

    @Column(name = "ifsb_standard", length = 40)
    private String ifsbStandard;

    @Column(name = "basel_treatment", columnDefinition = "TEXT")
    private String baselTreatment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_categories", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> applicableCategories = new ArrayList<>();

    @Column(name = "icon_code", length = 60)
    private String iconCode;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 100;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private IslamicDomainEnums.ContractTypeStatus status = IslamicDomainEnums.ContractTypeStatus.ACTIVE;

    @Column(name = "tenant_id")
    private Long tenantId;
}