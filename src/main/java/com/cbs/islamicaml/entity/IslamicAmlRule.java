package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_aml_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IslamicAmlRule extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_aml_rule_id")
    private Long baseAmlRuleId;

    @Column(name = "rule_code", nullable = false, unique = true, length = 50)
    private String ruleCode;

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private IslamicAmlRuleCategory category;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "islamic_product_context", columnDefinition = "jsonb")
    private List<String> islamicProductContext;

    @Column(name = "detection_method", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private DetectionMethod detectionMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_parameters", columnDefinition = "jsonb")
    private Map<String, Object> ruleParameters;

    @Column(name = "lookback_period_days", nullable = false)
    @Builder.Default private int lookbackPeriodDays = 90;

    @Column(name = "minimum_occurrences", nullable = false)
    @Builder.Default private int minimumOccurrences = 1;

    @Column(name = "alert_severity", nullable = false, length = 10)
    @Builder.Default private String alertSeverity = "MEDIUM";

    @Column(name = "alert_action", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default private AmlAlertAction alertAction = AmlAlertAction.GENERATE_ALERT;

    @Column(name = "escalation_level", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default private EscalationLevel escalationLevel = EscalationLevel.COMPLIANCE_OFFICER;

    @Column(name = "fatf_typology", length = 200)
    private String fatfTypology;

    @Column(name = "gcc_guideline_ref", length = 200)
    private String gccGuidelineRef;

    @Column(name = "enabled", nullable = false)
    @Builder.Default private boolean enabled = true;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "priority", nullable = false)
    @Builder.Default private int priority = 100;

    @Column(name = "tenant_id")
    private Long tenantId;
}
