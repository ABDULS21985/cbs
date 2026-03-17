package com.cbs.lending.dto;

import com.cbs.lending.entity.LoanAccountStatus;
import com.cbs.lending.entity.RepaymentScheduleType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanAccountResponse {
    private Long id;
    private String loanNumber;
    private String applicationNumber;
    private Long customerId;
    private String customerDisplayName;
    private String loanProductCode;
    private String loanProductName;
    private String currencyCode;
    private BigDecimal sanctionedAmount;
    private BigDecimal disbursedAmount;
    private BigDecimal outstandingPrincipal;
    private BigDecimal interestRate;
    private String rateType;
    private BigDecimal accruedInterest;
    private BigDecimal totalInterestCharged;
    private BigDecimal totalInterestPaid;
    private RepaymentScheduleType repaymentScheduleType;
    private String repaymentFrequency;
    private Integer tenureMonths;
    private Integer totalInstallments;
    private Integer paidInstallments;
    private LocalDate nextDueDate;
    private BigDecimal emiAmount;
    private Boolean isIslamic;
    private String islamicStructure;
    private BigDecimal totalProfit;
    private BigDecimal profitPaid;
    private Integer daysPastDue;
    private String delinquencyBucket;
    private Integer ifrs9Stage;
    private BigDecimal provisionAmount;
    private BigDecimal totalPenalties;
    private LocalDate disbursementDate;
    private LocalDate firstRepaymentDate;
    private LocalDate maturityDate;
    private LocalDate lastPaymentDate;
    private LoanAccountStatus status;
    private List<ScheduleEntryDto> schedule;
    private List<CollateralDto> collaterals;
    private Instant createdAt;
}
