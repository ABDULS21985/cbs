package com.cbs.traderposition.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "trader_position", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TraderPosition extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_ref", nullable = false, unique = true, length = 30)
    private String positionRef;

    @Column(name = "dealer_id", nullable = false, length = 80)
    private String dealerId;

    @Column(name = "dealer_name", nullable = false, length = 200)
    private String dealerName;

    @Column(name = "desk_id", nullable = false)
    private Long deskId;

    @Column(name = "instrument_type", nullable = false, length = 20)
    private String instrumentType;

    @Column(name = "instrument_code", nullable = false, length = 30)
    private String instrumentCode;

    @Column(name = "instrument_name", length = 300)
    private String instrumentName;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "long_quantity", precision = 20, scale = 6)
    private BigDecimal longQuantity;

    @Column(name = "short_quantity", precision = 20, scale = 6)
    private BigDecimal shortQuantity;

    @Column(name = "net_quantity", precision = 20, scale = 6)
    private BigDecimal netQuantity;

    @Column(name = "avg_cost_long", precision = 20, scale = 8)
    private BigDecimal avgCostLong;

    @Column(name = "avg_cost_short", precision = 20, scale = 8)
    private BigDecimal avgCostShort;

    @Column(name = "market_price", precision = 20, scale = 8)
    private BigDecimal marketPrice;

    @Column(name = "market_value", precision = 20, scale = 4)
    private BigDecimal marketValue;

    @Column(name = "unrealized_pnl", precision = 20, scale = 4)
    private BigDecimal unrealizedPnl;

    @Column(name = "realized_pnl_today", precision = 20, scale = 4)
    private BigDecimal realizedPnlToday;

    @Column(name = "trader_position_limit", precision = 20, scale = 4)
    private BigDecimal traderPositionLimit;

    @Column(name = "limit_utilization_pct", precision = 5, scale = 2)
    private BigDecimal limitUtilizationPct;

    @Column(name = "limit_breached")
    private Boolean limitBreached;

    @Column(name = "position_date", nullable = false)
    private LocalDate positionDate;

    @Column(name = "last_trade_at")
    private Instant lastTradeAt;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
