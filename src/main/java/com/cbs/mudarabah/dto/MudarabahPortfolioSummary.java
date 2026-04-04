package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MudarabahPortfolioSummary {

    private long totalMudarabahAccounts;
    private long savingsCount;
    private long termDepositCount;
    private long noticeDepositCount;
    private BigDecimal totalSavingsBalance;
    private BigDecimal totalTermDepositBalance;
    private BigDecimal averagePsrCustomer;
    private BigDecimal lastDistributionRate;
    private Map<String, BigDecimal> balanceByPool;
}
