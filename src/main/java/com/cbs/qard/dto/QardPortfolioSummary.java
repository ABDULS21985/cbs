package com.cbs.qard.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QardPortfolioSummary {

    private long totalQardDepositAccounts;
    private long totalQardLoanAccounts;
    private BigDecimal totalQardDeposits;
    private BigDecimal totalQardLoansOutstanding;
    private BigDecimal repaymentRatePct;
    private BigDecimal defaultRatePct;
}
