package com.cbs.dspm.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "dspm_policy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DspmPolicy extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_code", nullable = false, unique = true, length = 30)
    private String policyCode;

    @Column(name = "policy_name", nullable = false, length = 200)
    private String policyName;

    @Column(name = "policy_type", nullable = false, length = 30)
    @Builder.Default
    private String policyType = "DATA_ACCESS";

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> rule = Map.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_types", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> dataTypes = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applies_to", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> appliesTo = List.of();

    @Column(name = "enforcement_action", nullable = false, length = 30)
    @Builder.Default
    private String enforcementAction = "ALERT";

    @Column(name = "auto_remediate")
    @Builder.Default
    private Boolean autoRemediate = false;

    @Column(name = "violation_count")
    @Builder.Default
    private Integer violationCount = 0;

    @Column(name = "last_triggered_at")
    private Instant lastTriggeredAt;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";
}
