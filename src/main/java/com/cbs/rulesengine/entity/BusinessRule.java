package com.cbs.rulesengine.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "business_rule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BusinessRule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code", nullable = false, length = 100)
    private String ruleCode;

    @Column(name = "name", nullable = false, length = 500)
    private String name;

    @Column(name = "name_ar", length = 500)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private BusinessRuleCategory category;

    @Column(name = "sub_category", length = 120)
    private String subCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 20)
    private BusinessRuleType ruleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private RuleSeverity severity;

    @Column(name = "evaluation_expression", columnDefinition = "TEXT")
    private String evaluationExpression;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parameters", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> parameters = new java.util.LinkedHashMap<>();

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "error_message_ar", length = 500)
    private String errorMessageAr;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_products", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> applicableProducts = new java.util.ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_modules", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> applicableModules = new java.util.ArrayList<>();

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BusinessRuleStatus status = BusinessRuleStatus.DRAFT;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Column(name = "shariah_board_resolution", length = 150)
    private String shariahBoardResolution;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
