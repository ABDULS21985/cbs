package com.cbs.bankportfolio.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name = "bank_portfolio") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankPortfolio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String portfolioCode;
    @Column(nullable = false, length = 200) private String portfolioName;
    @Column(nullable = false, length = 20) private String portfolioType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private BigDecimal totalValue = BigDecimal.ZERO;
    @Builder.Default private BigDecimal unrealizedPnl = BigDecimal.ZERO;
    @Builder.Default private BigDecimal realizedPnlYtd = BigDecimal.ZERO;
    private BigDecimal yieldToMaturity; private BigDecimal modifiedDuration; private BigDecimal convexity;
    private Integer creditSpreadBps; private BigDecimal var991d;
    private String benchmark; private Integer trackingErrorBps;
    @Builder.Default private Integer assetCount = 0;
    private Instant lastRebalancedAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant createdAt = Instant.now(); @Builder.Default private Instant updatedAt = Instant.now();
}
