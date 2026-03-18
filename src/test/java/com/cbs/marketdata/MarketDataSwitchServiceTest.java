package com.cbs.marketdata;

import com.cbs.marketdata.entity.FeedQualityMetric;
import com.cbs.marketdata.repository.FeedOperationLogRepository;
import com.cbs.marketdata.repository.FeedQualityMetricRepository;
import com.cbs.marketdata.repository.MarketDataSubscriptionRepository;
import com.cbs.marketdata.repository.MarketDataSwitchRepository;
import com.cbs.marketdata.service.MarketDataSwitchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketDataSwitchServiceTest {

    @Mock
    private MarketDataSwitchRepository switchRepository;

    @Mock
    private MarketDataSubscriptionRepository subscriptionRepository;

    @Mock
    private FeedOperationLogRepository feedLogRepository;

    @Mock
    private FeedQualityMetricRepository qualityMetricRepository;

    @InjectMocks
    private MarketDataSwitchService service;

    @Test
    @DisplayName("Quality score composite weighted: 40% uptime + 30% errorFree + 20% latency + 10% gapStale")
    void qualityScoreCompositeWeighted() {
        FeedQualityMetric metric = new FeedQualityMetric();
        metric.setFeedId(1L);
        metric.setMetricDate(LocalDate.now());
        metric.setUptimePct(new BigDecimal("99.00"));
        metric.setTotalRecordsReceived(10000);
        metric.setTotalRecordsProcessed(9900);
        metric.setTotalRecordsRejected(100);
        metric.setAvgLatencyMs(30); // < 50ms → latencyScore = 100
        metric.setGapCount(2);
        metric.setStaleDataCount(1);
        metric.setDuplicateCount(0);
        metric.setOutOfRangeCount(0);

        when(qualityMetricRepository.save(any(FeedQualityMetric.class))).thenAnswer(i -> i.getArgument(0));

        FeedQualityMetric result = service.calculateDailyQuality(metric);

        // uptime: 99.00 × 0.40 = 39.60
        // errorRate: 100/10000 × 100 = 1.0%, errorFree: (100 - 1.0) × 0.30 = 29.70
        // latency: 100 × 0.20 = 20.00
        // gapStale: (100 - 3) × 0.10 = 9.70
        // total: 39.60 + 29.70 + 20.00 + 9.70 = 99.00
        assertThat(result.getQualityScore()).isNotNull();
        assertThat(result.getQualityScore().compareTo(new BigDecimal("95"))).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Degradation alert when quality score < 70")
    void degradationAlertWhenQualityBelow70() {
        FeedQualityMetric degraded = new FeedQualityMetric();
        degraded.setFeedId(1L);
        degraded.setMetricDate(LocalDate.now());
        degraded.setQualityScore(new BigDecimal("55.00"));

        when(qualityMetricRepository.findByFeedIdOrderByMetricDateDesc(1L)).thenReturn(List.of(degraded));

        Map<String, Object> alert = service.alertOnDegradation(1L);

        assertThat(alert.get("degraded")).isEqualTo(true);
        assertThat(alert.get("latestQualityScore")).isEqualTo(new BigDecimal("55.00"));
    }
}
