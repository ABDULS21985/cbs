package com.cbs.workflow.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "workflow_definition", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class WorkflowDefinition extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "workflow_code", nullable = false, unique = true, length = 30) private String workflowCode;
    @Column(name = "workflow_name", nullable = false, length = 100) private String workflowName;
    @Column(name = "entity_type", nullable = false, length = 50) private String entityType;
    @Column(name = "trigger_event", nullable = false, length = 50) private String triggerEvent;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "steps_config", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private List<Map<String, Object>> stepsConfig = new ArrayList<>();

    @Column(name = "auto_approve_below", precision = 18, scale = 2) private BigDecimal autoApproveBelow;
    @Column(name = "sla_hours") private Integer slaHours;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
}
