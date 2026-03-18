package com.cbs.workbench.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "workbench_widget", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class WorkbenchWidget extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "widget_code", nullable = false, unique = true, length = 30)
    private String widgetCode;

    @Column(name = "widget_name", nullable = false)
    private String widgetName;

    @Column(name = "widget_type", length = 25)
    private String widgetType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_workbench_types", columnDefinition = "jsonb")
    private List<String> applicableWorkbenchTypes;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "default_expanded", nullable = false)
    @Builder.Default
    private Boolean defaultExpanded = true;

    @Column(name = "data_source_endpoint", length = 300)
    private String dataSourceEndpoint;

    @Column(name = "refresh_interval_seconds")
    @Builder.Default
    private Integer refreshIntervalSeconds = 60;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = false;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
