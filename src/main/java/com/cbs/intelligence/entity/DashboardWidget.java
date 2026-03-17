package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "dashboard_widget")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardWidget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long dashboardId;
    @Column(nullable = false, length = 80) private String widgetCode;
    @Column(nullable = false, length = 30) private String widgetType;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 80) private String dataSource;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> queryConfig;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> displayConfig;
    @Column(name = "position_x") @Builder.Default private Integer positionX = 0;
    @Column(name = "position_y") @Builder.Default private Integer positionY = 0;
    @Builder.Default private Integer width = 4;
    @Builder.Default private Integer height = 3;
    @Column(name = "refresh_override_sec") private Integer refreshOverrideSec;
    @Column(name = "is_active") @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
