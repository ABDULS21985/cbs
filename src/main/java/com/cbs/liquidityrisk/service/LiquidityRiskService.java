package com.cbs.liquidityrisk.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LiquidityRiskService {

    private final LiquidityMetricRepository metricRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public LiquidityMetric calculateMetrics(LiquidityMetric metric) {
        // Input validation
        if (metric.getMetricDate() == null) {
            throw new BusinessException("metricDate is required", "MISSING_METRIC_DATE");
        }
        if (metric.getCurrency() == null || metric.getCurrency().isBlank()) {
            throw new BusinessException("currency is required", "MISSING_CURRENCY");
        }

        // Null-safe HQLA fields
        BigDecimal hqlaLevel1 = metric.getHqlaLevel1() != null ? metric.getHqlaLevel1() : BigDecimal.ZERO;
        BigDecimal hqlaLevel2a = metric.getHqlaLevel2a() != null ? metric.getHqlaLevel2a() : BigDecimal.ZERO;
        BigDecimal hqlaLevel2b = metric.getHqlaLevel2b() != null ? metric.getHqlaLevel2b() : BigDecimal.ZERO;

        // HQLA total (Level 2b capped at 15%, Level 2a+2b capped at 40%)
        BigDecimal l2bCapped = hqlaLevel2b.min(hqlaLevel1.multiply(new BigDecimal("0.1765"))); // 15/85
        BigDecimal l2aCapped = hqlaLevel2a.min(hqlaLevel1.multiply(new BigDecimal("0.6667"))); // 40/60
        metric.setTotalHqla(hqlaLevel1.add(l2aCapped).add(l2bCapped));

        // LCR - null-safe
        BigDecimal netCashOutflows = metric.getNetCashOutflows30d() != null ? metric.getNetCashOutflows30d() : BigDecimal.ZERO;
        if (netCashOutflows.signum() > 0) {
            metric.setLcrRatio(metric.getTotalHqla().divide(netCashOutflows, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
            BigDecimal lcrLimit = metric.getLcrLimit() != null ? metric.getLcrLimit() : new BigDecimal("100");
            metric.setLcrBreach(metric.getLcrRatio().compareTo(lcrLimit) < 0);
        }

        // NSFR - null-safe
        BigDecimal requiredStable = metric.getRequiredStableFunding() != null ? metric.getRequiredStableFunding() : BigDecimal.ZERO;
        BigDecimal availableStable = metric.getAvailableStableFunding() != null ? metric.getAvailableStableFunding() : BigDecimal.ZERO;
        if (requiredStable.signum() > 0) {
            metric.setNsfrRatio(availableStable.divide(requiredStable, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
            BigDecimal nsfrLimit = metric.getNsfrLimit() != null ? metric.getNsfrLimit() : new BigDecimal("100");
            metric.setNsfrBreach(metric.getNsfrRatio().compareTo(nsfrLimit) < 0);
        }

        LiquidityMetric saved = metricRepository.save(metric);
        log.info("AUDIT: Liquidity metrics calculated by {}: date={}, currency={}, LCR={}%, NSFR={}%, breaches={}/{}",
                currentActorProvider.getCurrentActor(), metric.getMetricDate(), metric.getCurrency(),
                metric.getLcrRatio(), metric.getNsfrRatio(), metric.getLcrBreach(), metric.getNsfrBreach());
        return saved;
    }

    public List<LiquidityMetric> getHistory(String currency) {
        return metricRepository.findByCurrencyOrderByMetricDateDesc(currency);
    }

    public List<LiquidityMetric> getBreaches() {
        return metricRepository.findByLcrBreachTrueOrderByMetricDateDesc();
    }

    /**
     * Returns the latest metric for a specific currency.
     */
    public LiquidityMetric getLatestMetric(String currency) {
        List<LiquidityMetric> metrics = metricRepository.findByCurrencyOrderByMetricDateDesc(currency);
        if (metrics.isEmpty()) {
            throw new BusinessException("No liquidity metrics found for currency " + currency, "NO_METRICS");
        }
        return metrics.get(0);
    }

    /**
     * Historical trend analysis: returns period-over-period LCR/NSFR changes.
     */
    public Map<String, Object> getTrendAnalysis(String currency, int periods) {
        List<LiquidityMetric> history = metricRepository.findByCurrencyOrderByMetricDateDesc(currency);
        if (history.size() < 2) {
            return Map.of("currency", currency, "trend", "INSUFFICIENT_DATA", "periodsAvailable", history.size());
        }

        List<LiquidityMetric> limited = history.subList(0, Math.min(periods, history.size()));

        // Compute LCR trend
        BigDecimal latestLcr = limited.get(0).getLcrRatio() != null ? limited.get(0).getLcrRatio() : BigDecimal.ZERO;
        BigDecimal oldestLcr = limited.get(limited.size() - 1).getLcrRatio() != null ? limited.get(limited.size() - 1).getLcrRatio() : BigDecimal.ZERO;
        BigDecimal lcrChange = latestLcr.subtract(oldestLcr);

        // Compute NSFR trend
        BigDecimal latestNsfr = limited.get(0).getNsfrRatio() != null ? limited.get(0).getNsfrRatio() : BigDecimal.ZERO;
        BigDecimal oldestNsfr = limited.get(limited.size() - 1).getNsfrRatio() != null ? limited.get(limited.size() - 1).getNsfrRatio() : BigDecimal.ZERO;
        BigDecimal nsfrChange = latestNsfr.subtract(oldestNsfr);

        String trend = lcrChange.signum() > 0 && nsfrChange.signum() > 0 ? "IMPROVING"
                : lcrChange.signum() < 0 && nsfrChange.signum() < 0 ? "DETERIORATING"
                : "MIXED";

        int breachCount = (int) limited.stream()
                .filter(m -> Boolean.TRUE.equals(m.getLcrBreach()) || Boolean.TRUE.equals(m.getNsfrBreach()))
                .count();

        return Map.of(
                "currency", currency,
                "trend", trend,
                "lcrChange", lcrChange,
                "nsfrChange", nsfrChange,
                "latestLcr", latestLcr,
                "latestNsfr", latestNsfr,
                "breachCount", breachCount,
                "periodsAnalyzed", limited.size()
        );
    }

    /**
     * Stress test summary: returns stress scenario results from latest metric.
     */
    public Map<String, Object> getStressTestSummary(String currency) {
        LiquidityMetric latest = getLatestMetric(currency);
        return Map.of(
                "currency", currency,
                "metricDate", latest.getMetricDate().toString(),
                "stressLcrModerate", latest.getStressLcrModerate() != null ? latest.getStressLcrModerate() : BigDecimal.ZERO,
                "stressLcrSevere", latest.getStressLcrSevere() != null ? latest.getStressLcrSevere() : BigDecimal.ZERO,
                "survivalDaysModerate", latest.getSurvivalDaysModerate() != null ? latest.getSurvivalDaysModerate() : 0,
                "survivalDaysSevere", latest.getSurvivalDaysSevere() != null ? latest.getSurvivalDaysSevere() : 0,
                "concentrationRisk", latest.getTop10DepositorPct() != null ? latest.getTop10DepositorPct() : BigDecimal.ZERO
        );
    }
}
