package com.cbs.branchnetwork.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "branch_performance", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"branch_id", "period_type", "period_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BranchPerformance extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "period_type", nullable = false, length = 10)
    private String periodType;

    @Column(name = "period_date", nullable = false)
    private LocalDate periodDate;

    @Column(name = "total_deposits", precision = 20, scale = 4)
    private BigDecimal totalDeposits;

    @Column(name = "total_loans", precision = 20, scale = 4)
    private BigDecimal totalLoans;

    @Column(name = "total_assets", precision = 20, scale = 4)
    private BigDecimal totalAssets;

    @Column(name = "deposit_growth_pct", precision = 8, scale = 4)
    private BigDecimal depositGrowthPct;

    @Column(name = "loan_growth_pct", precision = 8, scale = 4)
    private BigDecimal loanGrowthPct;

    @Column(name = "interest_income", precision = 15, scale = 4)
    private BigDecimal interestIncome;

    @Column(name = "fee_income", precision = 15, scale = 4)
    private BigDecimal feeIncome;

    @Column(name = "total_revenue", precision = 15, scale = 4)
    private BigDecimal totalRevenue;

    @Column(name = "operating_cost", precision = 15, scale = 4)
    private BigDecimal operatingCost;

    @Column(name = "net_profit", precision = 15, scale = 4)
    private BigDecimal netProfit;

    @Column(name = "cost_to_income_ratio", precision = 8, scale = 4)
    private BigDecimal costToIncomeRatio;

    @Column(name = "return_on_assets", precision = 8, scale = 4)
    private BigDecimal returnOnAssets;

    @Column(name = "total_customers")
    private Integer totalCustomers;

    @Column(name = "new_customers")
    private Integer newCustomers;

    @Column(name = "closed_customers")
    private Integer closedCustomers;

    @Column(name = "active_customers")
    private Integer activeCustomers;

    @Column(name = "dormant_customers")
    private Integer dormantCustomers;

    @Column(name = "customer_retention_pct", precision = 5, scale = 2)
    private BigDecimal customerRetentionPct;

    @Column(name = "avg_revenue_per_customer", precision = 12, scale = 4)
    private BigDecimal avgRevenuePerCustomer;

    @Column(name = "total_transactions")
    private Integer totalTransactions;

    @Column(name = "digital_adoption_pct", precision = 5, scale = 2)
    private BigDecimal digitalAdoptionPct;

    @Column(name = "avg_queue_wait_minutes", precision = 8, scale = 2)
    private BigDecimal avgQueueWaitMinutes;

    @Column(name = "customer_satisfaction_score", precision = 5, scale = 2)
    private BigDecimal customerSatisfactionScore;

    @Column(name = "staff_count")
    private Integer staffCount;

    @Column(name = "revenue_per_staff", precision = 12, scale = 4)
    private BigDecimal revenuePerStaff;

    @Column(name = "facility_utilization_pct", precision = 5, scale = 2)
    private BigDecimal facilityUtilizationPct;

    @Column(name = "npl_ratio_pct", precision = 6, scale = 2)
    private BigDecimal nplRatioPct;

    @Column(name = "overdue_accounts_pct", precision = 5, scale = 2)
    private BigDecimal overdueAccountsPct;

    @Column(name = "fraud_incident_count")
    private Integer fraudIncidentCount;

    @Column(name = "compliance_findings_count")
    private Integer complianceFindingsCount;

    @Column(name = "ranking")
    private Integer ranking;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "CALCULATED";
}
