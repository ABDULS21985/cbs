package com.cbs.econcapital.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "economic_capital") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EconomicCapital {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate calcDate;
    @Column(nullable = false, length = 20) private String riskType;
    @Builder.Default private BigDecimal confidenceLevel = new BigDecimal("99.90");
    @Builder.Default private Integer timeHorizonDays = 365;
    private BigDecimal regulatoryCapital;
    @Column(nullable = false) private BigDecimal economicCapital;
    private BigDecimal availableCapital; private BigDecimal capitalSurplusDeficit;
    private BigDecimal expectedLoss; private BigDecimal unexpectedLoss; private BigDecimal stressCapitalAddOn;
    private String businessUnit; private BigDecimal allocatedCapital; private BigDecimal rarocPct;
    @Builder.Default private Instant createdAt = Instant.now();
}
