package com.cbs.profitdistribution.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "pool_profit_calculation", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PoolProfitCalculation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "calculation_ref", nullable = false, unique = true, length = 80)
    private String calculationRef;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", nullable = false, length = 20)
    private PeriodType periodType;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Builder.Default
    @Column(name = "gross_income", precision = 18, scale = 4)
    private BigDecimal grossIncome = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "income_breakdown", columnDefinition = "jsonb")
    private Map<String, BigDecimal> incomeBreakdown;

    @Builder.Default
    @Column(name = "charity_income", precision = 18, scale = 4)
    private BigDecimal charityIncome = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "distributable_gross_income", precision = 18, scale = 4)
    private BigDecimal distributableGrossIncome = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_expenses", precision = 18, scale = 4)
    private BigDecimal totalExpenses = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "expense_breakdown", columnDefinition = "jsonb")
    private Map<String, BigDecimal> expenseBreakdown;

    @Builder.Default
    @Column(name = "net_distributable_profit", precision = 18, scale = 4)
    private BigDecimal netDistributableProfit = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "is_loss", nullable = false)
    private boolean isLoss = false;

    @Column(name = "average_pool_balance", precision = 18, scale = 4)
    private BigDecimal averagePoolBalance;

    @Column(name = "period_days")
    private Integer periodDays;

    @Column(name = "effective_return_rate", precision = 8, scale = 4)
    private BigDecimal effectiveReturnRate;

    @Builder.Default
    @Column(name = "bank_mudarib_share", precision = 18, scale = 4)
    private BigDecimal bankMudaribShare = BigDecimal.ZERO;

    @Column(name = "bank_mudarib_method", length = 30)
    private String bankMudaribMethod;

    @Builder.Default
    @Column(name = "depositor_pool", precision = 18, scale = 4)
    private BigDecimal depositorPool = BigDecimal.ZERO;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_status", nullable = false, length = 30)
    private CalculationStatus calculationStatus = CalculationStatus.DRAFT;

    @Column(name = "calculated_by", length = 100)
    private String calculatedBy;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "validated_by", length = 100)
    private String validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
