package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "alm_stress_test_run", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StressTestRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scenario_id", nullable = false)
    private Long scenarioId;

    @Column(name = "scenario_name", nullable = false, length = 100)
    private String scenarioName;

    @Column(name = "scenario_type", nullable = false, length = 20)
    private String scenarioType;

    @Column(name = "avg_shock_bps", nullable = false)
    @Builder.Default private Integer avgShockBps = 0;

    @Column(name = "nii_impact", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal niiImpact = BigDecimal.ZERO;

    @Column(name = "eve_impact", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal eveImpact = BigDecimal.ZERO;

    @Column(name = "cet1_before", precision = 8, scale = 4)
    private BigDecimal cet1Before;

    @Column(name = "cet1_after", precision = 8, scale = 4)
    private BigDecimal cet1After;

    @Column(name = "breach_count", nullable = false)
    @Builder.Default private Integer breachCount = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_payload", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> resultPayload = new LinkedHashMap<>();

    @Column(name = "run_by", length = 100)
    private String runBy;

    @Column(name = "run_at", nullable = false)
    @Builder.Default private Instant runAt = Instant.now();

    @Column(name = "created_at")
    @Builder.Default private Instant createdAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;
}
