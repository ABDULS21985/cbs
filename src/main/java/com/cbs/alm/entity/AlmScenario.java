package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "alm_scenario", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmScenario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "scenario_name", nullable = false, length = 100) private String scenarioName;
    @Column(name = "scenario_type", nullable = false, length = 20) private String scenarioType;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "shift_bps", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> shiftBps = new HashMap<>();
    @Column(name = "description", columnDefinition = "TEXT") private String description;
    @Column(name = "is_regulatory", nullable = false) @Builder.Default private Boolean isRegulatory = false;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
