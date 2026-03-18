package com.cbs.workbench.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "workbench_quick_action", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class WorkbenchQuickAction extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_code", nullable = false, unique = true, length = 30)
    private String actionCode;

    @Column(name = "action_name", nullable = false)
    private String actionName;

    @Column(name = "action_category", length = 15)
    private String actionCategory;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_workbench_types", columnDefinition = "jsonb")
    private List<String> applicableWorkbenchTypes;

    @Column(name = "target_endpoint", length = 300)
    private String targetEndpoint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_fields", columnDefinition = "jsonb")
    private List<String> requiredFields;

    @Column(name = "authorization_level", length = 20)
    @Builder.Default
    private String authorizationLevel = "SELF";

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "hotkey", length = 10)
    private String hotkey;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
