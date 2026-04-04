package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PeriodType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolProfitCalculationResponse {

    private Long id;
    private Long poolId;
    private String poolCode;
    private String calculationRef;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private PeriodType periodType;
    private String currencyCode;
    private BigDecimal grossIncome;
    private Map<String, BigDecimal> incomeBreakdown;
    private BigDecimal charityIncome;
    private BigDecimal distributableGrossIncome;
    private BigDecimal totalExpenses;
    private Map<String, BigDecimal> expenseBreakdown;
    private BigDecimal netDistributableProfit;
    private boolean isLoss;
    private BigDecimal averagePoolBalance;
    private Integer periodDays;
    private BigDecimal effectiveReturnRate;
    private BigDecimal bankMudaribShare;
    private String bankMudaribMethod;
    private BigDecimal depositorPool;
    private CalculationStatus calculationStatus;
    private String calculatedBy;
    private LocalDateTime calculatedAt;
    private String validatedBy;
    private LocalDateTime validatedAt;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String notes;
    private Long tenantId;
}
