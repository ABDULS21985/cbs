package com.cbs.traderposition.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "trader_position_limit", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TraderPositionLimit extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dealer_id", nullable = false, length = 80)
    private String dealerId;

    @Column(name = "limit_type", nullable = false, length = 20)
    private String limitType;

    @Column(name = "instrument_type", length = 20)
    private String instrumentType;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "limit_amount", nullable = false, precision = 20, scale = 4)
    private BigDecimal limitAmount;

    @Column(name = "warning_threshold_pct", precision = 5, scale = 2)
    private BigDecimal warningThresholdPct;

    @Column(name = "current_utilization", precision = 20, scale = 4)
    private BigDecimal currentUtilization;

    @Column(name = "utilization_pct", precision = 5, scale = 2)
    private BigDecimal utilizationPct;

    @Column(name = "last_breach_date")
    private LocalDate lastBreachDate;

    @Column(name = "breach_count")
    private Integer breachCount;

    @Column(name = "approved_by", length = 80)
    private String approvedBy;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
