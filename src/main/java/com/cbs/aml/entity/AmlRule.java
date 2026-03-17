package com.cbs.aml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "aml_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AmlRule extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code", nullable = false, unique = true, length = 30)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false, length = 200)
    private String ruleName;

    @Column(name = "rule_category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private AmlRuleCategory ruleCategory;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "threshold_amount", precision = 18, scale = 2)
    private BigDecimal thresholdAmount;

    @Column(name = "threshold_count")
    private Integer thresholdCount;

    @Column(name = "threshold_period_hours")
    private Integer thresholdPeriodHours;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_config", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> ruleConfig = Map.of();

    @Column(name = "severity", nullable = false, length = 10)
    @Builder.Default private String severity = "MEDIUM";

    @Column(name = "applicable_customer_types", length = 200)
    @Builder.Default private String applicableCustomerTypes = "ALL";

    @Column(name = "applicable_channels", length = 200)
    @Builder.Default private String applicableChannels = "ALL";

    @Column(name = "is_active", nullable = false)
    @Builder.Default private Boolean isActive = true;
}
