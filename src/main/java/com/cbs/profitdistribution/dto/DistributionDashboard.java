package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DistributionDashboard {

    private Map<String, Long> activeRunsByStatus;
    private List<LatestCompletedRun> latestCompletedRuns;
    private BigDecimal totalDistributedMonthToDate;
    private BigDecimal totalDistributedYearToDate;
    private LocalDate nextMonthlyRunDate;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LatestCompletedRun {
        private Long poolId;
        private String poolCode;
        private String runRef;
        private LocalDate periodFrom;
        private LocalDate periodTo;
        private BigDecimal totalDistributed;
        private BigDecimal averageRate;
    }
}
