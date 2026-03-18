package com.cbs.marketdata.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketdata.entity.FeedOperationLog;
import com.cbs.marketdata.entity.FeedQualityMetric;
import com.cbs.marketdata.entity.MarketDataSubscription;
import com.cbs.marketdata.entity.MarketDataSwitch;
import com.cbs.marketdata.repository.FeedOperationLogRepository;
import com.cbs.marketdata.repository.FeedQualityMetricRepository;
import com.cbs.marketdata.repository.MarketDataSubscriptionRepository;
import com.cbs.marketdata.repository.MarketDataSwitchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketDataSwitchService {

    private final MarketDataSwitchRepository switchRepository;
    private final MarketDataSubscriptionRepository subscriptionRepository;
    private final FeedOperationLogRepository feedLogRepository;
    private final FeedQualityMetricRepository qualityMetricRepository;

    @Transactional
    public MarketDataSwitch registerSwitch(MarketDataSwitch mds) {
        return switchRepository.save(mds);
    }

    @Transactional
    public MarketDataSwitch startSwitch(Long switchId) {
        MarketDataSwitch mds = getSwitchById(switchId);
        mds.setStatus("RUNNING");
        return switchRepository.save(mds);
    }

    @Transactional
    public MarketDataSwitch stopSwitch(Long switchId) {
        MarketDataSwitch mds = getSwitchById(switchId);
        mds.setStatus("STOPPED");
        return switchRepository.save(mds);
    }

    @Transactional
    public MarketDataSubscription addSubscription(MarketDataSubscription subscription) {
        return subscriptionRepository.save(subscription);
    }

    public List<MarketDataSwitch> getSwitchDashboard() {
        return switchRepository.findAll();
    }

    public List<MarketDataSubscription> getSubscriptionHealth() {
        return subscriptionRepository.findByIsActiveTrueOrderBySubscriberSystemAsc();
    }

    @Transactional
    public FeedOperationLog logFeedOperation(FeedOperationLog feedLog) {
        return feedLogRepository.save(feedLog);
    }

    @Transactional
    public FeedQualityMetric calculateDailyQuality(FeedQualityMetric metric) {
        // Composite quality score: 40% uptime + 30% (100 - errorRate) + 20% latencyScore + 10% gapStaleScore
        BigDecimal uptimeComponent = BigDecimal.ZERO;
        BigDecimal errorComponent = BigDecimal.ZERO;
        BigDecimal latencyComponent = BigDecimal.ZERO;
        BigDecimal gapStaleComponent = BigDecimal.ZERO;

        if (metric.getUptimePct() != null) {
            uptimeComponent = metric.getUptimePct().multiply(new BigDecimal("0.40"));
        }

        if (metric.getTotalRecordsReceived() != null && metric.getTotalRecordsReceived() > 0 && metric.getTotalRecordsRejected() != null) {
            BigDecimal errorRate = BigDecimal.valueOf(metric.getTotalRecordsRejected())
                    .divide(BigDecimal.valueOf(metric.getTotalRecordsReceived()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            errorComponent = new BigDecimal("100").subtract(errorRate).multiply(new BigDecimal("0.30"));
        } else {
            errorComponent = new BigDecimal("30");
        }

        // Latency score: 100 if < 50ms, 80 if < 100ms, 60 if < 200ms, 40 if < 500ms, else 20
        if (metric.getAvgLatencyMs() != null) {
            int lat = metric.getAvgLatencyMs();
            int latScore = lat < 50 ? 100 : lat < 100 ? 80 : lat < 200 ? 60 : lat < 500 ? 40 : 20;
            latencyComponent = BigDecimal.valueOf(latScore).multiply(new BigDecimal("0.20"));
        } else {
            latencyComponent = new BigDecimal("20");
        }

        // Gap/stale score: 100 - (gapCount + staleDataCount + duplicateCount + outOfRangeCount) capped at 0
        int totalIssues = (metric.getGapCount() != null ? metric.getGapCount() : 0)
                + (metric.getStaleDataCount() != null ? metric.getStaleDataCount() : 0)
                + (metric.getDuplicateCount() != null ? metric.getDuplicateCount() : 0)
                + (metric.getOutOfRangeCount() != null ? metric.getOutOfRangeCount() : 0);
        int gapScore = Math.max(0, 100 - totalIssues);
        gapStaleComponent = BigDecimal.valueOf(gapScore).multiply(new BigDecimal("0.10"));

        BigDecimal qualityScore = uptimeComponent.add(errorComponent).add(latencyComponent).add(gapStaleComponent)
                .setScale(2, RoundingMode.HALF_UP);
        metric.setQualityScore(qualityScore);

        return qualityMetricRepository.save(metric);
    }

    public List<FeedQualityMetric> getFeedQualityReport(Long feedId, LocalDate from, LocalDate to) {
        return qualityMetricRepository.findByFeedIdAndMetricDateBetweenOrderByMetricDateAsc(feedId, from, to);
    }

    public Map<String, Object> alertOnDegradation(Long feedId) {
        List<FeedQualityMetric> recent = qualityMetricRepository.findByFeedIdOrderByMetricDateDesc(feedId);
        if (!recent.isEmpty()) {
            FeedQualityMetric latest = recent.get(0);
            boolean degraded = latest.getQualityScore() != null && latest.getQualityScore().compareTo(new BigDecimal("70")) < 0;
            return Map.of("feedId", feedId, "degraded", degraded,
                    "latestQualityScore", latest.getQualityScore() != null ? latest.getQualityScore() : BigDecimal.ZERO,
                    "metricDate", latest.getMetricDate().toString());
        }
        return Map.of("feedId", feedId, "degraded", false, "message", "No metrics available");
    }

    private MarketDataSwitch getSwitchById(Long id) {
        return switchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MarketDataSwitch", "id", id));
    }
}
