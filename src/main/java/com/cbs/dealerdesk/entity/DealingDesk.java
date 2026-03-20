package com.cbs.dealerdesk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "dealing_desk", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DealingDesk extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "desk_code", nullable = false, unique = true, length = 20)
    private String deskCode;

    @Column(name = "desk_name", nullable = false, length = 200)
    private String deskName;

    @Column(name = "desk_type", nullable = false, length = 20)
    private String deskType;

    @Column(name = "head_dealer_name", length = 200)
    private String headDealerName;

    @Column(name = "head_dealer_employee_id", length = 80)
    private String headDealerEmployeeId;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "timezone", length = 40)
    private String timezone;

    @Column(name = "trading_hours_start")
    private LocalTime tradingHoursStart;

    @Column(name = "trading_hours_end")
    private LocalTime tradingHoursEnd;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trading_days", columnDefinition = "jsonb")
    private List<String> tradingDays;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_instruments", columnDefinition = "jsonb")
    private List<String> supportedInstruments;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_currencies", columnDefinition = "jsonb")
    private List<String> supportedCurrencies;

    @Column(name = "max_open_position_limit", precision = 20, scale = 4)
    private BigDecimal maxOpenPositionLimit;

    @Column(name = "max_single_trade_limit", precision = 20, scale = 4)
    private BigDecimal maxSingleTradeLimit;

    @Column(name = "daily_var_limit", precision = 20, scale = 4)
    private BigDecimal dailyVarLimit;

    @Column(name = "stop_loss_limit", precision = 20, scale = 4)
    private BigDecimal stopLossLimit;

    @Column(name = "pnl_currency", length = 3)
    private String pnlCurrency;

    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    @Column(name = "suspended_by", length = 100)
    private String suspendedBy;

    @Column(name = "suspended_at")
    private Instant suspendedAt;

    @Column(name = "activated_by", length = 100)
    private String activatedBy;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
