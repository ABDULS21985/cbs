package com.cbs.wadiah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahPortfolioSummary {

    private long totalAccounts;
    private BigDecimal totalDeposits;
    private BigDecimal averageBalance;
    private Map<String, BigDecimal> balancesByCurrency;
    private Map<String, Long> accountsByProduct;
}
