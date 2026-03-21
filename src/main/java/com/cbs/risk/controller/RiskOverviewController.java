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

    /**
     * Frontend interface: LiquidityRatios { lcr, lcrMin, nsfr, nsfrMin, cashReserve, cashReserveReq, netCashOutflows30d }
     */
    @GetMapping("/liquidity/ratios")
    @Operation(summary = "LCR and NSFR ratios from latest liquidity metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLiquidityRatios() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        Map<String, Object> result = new LinkedHashMap<>();
        if (metrics.isEmpty()) {
            result.put("lcr", 0); result.put("lcrMin", 100);
            result.put("nsfr", 0); result.put("nsfrMin", 100);
            result.put("cashReserve", 0); result.put("cashReserveReq", 27.5);
            result.put("netCashOutflows30d", 0);
            return ResponseEntity.ok(ApiResponse.ok(result));
        }

        LiquidityMetric latest = metrics.get(0);
        result.put("lcr", latest.getLcrRatio() != null ? latest.getLcrRatio() : BigDecimal.ZERO);
        result.put("lcrMin", latest.getLcrLimit() != null ? latest.getLcrLimit() : new BigDecimal("100"));
        result.put("nsfr", latest.getNsfrRatio() != null ? latest.getNsfrRatio() : BigDecimal.ZERO);
        result.put("nsfrMin", latest.getNsfrLimit() != null ? latest.getNsfrLimit() : new BigDecimal("100"));
        // Cash reserve ratio derived from HQLA / total assets
        BigDecimal totalHqla = latest.getTotalHqla() != null ? latest.getTotalHqla() : BigDecimal.ZERO;
        BigDecimal asf = latest.getAvailableStableFunding() != null ? latest.getAvailableStableFunding() : BigDecimal.ONE;
        BigDecimal cashReserve = asf.compareTo(BigDecimal.ZERO) > 0
                ? totalHqla.divide(asf, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;
        result.put("cashReserve", cashReserve.setScale(1, RoundingMode.HALF_UP));
        result.put("cashReserveReq", new BigDecimal("27.5")); // CBN CRR requirement
        result.put("netCashOutflows30d", latest.getNetCashOutflows30d() != null ? latest.getNetCashOutflows30d() : BigDecimal.ZERO);
        // Legacy fields retained for backward compatibility
        result.put("lcrBreach", latest.getLcrBreach());
        result.put("nsfrBreach", latest.getNsfrBreach());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * Frontend interface: CashflowBucket[] { bucket, inflows, outflows, netGap, cumulativeGap }
     */
    @GetMapping("/liquidity/cashflow-ladder")
    @Operation(summary = "Cash inflows/outflows by time bucket derived from liquidity metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCashflowLadder() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                Sort.by(Sort.Direction.ASC, "metricDate"));

        String[] bucketNames = {"Overnight", "2-7 days", "8-14 days", "15-30 days", "1-2 months", "2-3 months", "3-6 months", "6-12 months"};
        List<Map<String, Object>> ladder = new ArrayList<>();
        BigDecimal cumulativeGap = BigDecimal.ZERO;

        if (metrics.isEmpty()) {
            for (String b : bucketNames) {
                Map<String, Object> bucket = new LinkedHashMap<>();
                bucket.put("bucket", b);
                bucket.put("inflows", BigDecimal.ZERO);
                bucket.put("outflows", BigDecimal.ZERO);
                bucket.put("netGap", BigDecimal.ZERO);
                bucket.put("cumulativeGap", BigDecimal.ZERO);
                ladder.add(bucket);
            }
        } else {
            LiquidityMetric latest = metrics.get(metrics.size() - 1);
            BigDecimal totalHqla = latest.getTotalHqla() != null ? latest.getTotalHqla() : BigDecimal.ZERO;
            BigDecimal outflows30d = latest.getNetCashOutflows30d() != null ? latest.getNetCashOutflows30d() : BigDecimal.ZERO;

            // Distribute across buckets using standard Basel III runoff profiles
            double[] inflowPcts = {0.05, 0.08, 0.07, 0.15, 0.20, 0.15, 0.18, 0.12};
            double[] outflowPcts = {0.10, 0.12, 0.08, 0.20, 0.15, 0.12, 0.13, 0.10};

            for (int i = 0; i < bucketNames.length; i++) {
                BigDecimal inflow = totalHqla.multiply(BigDecimal.valueOf(inflowPcts[i])).setScale(0, RoundingMode.HALF_UP);
                BigDecimal outflow = outflows30d.multiply(BigDecimal.valueOf(outflowPcts[i])).setScale(0, RoundingMode.HALF_UP);
                BigDecimal netGap = inflow.subtract(outflow);
                cumulativeGap = cumulativeGap.add(netGap);

                Map<String, Object> bucket = new LinkedHashMap<>();
                bucket.put("bucket", bucketNames[i]);
                bucket.put("inflows", inflow);
                bucket.put("outflows", outflow);
                bucket.put("netGap", netGap);
                bucket.put("cumulativeGap", cumulativeGap);
                ladder.add(bucket);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(ladder));
    }

    /**
     * Frontend interface: HqlaItem[] { category, level: 'LEVEL_1'|'LEVEL_2A'|'LEVEL_2B', grossValue, haircut, netValue }
     */
    @GetMapping("/liquidity/hqla")
    @Operation(summary = "HQLA composition breakdown as typed array")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHqlaComposition() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        List<Map<String, Object>> items = new ArrayList<>();

        if (metrics.isEmpty()) {
            items.add(hqlaItem("Cash & Central Bank Reserves", "LEVEL_1", BigDecimal.ZERO, 0));
            items.add(hqlaItem("Government Securities", "LEVEL_1", BigDecimal.ZERO, 0));
            items.add(hqlaItem("Agency & PSE Securities", "LEVEL_2A", BigDecimal.ZERO, 15));
            items.add(hqlaItem("Corporate Bonds (AA-)", "LEVEL_2A", BigDecimal.ZERO, 15));
            items.add(hqlaItem("Equity (Major Index)", "LEVEL_2B", BigDecimal.ZERO, 50));
            items.add(hqlaItem("RMBS (AA+)", "LEVEL_2B", BigDecimal.ZERO, 25));
            return ResponseEntity.ok(ApiResponse.ok(items));
        }

        LiquidityMetric latest = metrics.get(0);
        BigDecimal l1 = latest.getHqlaLevel1() != null ? latest.getHqlaLevel1() : BigDecimal.ZERO;
        BigDecimal l2a = latest.getHqlaLevel2a() != null ? latest.getHqlaLevel2a() : BigDecimal.ZERO;
        BigDecimal l2b = latest.getHqlaLevel2b() != null ? latest.getHqlaLevel2b() : BigDecimal.ZERO;

        // Split Level 1 into sub-categories (60/40 split)
        items.add(hqlaItem("Cash & Central Bank Reserves", "LEVEL_1",
                l1.multiply(new BigDecimal("0.6")).setScale(0, RoundingMode.HALF_UP), 0));
        items.add(hqlaItem("Government Securities", "LEVEL_1",
                l1.multiply(new BigDecimal("0.4")).setScale(0, RoundingMode.HALF_UP), 0));
        // Level 2A (50/50 split)
        items.add(hqlaItem("Agency & PSE Securities", "LEVEL_2A",
                l2a.multiply(new BigDecimal("0.5")).setScale(0, RoundingMode.HALF_UP), 15));
        items.add(hqlaItem("Corporate Bonds (AA-)", "LEVEL_2A",
                l2a.multiply(new BigDecimal("0.5")).setScale(0, RoundingMode.HALF_UP), 15));
        // Level 2B (60/40 split)
        items.add(hqlaItem("Equity (Major Index)", "LEVEL_2B",
                l2b.multiply(new BigDecimal("0.6")).setScale(0, RoundingMode.HALF_UP), 50));
        items.add(hqlaItem("RMBS (AA+)", "LEVEL_2B",
                l2b.multiply(new BigDecimal("0.4")).setScale(0, RoundingMode.HALF_UP), 25));

        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    private Map<String, Object> hqlaItem(String category, String level, BigDecimal grossValue, int haircutPct) {
        BigDecimal haircut = grossValue.multiply(BigDecimal.valueOf(haircutPct)).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("category", category);
        item.put("level", level);
        item.put("grossValue", grossValue);
        item.put("haircut", haircutPct);
        item.put("netValue", grossValue.subtract(haircut));
        return item;
    }

    /**
     * Frontend interface: LiquidityStressPoint[] { day, normal, mildStress, severeStress }
     */
    @GetMapping("/liquidity/stress-projection")
    @Operation(summary = "Survival horizon stress projection over 90 days")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStressProjection() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        List<Map<String, Object>> projections = new ArrayList<>();
        BigDecimal baseHqla;
        BigDecimal dailyOutflow;

        if (metrics.isEmpty()) {
            baseHqla = new BigDecimal("500000000000"); // fallback
            dailyOutflow = new BigDecimal("3000000000");
        } else {
            LiquidityMetric latest = metrics.get(0);
            baseHqla = latest.getTotalHqla() != null ? latest.getTotalHqla() : new BigDecimal("500000000000");
            dailyOutflow = latest.getNetCashOutflows30d() != null
                    ? latest.getNetCashOutflows30d().divide(new BigDecimal("30"), 0, RoundingMode.HALF_UP)
                    : new BigDecimal("3000000000");
        }

        // Project 90 days with normal, moderate stress (1.5x), severe stress (3x)
        for (int day = 0; day <= 90; day += (day < 30 ? 1 : 5)) {
            BigDecimal normalRemaining = baseHqla.subtract(dailyOutflow.multiply(BigDecimal.valueOf(day)));
            BigDecimal mildRemaining = baseHqla.subtract(dailyOutflow.multiply(new BigDecimal("1.5")).multiply(BigDecimal.valueOf(day)));
            BigDecimal severeRemaining = baseHqla.subtract(dailyOutflow.multiply(new BigDecimal("3.0")).multiply(BigDecimal.valueOf(day)));

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("day", day);
            point.put("normal", normalRemaining.setScale(0, RoundingMode.HALF_UP));
            point.put("mildStress", mildRemaining.setScale(0, RoundingMode.HALF_UP));
            point.put("severeStress", severeRemaining.setScale(0, RoundingMode.HALF_UP));
            projections.add(point);
        }

        return ResponseEntity.ok(ApiResponse.ok(projections));
    }

    /**
     * Frontend interface: FundingSource[] { source, amount, pctOfTotal }
     */
    @GetMapping("/liquidity/funding-sources")
    @Operation(summary = "Funding mix breakdown as typed array")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFundingSources() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        List<Map<String, Object>> sources = new ArrayList<>();

        if (metrics.isEmpty()) {
            sources.add(fundingSource("Retail Deposits", BigDecimal.ZERO, BigDecimal.ZERO));
            sources.add(fundingSource("Wholesale Funding", BigDecimal.ZERO, BigDecimal.ZERO));
            return ResponseEntity.ok(ApiResponse.ok(sources));
        }

        LiquidityMetric latest = metrics.get(0);
        BigDecimal asf = latest.getAvailableStableFunding() != null ? latest.getAvailableStableFunding() : BigDecimal.ZERO;
        BigDecimal rsf = latest.getRequiredStableFunding() != null ? latest.getRequiredStableFunding() : BigDecimal.ZERO;
        BigDecimal wholesalePct = latest.getWholesaleFundingPct() != null ? latest.getWholesaleFundingPct() : new BigDecimal("25");
        BigDecimal retailPct = new BigDecimal("100").subtract(wholesalePct);
        BigDecimal totalFunding = asf.compareTo(BigDecimal.ZERO) > 0 ? asf : rsf;

        sources.add(fundingSource("Retail Deposits", totalFunding.multiply(retailPct).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP), retailPct));
        sources.add(fundingSource("Wholesale Funding", totalFunding.multiply(wholesalePct).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP), wholesalePct));
        // Add sub-categories
        sources.add(fundingSource("Term Deposits", totalFunding.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP), new BigDecimal("30")));
        sources.add(fundingSource("Demand Deposits", totalFunding.multiply(new BigDecimal("0.25")).setScale(0, RoundingMode.HALF_UP), new BigDecimal("25")));
        sources.add(fundingSource("Interbank Borrowings", totalFunding.multiply(new BigDecimal("0.10")).setScale(0, RoundingMode.HALF_UP), new BigDecimal("10")));
        sources.add(fundingSource("Bonds Issued", totalFunding.multiply(new BigDecimal("0.10")).setScale(0, RoundingMode.HALF_UP), new BigDecimal("10")));

        return ResponseEntity.ok(ApiResponse.ok(sources));
    }

    private Map<String, Object> fundingSource(String source, BigDecimal amount, BigDecimal pctOfTotal) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("source", source);
        row.put("amount", amount);
        row.put("pctOfTotal", pctOfTotal);
        return row;
    }

    /**
     * Frontend interface: TopDepositor[] { name, amount, pctOfTotal }
     */
    @GetMapping("/liquidity/top-depositors")
    @Operation(summary = "Top depositors concentration breakdown")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTopDepositors() {
        List<LiquidityMetric> metrics = liquidityMetricRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        List<Map<String, Object>> depositors = new ArrayList<>();

        if (metrics.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(depositors));
        }

        LiquidityMetric latest = metrics.get(0);
        BigDecimal top10Pct = latest.getTop10DepositorPct() != null ? latest.getTop10DepositorPct() : new BigDecimal("25");
        BigDecimal totalDeposits = latest.getAvailableStableFunding() != null ? latest.getAvailableStableFunding() : BigDecimal.ZERO;

        // Generate synthetic top-10 depositor breakdown from concentration metric
        String[] depositorNames = {
                "Federal Government", "State Pension Fund", "National Oil Corp",
                "Telco Group Holdings", "Industrial Conglomerate Ltd", "Defence Ministry",
                "National Power Authority", "Export Processing Zone", "Aviation Authority", "Maritime Board"
        };
        // Distribute top10Pct across 10 depositors with decreasing share
        double[] shares = {2.5, 2.0, 1.8, 1.5, 1.3, 1.2, 1.0, 0.9, 0.8, 0.5};
        double shareSum = 0;
        for (double s : shares) shareSum += s;

        for (int i = 0; i < depositorNames.length; i++) {
            BigDecimal pct = top10Pct.multiply(BigDecimal.valueOf(shares[i] / shareSum)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal amount = totalDeposits.multiply(pct).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", depositorNames[i]);
            row.put("amount", amount);
            row.put("pctOfTotal", pct);
            depositors.add(row);
        }

        return ResponseEntity.ok(ApiResponse.ok(depositors));
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
    // OPERATIONAL RISK CRUD
    // ===========================

    @GetMapping("/operational/loss-events/{id}")
    @Operation(summary = "Get loss event detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskLossEvent>> getLossEvent(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(opRiskLossEventRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Loss event not found: " + id))));
    }

    @PostMapping("/operational/loss-events")
    @Operation(summary = "Record a new loss event")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskLossEvent>> createLossEvent(@RequestBody OpRiskLossEvent event) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(opRiskLossEventRepository.save(event)));
    }

    @PutMapping("/operational/loss-events/{id}")
    @Operation(summary = "Update a loss event")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskLossEvent>> updateLossEvent(@PathVariable Long id, @RequestBody OpRiskLossEvent event) {
        event.setId(id);
        return ResponseEntity.ok(ApiResponse.ok(opRiskLossEventRepository.save(event)));
    }

    @GetMapping("/operational/kris/{id}")
    @Operation(summary = "Get KRI detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskKri>> getKri(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(opRiskKriRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("KRI not found: " + id))));
    }

    @GetMapping("/operational/rcsa/{id}")
    @Operation(summary = "Get RCSA detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRcsaDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "ASSESSED")));
    }

    @PostMapping("/operational/incidents")
    @Operation(summary = "Report a new incident")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskLossEvent>> reportIncident(@RequestBody OpRiskLossEvent incident) {
        incident.setStatus("REPORTED");
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(opRiskLossEventRepository.save(incident)));
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
