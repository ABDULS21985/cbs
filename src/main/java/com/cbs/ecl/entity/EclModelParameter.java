package com.cbs.ecl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "ecl_model_parameter", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EclModelParameter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "parameter_name", nullable = false, length = 50) private String parameterName;
    @Column(name = "segment", nullable = false, length = 30) private String segment;
    @Column(name = "stage", nullable = false) private Integer stage;
    @Column(name = "pd_12_month", precision = 8, scale = 6) private BigDecimal pd12Month;
    @Column(name = "pd_lifetime", precision = 8, scale = 6) private BigDecimal pdLifetime;
    @Column(name = "lgd_rate", precision = 8, scale = 6) private BigDecimal lgdRate;
    @Column(name = "ead_ccf", precision = 8, scale = 6) @Builder.Default private BigDecimal eadCcf = BigDecimal.ONE;
    @Column(name = "macro_scenario", length = 20) private String macroScenario;
    @Column(name = "scenario_weight", precision = 5, scale = 4) @Builder.Default private BigDecimal scenarioWeight = new BigDecimal("0.50");
    @Column(name = "macro_adjustment", precision = 8, scale = 6) @Builder.Default private BigDecimal macroAdjustment = BigDecimal.ZERO;
    @Column(name = "effective_date", nullable = false) @Builder.Default private LocalDate effectiveDate = LocalDate.now();
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
