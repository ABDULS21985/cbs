package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolPerformanceComparison {

    private LocalDate periodFrom;
    private LocalDate periodTo;
    private List<PoolPerformanceEntry> pools;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PoolPerformanceEntry {
        private Long poolId;
        private String poolCode;
        private BigDecimal netDistributableProfit;
        private BigDecimal effectiveRate;
        private int rank;
    }
}
