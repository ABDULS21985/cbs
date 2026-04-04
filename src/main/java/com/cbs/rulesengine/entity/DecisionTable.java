package com.cbs.rulesengine.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "decision_table", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DecisionTable extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private BusinessRule rule;

    @Column(name = "table_name", nullable = false, length = 200)
    private String tableName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_columns", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> inputColumns = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_columns", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> outputColumns = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "hit_policy", nullable = false, length = 20)
    @Builder.Default
    private DecisionTableHitPolicy hitPolicy = DecisionTableHitPolicy.FIRST_MATCH;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BusinessRuleStatus status = BusinessRuleStatus.DRAFT;

    @Column(name = "table_version", nullable = false)
    @Builder.Default
    private Integer tableVersion = 1;

    @Column(name = "tenant_id")
    private Long tenantId;
}
