package com.cbs.tradingbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "trading_book_snapshot", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TradingBookSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "snapshot_type", nullable = false, length = 10)
    private String snapshotType;

    @Column(name = "position_count")
    private Integer positionCount;

    @Column(name = "gross_position_value", precision = 20, scale = 4)
    private BigDecimal grossPositionValue;

    @Column(name = "net_position_value", precision = 20, scale = 4)
    private BigDecimal netPositionValue;

    @Column(name = "realized_pnl", precision = 20, scale = 4)
    private BigDecimal realizedPnl;

    @Column(name = "unrealized_pnl", precision = 20, scale = 4)
    private BigDecimal unrealizedPnl;

    @Column(name = "total_pnl", precision = 20, scale = 4)
    private BigDecimal totalPnl;

    @Column(name = "var95_1d", precision = 20, scale = 4)
    private BigDecimal var951d;

    @Column(name = "var99_1d", precision = 20, scale = 4)
    private BigDecimal var991d;

    @Column(name = "expected_shortfall", precision = 20, scale = 4)
    private BigDecimal expectedShortfall;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "greeks", columnDefinition = "jsonb")
    private Map<String, Object> greeks;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "concentration_by_instrument", columnDefinition = "jsonb")
    private Map<String, Object> concentrationByInstrument;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "concentration_by_currency", columnDefinition = "jsonb")
    private Map<String, Object> concentrationByCurrency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "concentration_by_counterparty", columnDefinition = "jsonb")
    private Map<String, Object> concentrationByCounterparty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "limit_breaches", columnDefinition = "jsonb")
    private Map<String, Object> limitBreaches;

    @Column(name = "capital_charge", precision = 20, scale = 4)
    private BigDecimal capitalCharge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
