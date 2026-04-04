package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolProfitTrend {

    private Long poolId;
    private String poolCode;
    private List<PeriodProfit> periods;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PeriodProfit {
        private LocalDate periodFrom;
        private LocalDate periodTo;
        private BigDecimal netDistributableProfit;
        private BigDecimal effectiveRate;
        private String trend;
    }
}
