package com.cbs.dealerdesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "desk_pnl", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeskPnl {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "desk_id", nullable = false)
    private Long deskId;

    @Column(name = "pnl_date", nullable = false)
    private LocalDate pnlDate;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "realized_pnl", precision = 20, scale = 4)
    private BigDecimal realizedPnl;

    @Column(name = "unrealized_pnl", precision = 20, scale = 4)
    private BigDecimal unrealizedPnl;

    @Column(name = "total_pnl", precision = 20, scale = 4)
    private BigDecimal totalPnl;

    @Column(name = "mtd_pnl", precision = 20, scale = 4)
    private BigDecimal mtdPnl;

    @Column(name = "ytd_pnl", precision = 20, scale = 4)
    private BigDecimal ytdPnl;

    @Column(name = "trading_revenue", precision = 20, scale = 4)
    private BigDecimal tradingRevenue;

    @Column(name = "hedging_cost", precision = 20, scale = 4)
    private BigDecimal hedgingCost;

    @Column(name = "funding_cost", precision = 20, scale = 4)
    private BigDecimal fundingCost;

    @Column(name = "position_count")
    private Integer positionCount;

    @Column(name = "trade_count")
    private Integer tradeCount;

    @Column(name = "total_volume", precision = 20, scale = 4)
    private BigDecimal totalVolume;

    @Column(name = "var_utilization_pct", precision = 5, scale = 2)
    private BigDecimal varUtilizationPct;

    @Column(name = "stop_loss_breached")
    private Boolean stopLossBreached;

    @Column(name = "status", nullable = false, length = 15)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
