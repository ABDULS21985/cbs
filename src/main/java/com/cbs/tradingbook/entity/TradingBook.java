package com.cbs.tradingbook.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "trading_book", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TradingBook extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "book_code", nullable = false, unique = true, length = 20)
    private String bookCode;

    @Column(name = "book_name", nullable = false, length = 200)
    private String bookName;

    @Column(name = "book_type", nullable = false, length = 20)
    private String bookType;

    @Column(name = "desk_id")
    private Long deskId;

    @Column(name = "base_currency", nullable = false, length = 3)
    private String baseCurrency;

    @Column(name = "regulatory_classification", nullable = false, length = 20)
    private String regulatoryClassification;

    @Column(name = "position_count")
    private Integer positionCount;

    @Column(name = "gross_position_value", precision = 20, scale = 4)
    private BigDecimal grossPositionValue;

    @Column(name = "net_position_value", precision = 20, scale = 4)
    private BigDecimal netPositionValue;

    @Column(name = "daily_pnl", precision = 20, scale = 4)
    private BigDecimal dailyPnl;

    @Column(name = "mtd_pnl", precision = 20, scale = 4)
    private BigDecimal mtdPnl;

    @Column(name = "ytd_pnl", precision = 20, scale = 4)
    private BigDecimal ytdPnl;

    @Column(name = "var_amount", precision = 20, scale = 4)
    private BigDecimal varAmount;

    @Column(name = "var_limit", precision = 20, scale = 4)
    private BigDecimal varLimit;

    @Column(name = "var_utilization_pct", precision = 5, scale = 2)
    private BigDecimal varUtilizationPct;

    @Column(name = "stress_test_loss", precision = 20, scale = 4)
    private BigDecimal stressTestLoss;

    @Column(name = "capital_requirement", precision = 20, scale = 4)
    private BigDecimal capitalRequirement;

    @Column(name = "last_valuation_at")
    private Instant lastValuationAt;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
