package com.cbs.wealthmgmt.dto;

import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WealthPlanResponse {

    private Long id;
    private String planCode;
    private String customerId;
    private String customerName;
    private String planType;
    private String advisorId;
    private String advisorName;
    private BigDecimal totalNetWorth;
    private BigDecimal totalInvestableAssets;
    private BigDecimal annualIncome;
    private String riskProfile;
    private Integer investmentHorizon;
    private Map<String, Object> targetAllocation;
    private Map<String, Object> currentAllocation;
    private List<Map<String, Object>> allocations;
    private List<Map<String, Object>> goals;
    private List<Map<String, Object>> financialGoals;
    private String nextReviewDate;
    private String createdDate;
    private String activatedDate;
    private String lastReviewDate;
    private String status;
    private double ytdReturn;
    private BigDecimal absoluteGain;
    private double benchmarkDiff;

    public static WealthPlanResponse from(WealthManagementPlan plan) {
        BigDecimal aum = plan.getTotalInvestableAssets() != null ? plan.getTotalInvestableAssets() : BigDecimal.ZERO;
        double ytd = plan.getYtdReturn() != null ? plan.getYtdReturn().doubleValue() : 0.0;
        double bench = plan.getBenchmarkReturn() != null ? plan.getBenchmarkReturn().doubleValue() : 0.0;
        BigDecimal gain = aum.multiply(BigDecimal.valueOf(ytd / 100));

        return WealthPlanResponse.builder()
                .id(plan.getId())
                .planCode(plan.getPlanCode())
                .customerId(plan.getCustomerId() != null ? String.valueOf(plan.getCustomerId()) : null)
                .customerName(plan.getCustomerName())
                .planType(plan.getPlanType())
                .advisorId(plan.getAdvisorId())
                .advisorName(plan.getAdvisorName())
                .totalNetWorth(plan.getTotalNetWorth())
                .totalInvestableAssets(plan.getTotalInvestableAssets())
                .annualIncome(plan.getAnnualIncome())
                .riskProfile(plan.getRiskProfile())
                .investmentHorizon(plan.getInvestmentHorizon())
                .targetAllocation(plan.getTargetAllocation())
                .currentAllocation(plan.getCurrentAllocation())
                .allocations(plan.getAllocations())
                .goals(plan.getGoals())
                .financialGoals(plan.getFinancialGoals())
                .nextReviewDate(plan.getNextReviewDate() != null ? plan.getNextReviewDate().toString() : null)
                .createdDate(plan.getCreatedAt() != null ? plan.getCreatedAt().toString() : null)
                .activatedDate(plan.getActivatedDate() != null ? plan.getActivatedDate().toString() : null)
                .lastReviewDate(plan.getLastReviewDate() != null ? plan.getLastReviewDate().toString() : null)
                .status(plan.getStatus())
                .ytdReturn(ytd)
                .absoluteGain(gain)
                .benchmarkDiff(ytd - bench)
                .build();
    }
}
