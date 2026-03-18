package com.cbs.marketrisk.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "market_risk_position") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketRiskPosition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate positionDate;
    @Column(nullable = false, length = 20) private String riskType;
    @Column(nullable = false, length = 60) private String portfolio;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(name = "var_1d_95") private BigDecimal var1d95; @Column(name = "var_1d_99") private BigDecimal var1d99; @Column(name = "var_10d_99") private BigDecimal var10d99;
    @Builder.Default private String varMethod = "HISTORICAL";
    private BigDecimal stressLossModerate; private BigDecimal stressLossSevere; private String stressScenario;
    private BigDecimal delta; private BigDecimal gamma; private BigDecimal vega; private BigDecimal theta; private BigDecimal rho;
    private BigDecimal varLimit; private BigDecimal varUtilizationPct;
    @Builder.Default private Boolean limitBreach = false;
    private BigDecimal dailyPnl; private BigDecimal mtdPnl; private BigDecimal ytdPnl;
    @Builder.Default private Instant createdAt = Instant.now();
}
