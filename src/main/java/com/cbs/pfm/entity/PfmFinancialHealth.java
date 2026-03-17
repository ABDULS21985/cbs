package com.cbs.pfm.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
@Entity @Table(name = "pfm_financial_health")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PfmFinancialHealth {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private LocalDate assessmentDate;
    @Column(nullable = false) private Integer overallScore;
    private BigDecimal savingsRatio;
    private BigDecimal debtToIncome;
    private BigDecimal emergencyFundMonths;
    private BigDecimal creditUtilization;
    private BigDecimal paymentConsistency;
    private BigDecimal incomeStability;
    private String spendingTrend;
    private String riskLevel;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> recommendations;
    @Builder.Default private Instant createdAt = Instant.now();
}
