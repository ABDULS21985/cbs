package com.cbs.marketdata.dto;

import lombok.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SwitchDashboardDto {
    private int totalFeeds;
    private int activeFeeds;
    private int messagesPerSec;
    private BigDecimal errorRate;
    private BigDecimal uptimePct;

    public static SwitchDashboardDto from(java.util.List<com.cbs.marketdata.entity.MarketDataSwitch> switches) {
        int total = switches.size();
        int active = (int) switches.stream().filter(s -> "RUNNING".equals(s.getStatus())).count();
        int throughput = switches.stream().filter(s -> s.getThroughputPerSecond() != null).mapToInt(s -> s.getThroughputPerSecond()).sum();
        int totalProcessed = switches.stream().mapToInt(s -> s.getTotalProcessedToday() != null ? s.getTotalProcessedToday() : 0).sum();
        int totalErrors = switches.stream().mapToInt(s -> s.getTotalErrorsToday() != null ? s.getTotalErrorsToday() : 0).sum();
        BigDecimal errorRate = totalProcessed > 0
                ? BigDecimal.valueOf(totalErrors).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(totalProcessed), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal uptime = total > 0
                ? BigDecimal.valueOf(active).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        return SwitchDashboardDto.builder()
                .totalFeeds(total)
                .activeFeeds(active)
                .messagesPerSec(throughput)
                .errorRate(errorRate)
                .uptimePct(uptime)
                .build();
    }
}
