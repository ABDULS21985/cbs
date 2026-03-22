package com.cbs.fraud.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Entity @Table(name = "fraud_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "rule_code", nullable = false, unique = true, length = 30) private String ruleCode;
    @Column(name = "rule_name", nullable = false, length = 200) private String ruleName;
    @Column(name = "rule_category", nullable = false, length = 30) private String ruleCategory;
    @Column(name = "description", columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "rule_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> ruleConfig = new HashMap<>();
    @Column(name = "severity", nullable = false, length = 10) @Builder.Default private String severity = "MEDIUM";
    @Column(name = "score_weight", nullable = false) @Builder.Default private Integer scoreWeight = 10;
    @JsonIgnore
    @Column(name = "applicable_channels", length = 200) @Builder.Default private String applicableChannels = "ALL";
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    @JsonProperty("applicableChannels")
    public List<String> getApplicableChannelsList() {
        if (applicableChannels == null || applicableChannels.isBlank()) return List.of("ALL");
        return List.of(applicableChannels.split(","));
    }

    @JsonProperty("applicableChannels")
    public void setApplicableChannelsList(Object value) {
        if (value instanceof List<?> list) {
            this.applicableChannels = list.stream().map(Object::toString).collect(Collectors.joining(","));
        } else if (value instanceof String s) {
            this.applicableChannels = s;
        }
    }
}
