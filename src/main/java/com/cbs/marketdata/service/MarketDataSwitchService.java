package com.cbs.marketdata.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
import org.springframework.util.StringUtils;

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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public MarketDataSwitch registerSwitch(MarketDataSwitch mds) {
        if (!StringUtils.hasText(mds.getSwitchName())) {
            throw new BusinessException("switchName is required", "MISSING_SWITCH_NAME");
        }
        if (!StringUtils.hasText(mds.getSwitchType())) {
            throw new BusinessException("switchType is required", "MISSING_SWITCH_TYPE");
        }
        MarketDataSwitch saved = switchRepository.save(mds);
        log.info("AUDIT: Market data switch registered by {}: id={}, name={}, type={}",
                currentActorProvider.getCurrentActor(), saved.getId(), saved.getSwitchName(), saved.getSwitchType());
        return saved;
    }

    @Transactional
    public MarketDataSwitch startSwitch(Long switchId) {
        MarketDataSwitch mds = getSwitchById(switchId);
        // State guard: can only start from STOPPED or initial state
        if ("RUNNING".equals(mds.getStatus())) {
            throw new BusinessException("Switch " + switchId + " is already RUNNING", "ALREADY_RUNNING");
        }
        mds.setStatus("RUNNING");
        log.info("AUDIT: Market data switch started by {}: id={}, name={}",
                currentActorProvider.getCurrentActor(), switchId, mds.getSwitchName());
        return switchRepository.save(mds);
    }

    @Transactional
    public MarketDataSwitch stopSwitch(Long switchId) {
        MarketDataSwitch mds = getSwitchById(switchId);
        // State guard: can only stop if currently RUNNING
        if (!"RUNNING".equals(mds.getStatus())) {
            throw new BusinessException("Switch " + switchId + " is not RUNNING; current status: " + mds.getStatus(), "NOT_RUNNING");
        }
        mds.setStatus("STOPPED");
        log.info("AUDIT: Market data switch stopped by {}: id={}, name={}",
                currentActorProvider.getCurrentActor(), switchId, mds.getSwitchName());
        return switchRepository.save(mds);
    }

    @Transactional
    public MarketDataSubscription addSubscription(MarketDataSubscription subscription) {
        // Validate required fields
        if (!StringUtils.hasText(subscription.getSubscriberSystem())) {
            throw new BusinessException("subscriberSystem is required", "MISSING_SUBSCRIBER");
        }
        if (!StringUtils.hasText(subscription.getDeliveryMethod())) {
            throw new BusinessException("deliveryMethod is required", "MISSING_DELIVERY_METHOD");
        }
        if (!StringUtils.hasText(subscription.getDeliveryFrequency())) {
            throw new BusinessException("deliveryFrequency is required", "MISSING_DELIVERY_FREQUENCY");
        }
        MarketDataSubscription saved = subscriptionRepository.save(subscription);
        log.info("AUDIT: Market data subscription added by {}: subscriber={}, method={}, frequency={}",
                currentActorProvider.getCurrentActor(), saved.getSubscriberSystem(), saved.getDeliveryMethod(), saved.getDeliveryFrequency());
        return saved;
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

    /** Return the most recent metric for every feed within the date window. */
    public List<FeedQualityMetric> getAllFeedQualityMetrics(LocalDate from, LocalDate to) {
        List<FeedQualityMetric> all = qualityMetricRepository.findByMetricDateBetweenOrderByFeedIdAscMetricDateDesc(from, to);
        // Deduplicate: keep only the most recent entry per feedId
        java.util.Map<Long, FeedQualityMetric> latest = new java.util.LinkedHashMap<>();
        for (FeedQualityMetric m : all) {
            latest.putIfAbsent(m.getFeedId(), m);
        }
        return new java.util.ArrayList<>(latest.values());
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
