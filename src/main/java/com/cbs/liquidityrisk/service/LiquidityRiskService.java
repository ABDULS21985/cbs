package com.cbs.liquidityrisk.service;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LiquidityRiskService {
    private final LiquidityMetricRepository metricRepository;
    @Transactional
    public LiquidityMetric calculateMetrics(LiquidityMetric metric) {
        // HQLA total (Level 2b capped at 15%, Level 2a+2b capped at 40%)
        BigDecimal l2bCapped = metric.getHqlaLevel2b().min(metric.getHqlaLevel1().multiply(new BigDecimal("0.1765"))); // 15/85
        BigDecimal l2aCapped = metric.getHqlaLevel2a().min(metric.getHqlaLevel1().multiply(new BigDecimal("0.6667"))); // 40/60
        metric.setTotalHqla(metric.getHqlaLevel1().add(l2aCapped).add(l2bCapped));
        // LCR
        if (metric.getNetCashOutflows30d().signum() > 0) {
            metric.setLcrRatio(metric.getTotalHqla().divide(metric.getNetCashOutflows30d(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
            metric.setLcrBreach(metric.getLcrRatio().compareTo(metric.getLcrLimit()) < 0);
        }
        // NSFR
        if (metric.getRequiredStableFunding().signum() > 0) {
            metric.setNsfrRatio(metric.getAvailableStableFunding().divide(metric.getRequiredStableFunding(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
            metric.setNsfrBreach(metric.getNsfrRatio().compareTo(metric.getNsfrLimit()) < 0);
        }
        LiquidityMetric saved = metricRepository.save(metric);
        log.info("Liquidity metrics: date={}, LCR={}%, NSFR={}%, breaches={}/{}", metric.getMetricDate(), metric.getLcrRatio(), metric.getNsfrRatio(), metric.getLcrBreach(), metric.getNsfrBreach());
        return saved;
    }
    public List<LiquidityMetric> getHistory(String currency) { return metricRepository.findByCurrencyOrderByMetricDateDesc(currency); }
    public List<LiquidityMetric> getBreaches() { return metricRepository.findByLcrBreachTrueOrderByMetricDateDesc(); }
}
