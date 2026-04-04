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

@Entity
@Table(name = "shariah_screening_rule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahScreeningRule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code", nullable = false, unique = true, length = 50)
    private String ruleCode;

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Column(name = "name_ar", length = 300)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ScreeningCategory category;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_transaction_types", columnDefinition = "jsonb")
    private List<String> applicableTransactionTypes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_contract_types", columnDefinition = "jsonb")
    private List<String> applicableContractTypes;

    @Enumerated(EnumType.STRING)
    @Column(name = "screening_point", nullable = false, length = 20)
    private ScreeningPoint screeningPoint;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private ScreeningAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private ScreeningSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 30)
    private ScreeningRuleType ruleType;

    @Column(name = "business_rule_code", length = 100)
    private String businessRuleCode;

    @Column(name = "condition_expression", columnDefinition = "TEXT")
    private String conditionExpression;

    @Column(name = "threshold_field", length = 100)
    private String thresholdField;

    @Enumerated(EnumType.STRING)
    @Column(name = "threshold_operator", length = 20)
    private ThresholdOperator thresholdOperator;

    @Column(name = "threshold_value", precision = 18, scale = 4)
    private BigDecimal thresholdValue;

    @Column(name = "threshold_value_to", precision = 18, scale = 4)
    private BigDecimal thresholdValueTo;

    @Column(name = "reference_list_code", length = 50)
    private String referenceListCode;

    @Column(name = "shariah_reference", length = 200)
    private String shariahReference;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "priority", nullable = false)
    private int priority;

    @Column(name = "tenant_id")
    private Long tenantId;
}
