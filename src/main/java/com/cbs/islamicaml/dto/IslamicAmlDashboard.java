package com.cbs.islamicaml.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicAmlDashboard {

    private AlertSummary alertSummary;
    private TawarruqMonitoring tawarruqMonitoring;
    private SanctionsWidget sanctionsWidget;
    private SarWidget sarWidget;
    private CombinedScreeningWidget combinedScreeningWidget;
    private PoolMonitoringWidget poolMonitoringWidget;
    private List<MonthlyTrend> monthlyTrends;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AlertSummary {
        private long totalAlerts;
        private long newAlerts;
        private long underInvestigation;
        private long escalated;
        private long overdueAlerts;
        private Map<String, Long> alertsByCategory;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TawarruqMonitoring {
        private long totalTawarruqAlerts;
        private long rapidCyclingDetected;
        private long assetManipulationDetected;
        private BigDecimal totalAmountFlagged;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SanctionsWidget {
        private long totalScreenings;
        private long potentialMatches;
        private long confirmedMatches;
        private long pendingReview;
        private BigDecimal clearRate;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SarWidget {
        private long totalSars;
        private long draftCount;
        private long pendingMlroApproval;
        private long filedCount;
        private long deadlineBreaches;
        private Map<String, Long> byJurisdiction;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CombinedScreeningWidget {
        private long totalCombinedScreenings;
        private long shariahBlocked;
        private long sanctionsBlocked;
        private long dualBlocked;
        private long clearCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PoolMonitoringWidget {
        private long poolLayeringAlerts;
        private long partnershipLayeringAlerts;
        private BigDecimal totalPoolAmountFlagged;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MonthlyTrend {
        private String month;
        private long alertCount;
        private long sarCount;
        private long screeningCount;
    }
}
