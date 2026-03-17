package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity @Table(name = "dashboard_definition")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardDefinition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String dashboardCode;
    @Column(nullable = false, length = 200) private String dashboardName;
    @Column(nullable = false, length = 30) private String dashboardType;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private Map<String, Object> layoutConfig;
    @Builder.Default private Integer refreshIntervalSec = 300;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> allowedRoles;
    @Builder.Default private Boolean isDefault = false;
    @Builder.Default private Boolean isActive = true;
    private String createdBy;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
