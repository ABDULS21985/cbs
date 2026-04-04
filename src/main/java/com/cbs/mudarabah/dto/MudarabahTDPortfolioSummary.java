package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MudarabahTDPortfolioSummary {

    private long totalTermDeposits;
    private BigDecimal totalPrincipal;
    private BigDecimal averagePsr;
    private Map<String, Long> countByTenorBucket;
    private Map<String, BigDecimal> principalByTenorBucket;
    private long upcomingMaturities30Days;
    private long upcomingMaturities90Days;
    private BigDecimal rolloverRate;
}
