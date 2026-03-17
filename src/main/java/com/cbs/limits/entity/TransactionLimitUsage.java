package com.cbs.limits.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "transaction_limit_usage", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id","limit_type","usage_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionLimitUsage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "limit_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private LimitType limitType;

    @Column(name = "usage_date", nullable = false)
    @Builder.Default
    private LocalDate usageDate = LocalDate.now();

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "total_count", nullable = false)
    @Builder.Default
    private Integer totalCount = 0;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "last_updated", nullable = false)
    @Builder.Default
    private Instant lastUpdated = Instant.now();

    public void addUsage(BigDecimal amount) {
        this.totalAmount = this.totalAmount.add(amount);
        this.totalCount++;
        this.lastUpdated = Instant.now();
    }
}
