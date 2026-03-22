package com.cbs.aml.entity;

import com.cbs.common.audit.AuditableEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "aml_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
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

    @JsonIgnore
    @Column(name = "applicable_customer_types", length = 200)
    @Builder.Default private String applicableCustomerTypes = "ALL";

    @JsonIgnore
    @Column(name = "applicable_channels", length = 200)
    @Builder.Default private String applicableChannels = "ALL";

    @Column(name = "is_active", nullable = false)
    @Builder.Default private Boolean isActive = true;

    // ── Virtual JSON array fields — split comma-separated strings to arrays ────

    @JsonProperty("applicableCustomerTypes")
    public List<String> getApplicableCustomerTypesList() {
        if (applicableCustomerTypes == null || applicableCustomerTypes.isBlank()) return List.of("ALL");
        return List.of(applicableCustomerTypes.split(","));
    }

    @JsonProperty("applicableChannels")
    public List<String> getApplicableChannelsList() {
        if (applicableChannels == null || applicableChannels.isBlank()) return List.of("ALL");
        return List.of(applicableChannels.split(","));
    }

    /** Accept arrays from incoming requests and store as comma-separated strings. */
    @JsonProperty("applicableCustomerTypes")
    public void setApplicableCustomerTypesList(Object value) {
        if (value instanceof List<?> list) {
            this.applicableCustomerTypes = list.stream().map(Object::toString)
                    .collect(java.util.stream.Collectors.joining(","));
        } else if (value instanceof String s) {
            this.applicableCustomerTypes = s;
        }
    }

    @JsonProperty("applicableChannels")
    public void setApplicableChannelsList(Object value) {
        if (value instanceof List<?> list) {
            this.applicableChannels = list.stream().map(Object::toString)
                    .collect(java.util.stream.Collectors.joining(","));
        } else if (value instanceof String s) {
            this.applicableChannels = s;
        }
    }
}
