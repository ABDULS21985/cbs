package com.cbs.wealthmgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "wealth_management_plan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class WealthManagementPlan extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String planCode;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 20)
    private String planType;

    @Column(length = 80)
    private String advisorId;

    private BigDecimal totalNetWorth;
    private BigDecimal totalInvestableAssets;
    private BigDecimal annualIncome;
    private BigDecimal taxBracketPct;
    private Integer retirementTargetAge;
    private BigDecimal retirementIncomeGoal;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> financialGoals;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> recommendedAllocation;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> insuranceNeeds;

    @Column(columnDefinition = "TEXT")
    private String estatePlanSummary;

    @Column(columnDefinition = "TEXT")
    private String taxStrategy;

    private LocalDate nextReviewDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
