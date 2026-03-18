package com.cbs.treasuryanalytics.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "treasury_analytics_snapshot") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TreasuryAnalyticsSnapshot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate snapshotDate;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    private BigDecimal totalDeposits;
    private BigDecimal totalBorrowings;
    private BigDecimal costOfFundsPct;
    private Integer weightedAvgTenorDays;
    private BigDecimal totalEarningAssets;
    private BigDecimal yieldOnAssetsPct;
    private BigDecimal netInterestMarginPct;
    private BigDecimal interestSpreadPct;
    private BigDecimal loanToDepositRatio;
    private BigDecimal capitalAdequacyRatio;
    @Column(name = "tier1_ratio") private BigDecimal tier1Ratio;
    private BigDecimal leverageRatio;
    private BigDecimal returnOnAssetsPct;
    private BigDecimal returnOnEquityPct;
    @Builder.Default private Instant createdAt = Instant.now();
}
