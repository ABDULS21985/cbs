package com.cbs.liquidityrisk.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "liquidity_metric") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LiquidityMetric {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate metricDate;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default @Column(name = "hqla_level1") private BigDecimal hqlaLevel1 = BigDecimal.ZERO;
    @Builder.Default @Column(name = "hqla_level2a") private BigDecimal hqlaLevel2a = BigDecimal.ZERO;
    @Builder.Default @Column(name = "hqla_level2b") private BigDecimal hqlaLevel2b = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalHqla = BigDecimal.ZERO;
    @Builder.Default @Column(name = "net_cash_outflows_30d") private BigDecimal netCashOutflows30d = BigDecimal.ZERO;
    private BigDecimal lcrRatio;
    @Builder.Default private BigDecimal availableStableFunding = BigDecimal.ZERO;
    @Builder.Default private BigDecimal requiredStableFunding = BigDecimal.ZERO;
    private BigDecimal nsfrRatio;
    private BigDecimal stressLcrModerate; private BigDecimal stressLcrSevere;
    private Integer survivalDaysModerate; private Integer survivalDaysSevere;
    @Column(name = "top10_depositor_pct") private BigDecimal top10DepositorPct; private BigDecimal wholesaleFundingPct;
    @Builder.Default private BigDecimal lcrLimit = new BigDecimal("100.0");
    @Builder.Default private BigDecimal nsfrLimit = new BigDecimal("100.0");
    @Builder.Default private Boolean lcrBreach = false; @Builder.Default private Boolean nsfrBreach = false;
    @Builder.Default private Instant createdAt = Instant.now();
}
