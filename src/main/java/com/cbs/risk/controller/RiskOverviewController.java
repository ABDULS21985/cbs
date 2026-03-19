package com.cbs.risk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.fraud.entity.FraudAlert;
import com.cbs.fraud.repository.FraudAlertRepository;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import com.cbs.oprisk.entity.OpRiskKri;
import com.cbs.oprisk.entity.OpRiskKriReading;
import com.cbs.oprisk.entity.OpRiskLossEvent;
import com.cbs.oprisk.repository.OpRiskKriReadingRepository;
import com.cbs.oprisk.repository.OpRiskKriRepository;
import com.cbs.oprisk.repository.OpRiskLossEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/risk")
@RequiredArgsConstructor
@Tag(name = "Risk Overview", description = "Aggregated risk dashboard: alerts, KRIs, limits across all risk modules")
public class RiskOverviewController {

    private final AmlAlertRepository amlAlertRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final OpRiskLossEventRepository opRiskLossEventRepository;
    private final OpRiskKriRepository opRiskKriRepository;
    private final OpRiskKriReadingRepository opRiskKriReadingRepository;
    private final MarketRiskPositionRepository marketRiskPositionRepository;
    private final LiquidityMetricRepository liquidityMetricRepository;

    // ===========================
    // EXISTING ENDPOINTS
    // ===========================

