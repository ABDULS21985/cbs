package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "siem_correlation_rule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SiemCorrelationRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 150) private String ruleName;
    @Column(nullable = false, length = 30) private String ruleType;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private Map<String, Object> eventFilter;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private Map<String, Object> conditionExpr;
    @Builder.Default private Integer timeWindowMinutes = 15;
    @Column(nullable = false, length = 10) @Builder.Default private String severityOutput = "HIGH";
    @Column(nullable = false, length = 40) @Builder.Default private String actionOnTrigger = "ALERTED";
    @Builder.Default private Boolean isActive = true;
    private String description;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
