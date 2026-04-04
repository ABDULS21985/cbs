package com.cbs.rulesengine.entity;

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
@Table(name = "business_rule_version", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uk_business_rule_version_rule_version",
                columnNames = {"rule_id", "version_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BusinessRuleVersion extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_snapshot", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> ruleSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "decision_table_snapshot", columnDefinition = "jsonb")
    private List<Map<String, Object>> decisionTableSnapshot;

    @Column(name = "change_description", nullable = false, length = 500)
    private String changeDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 20)
    private BusinessRuleVersionChangeType changeType;

    @Column(name = "changed_by", nullable = false, length = 100)
    private String changedBy;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approval_reference", length = 150)
    private String approvalReference;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @Column(name = "tenant_id")
    private Long tenantId;
}
