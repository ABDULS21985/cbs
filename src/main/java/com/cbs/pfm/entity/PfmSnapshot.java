package com.cbs.pfm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity @Table(name = "pfm_snapshot")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PfmSnapshot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private LocalDate snapshotDate;
    @Column(nullable = false, length = 15) @Builder.Default private String snapshotType = "MONTHLY";
    @Builder.Default private BigDecimal totalIncome = BigDecimal.ZERO;
    private BigDecimal salaryIncome;
    private BigDecimal investmentIncome;
    private BigDecimal otherIncome;
    @Builder.Default private BigDecimal totalExpenses = BigDecimal.ZERO;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> expenseBreakdown;
    private BigDecimal savingsRate;
    private BigDecimal netWorth;
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private Integer financialHealthScore;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> healthFactors;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> insights;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private Instant createdAt = Instant.now();
}
