package com.cbs.branch.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "branch_service_plan", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BranchServicePlan extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "branch_id", nullable = false) private Long branchId;

    @Column(name = "plan_period") private String planPeriod;

    @Column(name = "period_start") private LocalDate periodStart;

    @Column(name = "period_end") private LocalDate periodEnd;

    @Column(name = "target_transaction_volume") private Integer targetTransactionVolume;

    @Column(name = "actual_transaction_volume") @Builder.Default private Integer actualTransactionVolume = 0;

    @Column(name = "target_new_accounts") private Integer targetNewAccounts;

    @Column(name = "actual_new_accounts") @Builder.Default private Integer actualNewAccounts = 0;

    @Column(name = "target_cross_sell") private Integer targetCrossSell;

    @Column(name = "actual_cross_sell") @Builder.Default private Integer actualCrossSell = 0;

    @Column(name = "customer_satisfaction_target") private BigDecimal customerSatisfactionTarget;

    @Column(name = "customer_satisfaction_actual") private BigDecimal customerSatisfactionActual;

    @Column(name = "avg_wait_time_target") private Integer avgWaitTimeTarget;

    @Column(name = "avg_wait_time_actual") private Integer avgWaitTimeActual;

    @Column(name = "avg_service_time_target") private Integer avgServiceTimeTarget;

    @Column(name = "avg_service_time_actual") private Integer avgServiceTimeActual;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "staffing_plan", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> staffingPlan = new HashMap<>();

    @Column(name = "operating_cost_budget") private BigDecimal operatingCostBudget;

    @Column(name = "operating_cost_actual") @Builder.Default private BigDecimal operatingCostActual = BigDecimal.ZERO;

    @Column(name = "revenue_target") private BigDecimal revenueTarget;

    @Column(name = "revenue_actual") @Builder.Default private BigDecimal revenueActual = BigDecimal.ZERO;

    @Column(name = "status", length = 20) @Builder.Default private String status = "DRAFT";
}
