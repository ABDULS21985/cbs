package com.cbs.contributionrisk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "business_contribution", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BusinessContribution extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_code", nullable = false, unique = true, length = 30)
    private String reportCode;

    @Column(name = "period_type", nullable = false, length = 10)
    private String periodType;

    @Column(name = "period_date", nullable = false)
    private LocalDate periodDate;

    @Column(name = "business_unit", length = 60)
    private String businessUnit;

    @Column(name = "business_unit_name", length = 200)
    private String businessUnitName;

    @Column(name = "product_family", length = 30)
    private String productFamily;

    @Column(name = "region", length = 60)
    private String region;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "interest_income", precision = 20, scale = 4)
    private BigDecimal interestIncome;

    @Column(name = "fee_income", precision = 20, scale = 4)
    private BigDecimal feeIncome;

    @Column(name = "trading_income", precision = 20, scale = 4)
    private BigDecimal tradingIncome;

    @Column(name = "other_income", precision = 20, scale = 4)
    private BigDecimal otherIncome;

    @Column(name = "total_revenue", precision = 20, scale = 4)
    private BigDecimal totalRevenue;

    @Column(name = "revenue_contribution_pct", precision = 8, scale = 4)
    private BigDecimal revenueContributionPct;

    @Column(name = "cost_of_funds", precision = 20, scale = 4)
    private BigDecimal costOfFunds;

    @Column(name = "operating_expense", precision = 20, scale = 4)
    private BigDecimal operatingExpense;

    @Column(name = "provision_expense", precision = 20, scale = 4)
    private BigDecimal provisionExpense;

    @Column(name = "total_cost", precision = 20, scale = 4)
    private BigDecimal totalCost;

    @Column(name = "cost_contribution_pct", precision = 8, scale = 4)
    private BigDecimal costContributionPct;

    @Column(name = "gross_margin", precision = 20, scale = 4)
    private BigDecimal grossMargin;

    @Column(name = "operating_profit", precision = 20, scale = 4)
    private BigDecimal operatingProfit;

    @Column(name = "net_profit", precision = 20, scale = 4)
    private BigDecimal netProfit;

    @Column(name = "profit_contribution_pct", precision = 8, scale = 4)
    private BigDecimal profitContributionPct;

    @Column(name = "return_on_equity", precision = 8, scale = 4)
    private BigDecimal returnOnEquity;

    @Column(name = "return_on_assets", precision = 8, scale = 4)
    private BigDecimal returnOnAssets;

    @Column(name = "cost_to_income_ratio", precision = 8, scale = 4)
    private BigDecimal costToIncomeRatio;

    @Column(name = "avg_assets", precision = 20, scale = 4)
    private BigDecimal avgAssets;

    @Column(name = "avg_deposits", precision = 20, scale = 4)
    private BigDecimal avgDeposits;

    @Column(name = "avg_loans", precision = 20, scale = 4)
    private BigDecimal avgLoans;

    @Column(name = "customer_count")
    private Long customerCount;

    @Column(name = "transaction_count")
    private Long transactionCount;

    @Column(name = "rwa_amount", precision = 20, scale = 4)
    private BigDecimal rwaAmount;

    @Column(name = "capital_allocated", precision = 20, scale = 4)
    private BigDecimal capitalAllocated;

    @Column(name = "return_on_rwa", precision = 8, scale = 4)
    private BigDecimal returnOnRwa;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "benchmark")
    private Map<String, Object> benchmark;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "CALCULATED";
}
