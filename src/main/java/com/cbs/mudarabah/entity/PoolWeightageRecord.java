package com.cbs.mudarabah.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "pool_weightage_record", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoolWeightageRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "mudarabah_account_id", nullable = false)
    private Long mudarabahAccountId;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "closing_balance", nullable = false, precision = 18, scale = 4)
    private BigDecimal closingBalance;

    @Column(name = "daily_product", nullable = false, precision = 18, scale = 4)
    private BigDecimal dailyProduct;

    @Builder.Default
    @Column(name = "cumulative_daily_product", precision = 18, scale = 4)
    private BigDecimal cumulativeDailyProduct = BigDecimal.ZERO;

    @Column(name = "period_start_date", nullable = false)
    private LocalDate periodStartDate;

    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Builder.Default
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
