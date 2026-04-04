package com.cbs.profitdistribution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "distribution_reserve_transaction", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistributionReserveTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "distribution_run_id", nullable = false)
    private Long distributionRunId;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reserve_type", nullable = false, length = 10)
    private DistributionReserveType reserveType;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 20)
    private ReserveTransactionType transactionType;

    @Column(name = "amount", nullable = false, precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 18, scale = 4)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 18, scale = 4)
    private BigDecimal balanceAfter;

    @Column(name = "trigger_reason", columnDefinition = "TEXT")
    private String triggerReason;

    @Column(name = "per_transaction_id")
    private Long perTransactionId;

    @Column(name = "irr_transaction_id")
    private Long irrTransactionId;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "amount_before_reserve", precision = 18, scale = 4)
    private BigDecimal amountBeforeReserve;

    @Column(name = "amount_after_reserve", precision = 18, scale = 4)
    private BigDecimal amountAfterReserve;

    @Column(name = "effective_rate_before", precision = 8, scale = 4)
    private BigDecimal effectiveRateBefore;

    @Column(name = "effective_rate_after", precision = 8, scale = 4)
    private BigDecimal effectiveRateAfter;

    @Builder.Default
    @Column(name = "processed_at")
    private LocalDateTime processedAt = LocalDateTime.now();

    @Column(name = "processed_by", length = 100)
    private String processedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
