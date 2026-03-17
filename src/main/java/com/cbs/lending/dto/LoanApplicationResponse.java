package com.cbs.lending.dto;

import com.cbs.lending.entity.LoanApplicationStatus;
import com.cbs.lending.entity.RepaymentScheduleType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanApplicationResponse {
    private Long id;
    private String applicationNumber;
    private Long customerId;
    private String customerDisplayName;
    private String loanProductCode;
    private String loanProductName;
    private String loanType;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private String currencyCode;
    private Integer requestedTenureMonths;
    private Integer approvedTenureMonths;
    private String purpose;
    private BigDecimal proposedRate;
    private BigDecimal approvedRate;
    private String rateType;
    private RepaymentScheduleType repaymentScheduleType;
    private String repaymentFrequency;
    private Boolean isIslamic;
    private String islamicStructure;
    private BigDecimal assetCost;
    private BigDecimal profitRate;
    private Integer creditScore;
    private String riskGrade;
    private BigDecimal debtToIncomeRatio;
    private Map<String, Object> decisionEngineResult;
    private LoanApplicationStatus status;
    private Instant submittedAt;
    private String reviewedBy;
    private Instant reviewedAt;
    private String approvedBy;
    private Instant approvedAt;
    private String declineReason;
    private List<String> conditions;
    private Instant createdAt;
}
