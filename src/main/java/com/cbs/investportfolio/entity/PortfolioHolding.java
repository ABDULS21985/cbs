package com.cbs.investportfolio.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "portfolio_holding")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PortfolioHolding {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long portfolioId;

    private Long instrumentId;

    @Column(nullable = false, length = 30)
    private String instrumentCode;

    @Column(nullable = false, length = 300)
    private String instrumentName;

    @Column(nullable = false, length = 20)
    private String assetClass;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private BigDecimal avgCostPrice;

    private BigDecimal currentPrice;
    private BigDecimal marketValue;
    private BigDecimal costBasis;
    private BigDecimal unrealizedGainLoss;
    private BigDecimal weightPct;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    private Instant lastPricedAt;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
