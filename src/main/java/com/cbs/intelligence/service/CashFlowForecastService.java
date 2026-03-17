package com.cbs.intelligence.service;

import com.cbs.intelligence.entity.CashflowForecast;
import com.cbs.intelligence.repository.CashflowForecastRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CashFlowForecastService {

    private final CashflowForecastRepository forecastRepository;

    @Transactional
    public CashflowForecast generateForecast(String entityType, String entityId, String currency,
                                              int horizonDays, String modelType) {
        String forecastId = "FCT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        // In production: invoke ML model (ARIMA/Prophet/LSTM) with historical transaction data
        BigDecimal inflows = randomAmount(50000, 500000);
        BigDecimal outflows = randomAmount(30000, 400000);
        BigDecimal net = inflows.subtract(outflows);
        BigDecimal confidence = BigDecimal.valueOf(75 + Math.random() * 20).setScale(2, RoundingMode.HALF_UP);
        BigDecimal margin = net.abs().multiply(BigDecimal.valueOf(0.15));

        Map<String, Object> inflowBreakdown = Map.of(
                "salary_credits", randomAmount(20000, 200000),
                "transfer_in", randomAmount(5000, 100000),
                "interest_income", randomAmount(500, 10000),
                "other", randomAmount(1000, 50000));

        Map<String, Object> outflowBreakdown = Map.of(
                "loan_repayments", randomAmount(5000, 80000),
                "utilities", randomAmount(1000, 10000),
                "transfers_out", randomAmount(10000, 150000),
                "fees_charges", randomAmount(200, 5000),
                "other", randomAmount(2000, 50000));

        Map<String, Object> featureImportance = Map.of(
                "historical_avg", 0.35, "seasonality", 0.25, "trend", 0.20,
                "recurring_patterns", 0.12, "external_factors", 0.08);

        CashflowForecast forecast = CashflowForecast.builder()
                .forecastId(forecastId).entityType(entityType).entityId(entityId)
                .forecastDate(LocalDate.now()).horizonDays(horizonDays).currency(currency)
                .projectedInflows(inflows).projectedOutflows(outflows).netPosition(net)
                .confidenceLevel(confidence).lowerBound(net.subtract(margin)).upperBound(net.add(margin))
                .modelType(modelType).modelVersion("v2.3")
                .featureImportance(featureImportance)
                .inflowBreakdown(inflowBreakdown).outflowBreakdown(outflowBreakdown)
                .status("GENERATED").build();

        CashflowForecast saved = forecastRepository.save(forecast);
        log.info("Forecast generated: id={}, entity={}/{}, net={} {}, confidence={}%",
                forecastId, entityType, entityId, net, currency, confidence);
        return saved;
    }

    public List<CashflowForecast> getForecasts(String entityType, String entityId) {
        return forecastRepository.findByEntityTypeAndEntityIdOrderByForecastDateDesc(entityType, entityId);
    }

    @Transactional
    public CashflowForecast approveForecast(String forecastId) {
        CashflowForecast f = forecastRepository.findByForecastId(forecastId)
                .orElseThrow(() -> new RuntimeException("Forecast not found: " + forecastId));
        f.setStatus("APPROVED");
        return forecastRepository.save(f);
    }

    private BigDecimal randomAmount(double min, double max) {
        return BigDecimal.valueOf(min + Math.random() * (max - min)).setScale(4, RoundingMode.HALF_UP);
    }
}
