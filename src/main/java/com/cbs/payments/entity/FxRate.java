package com.cbs.payments.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "fx_rate", schema = "cbs", uniqueConstraints =
    @UniqueConstraint(columnNames = {"source_currency","target_currency","rate_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FxRate {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_currency", nullable = false, length = 3)
    private String sourceCurrency;

    @Column(name = "target_currency", nullable = false, length = 3)
    private String targetCurrency;

    @Column(name = "buy_rate", nullable = false, precision = 18, scale = 8)
    private BigDecimal buyRate;

    @Column(name = "sell_rate", nullable = false, precision = 18, scale = 8)
    private BigDecimal sellRate;

    @Column(name = "mid_rate", nullable = false, precision = 18, scale = 8)
    private BigDecimal midRate;

    @Column(name = "rate_date", nullable = false)
    @Builder.Default
    private LocalDate rateDate = LocalDate.now();

    @Column(name = "rate_source", length = 50)
    private String rateSource;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
