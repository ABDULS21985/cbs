package com.cbs.account.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class TransactionAnalyticsDto {

    private TransactionAnalyticsDto() {
    }

    public record Summary(
            long totalTransactions,
            BigDecimal totalValue,
            BigDecimal averageTransactionValue,
            LargestTransaction largestTransaction,
            ChannelShare mostUsedChannel,
            BigDecimal failureRate,
            BigDecimal reversalRate
    ) {
    }

    public record LargestTransaction(
            Long id,
            String reference,
            BigDecimal amount
    ) {
    }

    public record ChannelShare(
            String channel,
            BigDecimal percentage,
            long count,
            BigDecimal value,
            BigDecimal successRate,
            BigDecimal averageValue
    ) {
    }

    public record VolumeTrendPoint(
            LocalDate periodStart,
            LocalDate periodEnd,
            String label,
            long creditCount,
            long debitCount,
            BigDecimal creditValue,
            BigDecimal debitValue,
            BigDecimal totalValue
    ) {
    }

    public record CategoryAnalytics(
            BigDecimal totalSpend,
            List<CategoryBreakdown> categories,
            List<CategoryTrendPoint> trend
    ) {
    }

    public record CategoryBreakdown(
            String category,
            BigDecimal amount,
            long count,
            BigDecimal average,
            BigDecimal percentage
    ) {
    }

    public record CategoryTrendPoint(
            String period,
            LocalDate periodStart,
            String category,
            BigDecimal amount
    ) {
    }

    public record ChannelAnalytics(
            List<ChannelMetric> channels,
            List<ChannelTrendPoint> successRateTrend
    ) {
    }

    public record ChannelMetric(
            String channel,
            long volume,
            BigDecimal value,
            BigDecimal successRate,
            BigDecimal averageValue
    ) {
    }

    public record ChannelTrendPoint(
            String period,
            LocalDate periodStart,
            String channel,
            BigDecimal successRate
    ) {
    }

    public record TopAccount(
            String accountNumber,
            String accountName,
            long transactionCount,
            BigDecimal totalDebit,
            BigDecimal totalCredit,
            BigDecimal netAmount,
            LocalDate lastTransactionDate
    ) {
    }

    public record FailureAnalysis(
            BigDecimal failureRate,
            boolean thresholdBreached,
            List<FailureTrendPoint> trend,
            List<FailureReason> reasons,
            List<FailureHotspot> hotspots,
            List<FailingAccount> topFailingAccounts
    ) {
    }

    public record FailureTrendPoint(
            LocalDate date,
            long failureCount,
            long totalCount,
            BigDecimal failureRate
    ) {
    }

    public record FailureReason(
            String reason,
            long count,
            BigDecimal percentage
    ) {
    }

    public record FailureHotspot(
            int hour,
            long count
    ) {
    }

    public record FailingAccount(
            String accountNumber,
            String accountName,
            long failureCount,
            String lastFailureReason,
            LocalDate lastFailureDate
    ) {
    }

    public record Heatmap(
            List<HeatmapCell> cells,
            List<Anomaly> anomalies,
            long anomalyCount
    ) {
    }

    public record HeatmapCell(
            int dayOfWeek,
            String dayLabel,
            int hour,
            long count,
            boolean anomaly
    ) {
    }

    public record Anomaly(
            String dayLabel,
            int hour,
            long count,
            BigDecimal averageCount,
            BigDecimal standardDeviation
    ) {
    }
}
