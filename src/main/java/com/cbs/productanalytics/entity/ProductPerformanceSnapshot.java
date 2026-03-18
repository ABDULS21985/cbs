package com.cbs.productanalytics.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "product_performance_snapshot", uniqueConstraints = @UniqueConstraint(columnNames = {"product_code", "period_type", "period_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProductPerformanceSnapshot extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String snapshotCode;

    @Column(nullable = false, length = 30)
    private String productCode;

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(nullable = false, length = 30)
    private String productFamily;

    @Column(nullable = false, length = 10)
    private String periodType;

    @Column(nullable = false)
    private LocalDate periodDate;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private Integer activeAccounts = 0;

    @Builder.Default
    private Integer newAccountsPeriod = 0;

    @Builder.Default
    private Integer closedAccountsPeriod = 0;

    @Builder.Default
    private BigDecimal totalBalance = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal interestIncome = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal feeIncome = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal costOfFunds = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal operatingCost = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal provisionCharge = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal netMargin = BigDecimal.ZERO;

    private BigDecimal returnOnProductPct;

    private BigDecimal costToIncomePct;

    @Builder.Default
    private BigDecimal nplRatioPct = BigDecimal.ZERO;

    private BigDecimal avgRiskWeightPct;
}