    @GetMapping("/alerts")
    @Operation(summary = "List combined risk alerts from AML, Fraud, and OpRisk")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRiskAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AmlAlert> amlAlerts = amlAlertRepository.findAll(pageRequest);
        Page<FraudAlert> fraudAlerts = fraudAlertRepository.findAll(pageRequest);
        Page<OpRiskLossEvent> opRiskEvents = opRiskLossEventRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate")));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "amlAlerts", amlAlerts.getContent(),
                "fraudAlerts", fraudAlerts.getContent(),
                "opRiskEvents", opRiskEvents.getContent(),
                "totalAml", amlAlerts.getTotalElements(),
                "totalFraud", fraudAlerts.getTotalElements(),
                "totalOpRisk", opRiskEvents.getTotalElements()
        )));
    }

    @GetMapping("/kris")
    @Operation(summary = "List all active Key Risk Indicators")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskKri>>> getKris() {
        return ResponseEntity.ok(ApiResponse.ok(opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc()));
    }

    @GetMapping("/limits")
    @Operation(summary = "List risk limit breaches across all modules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLimits() {
        List<MarketRiskPosition> marketBreaches = marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc();
        List<LiquidityMetric> lcrBreaches = liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "marketRiskBreaches", marketBreaches,
                "liquidityBreaches", lcrBreaches,
                "totalMarketBreaches", marketBreaches.size(),
                "totalLiquidityBreaches", lcrBreaches.size()
        )));
    }

    @GetMapping("/market")
    @Operation(summary = "List market risk positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> getMarketRisk(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MarketRiskPosition> result = marketRiskPositionRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "positionDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/market/breaches")
    @Operation(summary = "List market risk limit breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> getMarketBreaches() {
        return ResponseEntity.ok(ApiResponse.ok(marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc()));
    }

    @GetMapping("/liquidity")
    @Operation(summary = "List liquidity risk metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> getLiquidityRisk(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LiquidityMetric> result = liquidityMetricRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "metricDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/liquidity/breaches")
    @Operation(summary = "List liquidity risk breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> getLiquidityBreaches() {
        return ResponseEntity.ok(ApiResponse.ok(liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc()));
    }

    // ===========================
    // MARKET RISK SUB-ENDPOINTS
    // ===========================

    @GetMapping("/market/var-stats")
    @Operation(summary = "VaR summary statistics from latest market risk positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getVarStats() {
        List<MarketRiskPosition> positions = marketRiskPositionRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "positionDate"))).getContent();

        if (positions.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "var1d95", BigDecimal.ZERO,
                    "var1d99", BigDecimal.ZERO,
                    "var10d99", BigDecimal.ZERO,
                    "positionCount", 0
            )));
        }

        LocalDate latestDate = positions.get(0).getPositionDate();
        List<MarketRiskPosition> latestPositions = marketRiskPositionRepository
                .findByPositionDateOrderByRiskTypeAscPortfolioAsc(latestDate);

        BigDecimal totalVar1d95 = sumField(latestPositions, MarketRiskPosition::getVar1d95);
        BigDecimal totalVar1d99 = sumField(latestPositions, MarketRiskPosition::getVar1d99);
        BigDecimal totalVar10d99 = sumField(latestPositions, MarketRiskPosition::getVar10d99);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("var1d95", totalVar1d95);
        result.put("var1d99", totalVar1d99);
        result.put("var10d99", totalVar10d99);
        result.put("positionDate", latestDate.toString());
        result.put("positionCount", latestPositions.size());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/market/var-trend")
    @Operation(summary = "Daily VaR values over N days")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getVarTrend(
            @RequestParam(defaultValue = "60") int days) {
        LocalDate startDate = LocalDate.now().minusDays(days);
        List<MarketRiskPosition> allPositions = marketRiskPositionRepository.findAll(
                Sort.by(Sort.Direction.ASC, "positionDate"));

        Map<LocalDate, List<MarketRiskPosition>> byDate = allPositions.stream()
                .filter(p -> !p.getPositionDate().isBefore(startDate))
                .collect(Collectors.groupingBy(MarketRiskPosition::getPositionDate, TreeMap::new, Collectors.toList()));

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<LocalDate, List<MarketRiskPosition>> entry : byDate.entrySet()) {
            BigDecimal dayVar = entry.getValue().stream()
                    .map(p -> p.getVar1d99() != null ? p.getVar1d99() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", entry.getKey().toString());
            point.put("var1d99", dayVar);
            point.put("positionCount", entry.getValue().size());
            trend.add(point);
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/market/var-by-factor")
    @Operation(summary = "VaR breakdown by risk factor type")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getVarByFactor() {
        List<MarketRiskPosition> positions = marketRiskPositionRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "positionDate"))).getContent();

        if (positions.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        LocalDate latestDate = positions.get(0).getPositionDate();
        List<MarketRiskPosition> latestPositions = marketRiskPositionRepository
                .findByPositionDateOrderByRiskTypeAscPortfolioAsc(latestDate);

        Map<String, List<MarketRiskPosition>> byRiskType = latestPositions.stream()
                .collect(Collectors.groupingBy(MarketRiskPosition::getRiskType));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<MarketRiskPosition>> entry : byRiskType.entrySet()) {
            BigDecimal factorVar = entry.getValue().stream()
                    .map(p -> p.getVar1d99() != null ? p.getVar1d99() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("riskFactor", entry.getKey());
            item.put("var1d99", factorVar);
            item.put("positionCount", entry.getValue().size());
            result.add(item);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/market/stress-tests")
    @Operation(summary = "Stress test scenarios and results from market risk positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStressTests() {
        List<MarketRiskPosition> positions = marketRiskPositionRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "positionDate"))).getContent();

        if (positions.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        LocalDate latestDate = positions.get(0).getPositionDate();
        List<MarketRiskPosition> latestPositions = marketRiskPositionRepository
                .findByPositionDateOrderByRiskTypeAscPortfolioAsc(latestDate);

        List<Map<String, Object>> results = latestPositions.stream()
                .filter(p -> p.getStressScenario() != null)
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("portfolio", p.getPortfolio());
                    m.put("riskType", p.getRiskType());
                    m.put("scenario", p.getStressScenario());
                    m.put("stressLossModerate", p.getStressLossModerate());
                    m.put("stressLossSevere", p.getStressLossSevere());
                    m.put("positionDate", latestDate.toString());
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/market/sensitivities")
    @Operation(summary = "Delta, gamma, vega sensitivities across portfolio")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSensitivities() {
        List<MarketRiskPosition> positions = marketRiskPositionRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "positionDate"))).getContent();

        if (positions.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("totalDelta", BigDecimal.ZERO);
            empty.put("totalGamma", BigDecimal.ZERO);
            empty.put("totalVega", BigDecimal.ZERO);
            empty.put("totalTheta", BigDecimal.ZERO);
            empty.put("totalRho", BigDecimal.ZERO);
            return ResponseEntity.ok(ApiResponse.ok(empty));
        }

        LocalDate latestDate = positions.get(0).getPositionDate();
        List<MarketRiskPosition> latestPositions = marketRiskPositionRepository
                .findByPositionDateOrderByRiskTypeAscPortfolioAsc(latestDate);

        BigDecimal totalDelta = sumField(latestPositions, MarketRiskPosition::getDelta);
        BigDecimal totalGamma = sumField(latestPositions, MarketRiskPosition::getGamma);
        BigDecimal totalVega = sumField(latestPositions, MarketRiskPosition::getVega);
        BigDecimal totalTheta = sumField(latestPositions, MarketRiskPosition::getTheta);
        BigDecimal totalRho = sumField(latestPositions, MarketRiskPosition::getRho);

        List<Map<String, Object>> byPortfolio = latestPositions.stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("portfolio", p.getPortfolio());
                    m.put("riskType", p.getRiskType());
                    m.put("delta", p.getDelta());
                    m.put("gamma", p.getGamma());
                    m.put("vega", p.getVega());
                    m.put("theta", p.getTheta());
                    m.put("rho", p.getRho());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalDelta", totalDelta);
        result.put("totalGamma", totalGamma);
        result.put("totalVega", totalVega);
        result.put("totalTheta", totalTheta);
        result.put("totalRho", totalRho);
        result.put("byPortfolio", byPortfolio);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/market/backtest")
    @Operation(summary = "Backtesting results - predicted VaR vs actual P&L")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBacktest() {
        List<MarketRiskPosition> allPositions = marketRiskPositionRepository.findAll(
                Sort.by(Sort.Direction.ASC, "positionDate"));

        Map<LocalDate, List<MarketRiskPosition>> byDate = allPositions.stream()
                .collect(Collectors.groupingBy(MarketRiskPosition::getPositionDate, TreeMap::new, Collectors.toList()));

        List<Map<String, Object>> results = new ArrayList<>();
        int breachCount = 0;
        for (Map.Entry<LocalDate, List<MarketRiskPosition>> entry : byDate.entrySet()) {
            BigDecimal dayVar = entry.getValue().stream()
                    .map(p -> p.getVar1d99() != null ? p.getVar1d99() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal dayPnl = entry.getValue().stream()
                    .map(p -> p.getDailyPnl() != null ? p.getDailyPnl() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            boolean breach = dayPnl.abs().compareTo(dayVar) > 0;
            if (breach) breachCount++;
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", entry.getKey().toString());
            point.put("predictedVar", dayVar);
            point.put("actualPnl", dayPnl);
            point.put("breach", breach);
            results.add(point);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("backtestResults", results);
        response.put("totalDays", results.size());
        response.put("breachCount", breachCount);
        response.put("breachRate", results.isEmpty() ? BigDecimal.ZERO :
                BigDecimal.valueOf(breachCount).divide(BigDecimal.valueOf(results.size()), 4, RoundingMode.HALF_UP));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    // ===========================
    // LIQUIDITY RISK SUB-ENDPOINTS
    // ===========================

    @GetMapping("/liquidity/ratios")
    @Operation(summary = "LCR and NSFR ratios from latest liquidity metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLiquidityRatios() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        if (metrics.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("lcrRatio", BigDecimal.ZERO);
            empty.put("nsfrRatio", BigDecimal.ZERO);
            empty.put("hqlaLevel1", BigDecimal.ZERO);
            empty.put("hqlaLevel2a", BigDecimal.ZERO);
            empty.put("hqlaLevel2b", BigDecimal.ZERO);
            empty.put("totalHqla", BigDecimal.ZERO);
            empty.put("netCashOutflows30d", BigDecimal.ZERO);
            return ResponseEntity.ok(ApiResponse.ok(empty));
        }

        LiquidityMetric latest = metrics.get(0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("metricDate", latest.getMetricDate().toString());
        result.put("currency", latest.getCurrency());
        result.put("lcrRatio", latest.getLcrRatio());
        result.put("nsfrRatio", latest.getNsfrRatio());
        result.put("hqlaLevel1", latest.getHqlaLevel1());
        result.put("hqlaLevel2a", latest.getHqlaLevel2a());
        result.put("hqlaLevel2b", latest.getHqlaLevel2b());
        result.put("totalHqla", latest.getTotalHqla());
        result.put("netCashOutflows30d", latest.getNetCashOutflows30d());
        result.put("availableStableFunding", latest.getAvailableStableFunding());
        result.put("requiredStableFunding", latest.getRequiredStableFunding());
        result.put("lcrLimit", latest.getLcrLimit());
        result.put("nsfrLimit", latest.getNsfrLimit());
        result.put("lcrBreach", latest.getLcrBreach());
        result.put("nsfrBreach", latest.getNsfrBreach());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/liquidity/cashflow-ladder")
    @Operation(summary = "Cash inflows/outflows by time bucket derived from liquidity metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCashflowLadder() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                Sort.by(Sort.Direction.ASC, "metricDate"));

        List<Map<String, Object>> ladder = metrics.stream()
                .map(m -> {
                    Map<String, Object> bucket = new LinkedHashMap<>();
                    bucket.put("date", m.getMetricDate().toString());
                    bucket.put("currency", m.getCurrency());
                    bucket.put("totalHqla", m.getTotalHqla());
                    bucket.put("netCashOutflows30d", m.getNetCashOutflows30d());
                    bucket.put("lcrRatio", m.getLcrRatio());
                    return bucket;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(ladder));
    }

    @GetMapping("/liquidity/hqla")
    @Operation(summary = "HQLA composition breakdown")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHqlaComposition() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        if (metrics.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("level1", BigDecimal.ZERO);
            empty.put("level2a", BigDecimal.ZERO);
            empty.put("level2b", BigDecimal.ZERO);
            empty.put("total", BigDecimal.ZERO);
            return ResponseEntity.ok(ApiResponse.ok(empty));
        }

        LiquidityMetric latest = metrics.get(0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("metricDate", latest.getMetricDate().toString());
        result.put("level1", latest.getHqlaLevel1());
        result.put("level2a", latest.getHqlaLevel2a());
        result.put("level2b", latest.getHqlaLevel2b());
        result.put("total", latest.getTotalHqla());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/liquidity/stress-projection")
    @Operation(summary = "Stressed LCR scenarios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStressProjection() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                Sort.by(Sort.Direction.DESC, "metricDate"));

        List<Map<String, Object>> projections = metrics.stream()
                .filter(m -> m.getStressLcrModerate() != null || m.getStressLcrSevere() != null)
                .map(m -> {
                    Map<String, Object> projection = new LinkedHashMap<>();
                    projection.put("date", m.getMetricDate().toString());
                    projection.put("currency", m.getCurrency());
                    projection.put("baseLcr", m.getLcrRatio());
                    projection.put("stressLcrModerate", m.getStressLcrModerate());
                    projection.put("stressLcrSevere", m.getStressLcrSevere());
                    projection.put("survivalDaysModerate", m.getSurvivalDaysModerate());
                    projection.put("survivalDaysSevere", m.getSurvivalDaysSevere());
                    return projection;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(projections));
    }

    @GetMapping("/liquidity/funding-sources")
    @Operation(summary = "Funding mix from liquidity metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFundingSources() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        if (metrics.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("wholesaleFundingPct", BigDecimal.ZERO);
            empty.put("retailFundingPct", BigDecimal.ZERO);
            empty.put("availableStableFunding", BigDecimal.ZERO);
            empty.put("requiredStableFunding", BigDecimal.ZERO);
            return ResponseEntity.ok(ApiResponse.ok(empty));
        }

        LiquidityMetric latest = metrics.get(0);
        BigDecimal wholesalePct = latest.getWholesaleFundingPct() != null ? latest.getWholesaleFundingPct() : BigDecimal.ZERO;
        BigDecimal retailPct = new BigDecimal("100").subtract(wholesalePct);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("metricDate", latest.getMetricDate().toString());
        result.put("wholesaleFundingPct", wholesalePct);
        result.put("retailFundingPct", retailPct);
        result.put("availableStableFunding", latest.getAvailableStableFunding());
        result.put("requiredStableFunding", latest.getRequiredStableFunding());
        result.put("nsfrRatio", latest.getNsfrRatio() != null ? latest.getNsfrRatio() : BigDecimal.ZERO);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/liquidity/top-depositors")
    @Operation(summary = "Top 10 depositors concentration")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTopDepositors() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        if (metrics.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("top10DepositorPct", BigDecimal.ZERO);
            empty.put("concentrationRisk", "LOW");
            return ResponseEntity.ok(ApiResponse.ok(empty));
        }

        LiquidityMetric latest = metrics.get(0);
        BigDecimal top10Pct = latest.getTop10DepositorPct() != null ? latest.getTop10DepositorPct() : BigDecimal.ZERO;
        String risk = top10Pct.compareTo(new BigDecimal("30")) > 0 ? "HIGH" :
                top10Pct.compareTo(new BigDecimal("20")) > 0 ? "MEDIUM" : "LOW";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("metricDate", latest.getMetricDate().toString());
        result.put("top10DepositorPct", top10Pct);
        result.put("concentrationRisk", risk);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ===========================
    // OPERATIONAL RISK SUB-ENDPOINTS
    // ===========================

    @GetMapping("/operational/stats")
    @Operation(summary = "Operational risk summary stats")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOpRiskStats() {
        long totalLossEvents = opRiskLossEventRepository.count();
        List<OpRiskKri> activeKris = opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc();
        List<OpRiskKriReading> latestReadings = opRiskKriReadingRepository.findByReadingDateOrderByRagStatusDescKriIdAsc(LocalDate.now());
        long breaches = latestReadings.stream().filter(r -> "RED".equals(r.getRagStatus())).count();
        BigDecimal totalNetLoss = opRiskLossEventRepository.totalNetLoss(
                LocalDate.now().withDayOfYear(1), LocalDate.now());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalLossEvents", totalLossEvents);
        stats.put("kriBreaches", breaches);
        stats.put("activeKriCount", activeKris.size());
        stats.put("totalNetLossYtd", totalNetLoss != null ? totalNetLoss : BigDecimal.ZERO);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/operational/loss-events")
    @Operation(summary = "Recent operational risk loss events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskLossEvent>>> getRecentLossEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<OpRiskLossEvent> result = opRiskLossEventRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/operational/loss-by-category")
    @Operation(summary = "Loss events grouped by category")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLossByCategory() {
        List<OpRiskLossEvent> allEvents = opRiskLossEventRepository.findAll();
        Map<String, List<OpRiskLossEvent>> byCategory = allEvents.stream()
                .collect(Collectors.groupingBy(OpRiskLossEvent::getEventCategory));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<OpRiskLossEvent>> entry : byCategory.entrySet()) {
            BigDecimal totalLoss = entry.getValue().stream()
                    .map(e -> e.getNetLoss() != null ? e.getNetLoss() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("category", entry.getKey());
            item.put("eventCount", entry.getValue().size());
            item.put("totalNetLoss", totalLoss);
            result.add(item);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/operational/loss-trend")
    @Operation(summary = "Monthly operational loss trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLossTrend() {
        List<OpRiskLossEvent> allEvents = opRiskLossEventRepository.findAll();
        Map<String, List<OpRiskLossEvent>> byMonth = allEvents.stream()
                .filter(e -> e.getEventDate() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getEventDate().withDayOfMonth(1).toString(),
                        TreeMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<String, List<OpRiskLossEvent>> entry : byMonth.entrySet()) {
            BigDecimal totalLoss = entry.getValue().stream()
                    .map(e -> e.getNetLoss() != null ? e.getNetLoss() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", entry.getKey());
            item.put("eventCount", entry.getValue().size());
            item.put("totalNetLoss", totalLoss);
            trend.add(item);
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/operational/kris")
    @Operation(summary = "Key risk indicators with thresholds and latest readings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getOpRiskKris() {
        List<OpRiskKri> kris = opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc();

        List<Map<String, Object>> result = kris.stream()
                .map(kri -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", kri.getId());
                    m.put("kriCode", kri.getKriCode());
                    m.put("kriName", kri.getKriName());
                    m.put("kriCategory", kri.getKriCategory());
                    m.put("measurementUnit", kri.getMeasurementUnit());
                    m.put("thresholdAmber", kri.getThresholdAmber());
                    m.put("thresholdRed", kri.getThresholdRed());
                    m.put("frequency", kri.getFrequency());
                    m.put("owner", kri.getOwner());
                    List<OpRiskKriReading> readings = opRiskKriReadingRepository
                            .findByKriIdOrderByReadingDateDesc(kri.getId());
                    if (!readings.isEmpty()) {
                        OpRiskKriReading latest = readings.get(0);
                        m.put("latestValue", latest.getValue());
                        m.put("latestRagStatus", latest.getRagStatus());
                        m.put("latestReadingDate", latest.getReadingDate().toString());
                    }
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/operational/rcsa")
    @Operation(summary = "Risk control self-assessments derived from KRI readings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRcsa() {
        List<OpRiskKri> kris = opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc();

        List<Map<String, Object>> rcsaList = kris.stream()
                .map(kri -> {
                    List<OpRiskKriReading> readings = opRiskKriReadingRepository
                            .findByKriIdOrderByReadingDateDesc(kri.getId());
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("kriCode", kri.getKriCode());
                    m.put("kriName", kri.getKriName());
                    m.put("category", kri.getKriCategory());
                    m.put("owner", kri.getOwner());
                    m.put("readingCount", readings.size());
                    long redCount = readings.stream().filter(r -> "RED".equals(r.getRagStatus())).count();
                    long amberCount = readings.stream().filter(r -> "AMBER".equals(r.getRagStatus())).count();
                    m.put("redReadings", redCount);
                    m.put("amberReadings", amberCount);
                    m.put("riskLevel", redCount > 0 ? "HIGH" : amberCount > 0 ? "MEDIUM" : "LOW");
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(rcsaList));
    }

    @GetMapping("/operational/incidents")
    @Operation(summary = "Operational incidents with REPORTED status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskLossEvent>>> getIncidents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<OpRiskLossEvent> result = opRiskLossEventRepository.findByStatusOrderByNetLossDesc(
                "REPORTED", PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ===========================
    // RISK OVERVIEW SUB-ENDPOINTS
    // ===========================

    @GetMapping("/appetite")
    @Operation(summary = "Risk appetite statement metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRiskAppetite() {
        List<MarketRiskPosition> marketBreaches = marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc();
        List<LiquidityMetric> lcrBreaches = liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc();
        BigDecimal opRiskLossYtd = opRiskLossEventRepository.totalNetLoss(
                LocalDate.now().withDayOfYear(1), LocalDate.now());
        List<OpRiskKri> activeKris = opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc();

        Map<String, Object> appetite = new LinkedHashMap<>();
        appetite.put("marketRiskBreaches", marketBreaches.size());
        appetite.put("liquidityBreaches", lcrBreaches.size());
        appetite.put("opRiskLossYtd", opRiskLossYtd != null ? opRiskLossYtd : BigDecimal.ZERO);
        appetite.put("activeKriCount", activeKris.size());

        List<LiquidityMetric> latestLiquidity = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();
        if (!latestLiquidity.isEmpty()) {
            appetite.put("currentLcr", latestLiquidity.get(0).getLcrRatio());
            appetite.put("currentNsfr", latestLiquidity.get(0).getNsfrRatio());
            appetite.put("lcrLimit", latestLiquidity.get(0).getLcrLimit());
            appetite.put("nsfrLimit", latestLiquidity.get(0).getNsfrLimit());
        }

        return ResponseEntity.ok(ApiResponse.ok(appetite));
    }

    @GetMapping("/heatmap")
    @Operation(summary = "Risk categories with likelihood/impact scores")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRiskHeatmap() {
        List<Map<String, Object>> heatmap = new ArrayList<>();

        long marketBreachCount = marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc().size();
        long totalMarketPositions = marketRiskPositionRepository.count();
        int marketLikelihood = totalMarketPositions == 0 ? 1 :
                (int) Math.min(5, 1 + (marketBreachCount * 5 / totalMarketPositions));
        Map<String, Object> marketEntry = new LinkedHashMap<>();
        marketEntry.put("category", "MARKET_RISK");
        marketEntry.put("likelihood", marketLikelihood);
        marketEntry.put("impact", marketBreachCount > 5 ? 4 : marketBreachCount > 0 ? 3 : 1);
        marketEntry.put("breachCount", marketBreachCount);
        heatmap.add(marketEntry);

        long lcrBreachCount = liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc().size();
        long totalLiquidityMetrics = liquidityMetricRepository.count();
        int liquidityLikelihood = totalLiquidityMetrics == 0 ? 1 :
                (int) Math.min(5, 1 + (lcrBreachCount * 5 / totalLiquidityMetrics));
        Map<String, Object> liquidityEntry = new LinkedHashMap<>();
        liquidityEntry.put("category", "LIQUIDITY_RISK");
        liquidityEntry.put("likelihood", liquidityLikelihood);
        liquidityEntry.put("impact", lcrBreachCount > 3 ? 5 : lcrBreachCount > 0 ? 3 : 1);
        liquidityEntry.put("breachCount", lcrBreachCount);
        heatmap.add(liquidityEntry);

        long totalLossEvents = opRiskLossEventRepository.count();
        BigDecimal opLoss = opRiskLossEventRepository.totalNetLoss(
                LocalDate.now().withDayOfYear(1), LocalDate.now());
        int opLikelihood = totalLossEvents > 20 ? 5 : totalLossEvents > 10 ? 4 :
                totalLossEvents > 5 ? 3 : totalLossEvents > 0 ? 2 : 1;
        Map<String, Object> opEntry = new LinkedHashMap<>();
        opEntry.put("category", "OPERATIONAL_RISK");
        opEntry.put("likelihood", opLikelihood);
        opEntry.put("impact", opLoss != null && opLoss.compareTo(new BigDecimal("1000000")) > 0 ? 5 :
                opLoss != null && opLoss.compareTo(BigDecimal.ZERO) > 0 ? 3 : 1);
        opEntry.put("totalLossEvents", totalLossEvents);
        heatmap.add(opEntry);

        return ResponseEntity.ok(ApiResponse.ok(heatmap));
    }

    // Helper
    private BigDecimal sumField(List<MarketRiskPosition> positions,
                                 java.util.function.Function<MarketRiskPosition, BigDecimal> getter) {
        return positions.stream()
                .map(p -> {
                    BigDecimal v = getter.apply(p);
                    return v != null ? v : BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
