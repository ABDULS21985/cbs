package com.cbs.marketmaking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "market_making_activity", uniqueConstraints = @UniqueConstraint(columnNames = {"mandate_id", "activity_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketMakingActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long mandateId;

    @Column(nullable = false)
    private LocalDate activityDate;

    @Builder.Default
    private Integer quotesPublished = 0;

    @Builder.Default
    private Integer quotesHit = 0;

    private BigDecimal fillRatioPct;
    private BigDecimal avgBidAskSpreadBps;
    private BigDecimal totalVolume;
    private BigDecimal buyVolume;
    private BigDecimal sellVolume;
    private BigDecimal netPosition;

    @Builder.Default
    private BigDecimal realizedPnl = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal unrealizedPnl = BigDecimal.ZERO;

    private BigDecimal inventoryTurnover;
    private BigDecimal quotingUptimePct;

    @Builder.Default
    private Integer spreadViolationCount = 0;

    @Builder.Default
    private Boolean obligationMet = true;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
