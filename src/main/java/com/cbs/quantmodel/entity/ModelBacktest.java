package com.cbs.quantmodel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "model_backtest")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ModelBacktest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String backtestRef;

    @Column(nullable = false)
    private Long modelId;

    @Column(nullable = false, length = 20)
    private String backtestType;

    @Column(nullable = false)
    private LocalDate testPeriodStart;

    @Column(nullable = false)
    private LocalDate testPeriodEnd;

    @Column(nullable = false)
    private Integer sampleSize;

    private BigDecimal predictedDefaultRate;
    private BigDecimal actualDefaultRate;
    private BigDecimal accuracyPct;
    private BigDecimal aucRoc;
    private BigDecimal giniCoefficient;
    private BigDecimal ksStatistic;

    @Column(name = "var_95_pct")
    private BigDecimal var95Pct;

    @Column(name = "var_99_pct")
    private BigDecimal var99Pct;

    @Builder.Default
    private Integer breachCount = 0;

    @Builder.Default
    private BigDecimal breachPct = BigDecimal.ZERO;

    @Column(nullable = false, length = 15)
    private String resultStatus;

    private String findings;
    private String recommendations;

    @Column(nullable = false)
    @Builder.Default
    private Instant runAt = Instant.now();

    @Builder.Default
    private Instant createdAt = Instant.now();
}
