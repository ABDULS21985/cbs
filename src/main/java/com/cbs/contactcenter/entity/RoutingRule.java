package com.cbs.contactcenter.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "routing_rule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class RoutingRule extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ruleName;

    @Column(length = 20)
    private String ruleType;

    private Integer priority;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> conditions;

    private String targetQueue;

    private String targetSkillGroup;

    private String targetAgentId;

    private Long fallbackRuleId;

    private Integer maxWaitBeforeFallback;

    @Builder.Default
    private Boolean isActive = true;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;
}
