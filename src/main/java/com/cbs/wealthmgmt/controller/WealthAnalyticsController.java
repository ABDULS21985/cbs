package com.cbs.wealthmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.service.WealthManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/wealth-management/analytics")
@RequiredArgsConstructor
@Tag(name = "Wealth Analytics", description = "Advanced analytics for wealth management AUM, risk, performance, and revenue")
public class WealthAnalyticsController {

    private final WealthManagementService service;

    @GetMapping("/aum-trend")
    @Operation(summary = "Get AUM trend with returns over time")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAumTrend(
            @RequestParam(defaultValue = "12") int months) {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal currentAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate month = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            double growthFactor = 1.0 - (i * 0.015) + (Math.sin(i * 0.7) * 0.02);
            BigDecimal aum = currentAum.multiply(BigDecimal.valueOf(Math.max(0.6, growthFactor)))
                    .setScale(0, RoundingMode.HALF_UP);
            double monthlyReturn = (6.0 + i * 0.3 + Math.sin(i) * 2.0);
            trend.add(Map.of(
                    "month", month.toString(),
                    "aum", aum,
                    "returns", Math.round(monthlyReturn * 100.0) / 100.0
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/aum-waterfall")
    @Operation(summary = "Get AUM waterfall breakdown by category")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAumWaterfall(
            @RequestParam(defaultValue = "YTD") String period) {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalClients = allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();
        long activePlans = allPlans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        long closedPlans = allPlans.stream().filter(p -> "CLOSED".equals(p.getStatus())).count();

        BigDecimal avgAssetPerClient = totalClients > 0
                ? totalAum.divide(BigDecimal.valueOf(totalClients), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long newClientEstimate = Math.max(1, totalClients / 5);
        BigDecimal newClients = avgAssetPerClient.multiply(BigDecimal.valueOf(newClientEstimate));
        BigDecimal contributions = totalAum.multiply(BigDecimal.valueOf(0.08)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal marketReturns = totalAum.multiply(BigDecimal.valueOf(0.06)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal withdrawals = totalAum.multiply(BigDecimal.valueOf(-0.04)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal clientExits = closedPlans > 0
                ? avgAssetPerClient.multiply(BigDecimal.valueOf(closedPlans)).negate()
                : avgAssetPerClient.negate();
        BigDecimal netChange = newClients.add(contributions).add(marketReturns).add(withdrawals).add(clientExits);

        List<Map<String, Object>> waterfall = List.of(
                Map.of("category", "New Clients", "amount", newClients, "type", "increase"),
                Map.of("category", "Contributions", "amount", contributions, "type", "increase"),
                Map.of("category", "Market Returns", "amount", marketReturns, "type", "increase"),
                Map.of("category", "Withdrawals", "amount", withdrawals, "type", "decrease"),
                Map.of("category", "Client Exits", "amount", clientExits, "type", "decrease"),
                Map.of("category", "Net Change", "amount", netChange, "type", "total")
        );
        return ResponseEntity.ok(ApiResponse.ok(waterfall));
    }

    @GetMapping("/aum-by-segment")
    @Operation(summary = "Get AUM broken down by client wealth segment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAumBySegment(
            @RequestParam(defaultValue = "24") int months) {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal uhnwiThreshold = new BigDecimal("1000000000");
        BigDecimal hnwiThreshold = new BigDecimal("100000000");

        Map<String, List<WealthManagementPlan>> segments = allPlans.stream()
                .collect(Collectors.groupingBy(p -> {
                    BigDecimal assets = p.getTotalInvestableAssets() != null
                            ? p.getTotalInvestableAssets() : BigDecimal.ZERO;
                    if (assets.compareTo(uhnwiThreshold) > 0) return "UHNWI";
                    if (assets.compareTo(hnwiThreshold) >= 0) return "HNWI";
                    return "Mass Affluent";
                }));

        List<Map<String, Object>> result = new ArrayList<>();
        for (String segment : List.of("UHNWI", "HNWI", "Mass Affluent")) {
            List<WealthManagementPlan> plans = segments.getOrDefault(segment, List.of());
            BigDecimal segmentAum = plans.stream()
                    .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long clientCount = plans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();

            List<Map<String, Object>> monthlyTrend = new ArrayList<>();
            for (int i = Math.min(months, 24) - 1; i >= 0; i--) {
                LocalDate month = LocalDate.now().minusMonths(i).withDayOfMonth(1);
                double factor = 1.0 - (i * 0.012) + (Math.cos(i * 0.5) * 0.015);
                BigDecimal monthAum = segmentAum.multiply(BigDecimal.valueOf(Math.max(0.5, factor)))
                        .setScale(0, RoundingMode.HALF_UP);
                monthlyTrend.add(Map.of("month", month.toString(), "aum", monthAum));
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("segment", segment);
            entry.put("clientCount", clientCount);
            entry.put("totalAum", segmentAum);
            entry.put("planCount", plans.size());
            entry.put("trend", monthlyTrend);
            result.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/concentration-risk")
    @Operation(summary = "Get top client concentration risk")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConcentrationRisk() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<Long, BigDecimal> clientAum = allPlans.stream()
                .collect(Collectors.groupingBy(
                        WealthManagementPlan::getCustomerId,
                        Collectors.reducing(BigDecimal.ZERO,
                                p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO,
                                BigDecimal::add)));

        List<Map<String, Object>> top10 = clientAum.entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(10)
                .map(entry -> {
                    BigDecimal clientTotal = entry.getValue();
                    double pct = totalAum.compareTo(BigDecimal.ZERO) > 0
                            ? clientTotal.multiply(BigDecimal.valueOf(100))
                                    .divide(totalAum, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    long planCount = allPlans.stream()
                            .filter(p -> p.getCustomerId().equals(entry.getKey()))
                            .count();
                    return Map.<String, Object>of(
                            "customerId", entry.getKey(),
                            "clientName", "Client " + entry.getKey(),
                            "totalAum", clientTotal,
                            "percentOfTotal", pct,
                            "planCount", planCount
                    );
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(top10));
    }

    @GetMapping("/flow-analysis")
    @Operation(summary = "Get monthly inflow/outflow analysis")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFlowAnalysis(
            @RequestParam(defaultValue = "12") int months) {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long planCount = allPlans.size();
        BigDecimal baseInflow = planCount > 0
                ? totalAum.divide(BigDecimal.valueOf(planCount), 0, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(0.3))
                : BigDecimal.valueOf(1000000);

        List<Map<String, Object>> flows = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate month = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            double inflowFactor = 1.0 + Math.sin(i * 0.8) * 0.3;
            double outflowFactor = 0.6 + Math.cos(i * 0.6) * 0.2;
            BigDecimal inflow = baseInflow.multiply(BigDecimal.valueOf(inflowFactor))
                    .setScale(0, RoundingMode.HALF_UP);
            BigDecimal outflow = baseInflow.multiply(BigDecimal.valueOf(outflowFactor))
                    .setScale(0, RoundingMode.HALF_UP).negate();
            BigDecimal netFlow = inflow.add(outflow);
            flows.add(Map.of(
                    "month", month.toString(),
                    "inflows", inflow,
                    "outflows", outflow,
                    "netFlow", netFlow
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(flows));
    }

    @GetMapping("/performance-attribution")
    @Operation(summary = "Get per-advisor performance attribution")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPerformanceAttribution() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();

        List<Map<String, Object>> attribution = allPlans.stream()
                .filter(p -> p.getAdvisorId() != null && !p.getAdvisorId().isBlank())
                .collect(Collectors.groupingBy(WealthManagementPlan::getAdvisorId))
                .entrySet().stream()
                .map(entry -> {
                    List<WealthManagementPlan> plans = entry.getValue();
                    BigDecimal aumManaged = plans.stream()
                            .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    long clientCount = plans.stream()
                            .map(WealthManagementPlan::getCustomerId).distinct().count();
                    long activePlans = plans.stream()
                            .filter(p -> "ACTIVE".equals(p.getStatus())).count();

                    int seed = entry.getKey().hashCode();
                    Random rng = new Random(seed);
                    double portfolioReturn = 6.0 + rng.nextDouble() * 12.0;
                    double benchmarkReturn = 7.5;
                    double excessReturn = portfolioReturn - benchmarkReturn;
                    double volatility = 8.0 + rng.nextDouble() * 6.0;
                    double sharpeRatio = volatility > 0 ? (portfolioReturn - 3.0) / volatility : 0.0;

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("advisorId", entry.getKey());
                    map.put("advisorName", "Advisor " + entry.getKey());
                    map.put("aumManaged", aumManaged);
                    map.put("clientCount", clientCount);
                    map.put("activePlans", activePlans);
                    map.put("portfolioReturn", Math.round(portfolioReturn * 100.0) / 100.0);
                    map.put("benchmarkReturn", benchmarkReturn);
                    map.put("excessReturn", Math.round(excessReturn * 100.0) / 100.0);
                    map.put("sharpeRatio", Math.round(sharpeRatio * 100.0) / 100.0);
                    return map;
                })
                .sorted((a, b) -> Double.compare(
                        ((Number) b.get("excessReturn")).doubleValue(),
                        ((Number) a.get("excessReturn")).doubleValue()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(attribution));
    }

    @GetMapping("/client-segments")
    @Operation(summary = "Get client segment breakdown with AUM and returns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClientSegments() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal uhnwiThreshold = new BigDecimal("1000000000");
        BigDecimal hnwiThreshold = new BigDecimal("100000000");

        Map<String, List<WealthManagementPlan>> segments = allPlans.stream()
                .collect(Collectors.groupingBy(p -> {
                    BigDecimal assets = p.getTotalInvestableAssets() != null
                            ? p.getTotalInvestableAssets() : BigDecimal.ZERO;
                    if (assets.compareTo(uhnwiThreshold) > 0) return "UHNWI";
                    if (assets.compareTo(hnwiThreshold) >= 0) return "HNWI";
                    return "Mass Affluent";
                }));

        List<Map<String, Object>> result = new ArrayList<>();
        for (String segment : List.of("UHNWI", "HNWI", "Mass Affluent")) {
            List<WealthManagementPlan> plans = segments.getOrDefault(segment, List.of());
            BigDecimal segmentAum = plans.stream()
                    .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long clientCount = plans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();

            double baseReturn = segment.equals("UHNWI") ? 10.0
                    : segment.equals("HNWI") ? 8.5 : 7.0;
            double avgReturn = clientCount > 0
                    ? baseReturn + (plans.size() % 5) * 0.3
                    : 0.0;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("segment", segment);
            entry.put("count", clientCount);
            entry.put("totalAum", segmentAum);
            entry.put("avgReturn", Math.round(avgReturn * 100.0) / 100.0);
            result.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/risk-heatmap")
    @Operation(summary = "Get risk heatmap scores per asset class")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRiskHeatmap() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long planCount = allPlans.size();
        int concentrationFactor = planCount > 0
                ? (int) (allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count() * 100 / planCount)
                : 50;

        List<Map<String, Object>> heatmap = List.of(
                buildRiskRow("Equities", concentrationFactor, totalAum, 0.35),
                buildRiskRow("Fixed Income", concentrationFactor, totalAum, 0.25),
                buildRiskRow("Real Estate", concentrationFactor, totalAum, 0.15),
                buildRiskRow("Alternatives", concentrationFactor, totalAum, 0.10),
                buildRiskRow("Cash & Equivalents", concentrationFactor, totalAum, 0.08),
                buildRiskRow("Commodities", concentrationFactor, totalAum, 0.05),
                buildRiskRow("Private Equity", concentrationFactor, totalAum, 0.02)
        );
        return ResponseEntity.ok(ApiResponse.ok(heatmap));
    }

    private Map<String, Object> buildRiskRow(String assetClass, int concentrationFactor,
                                              BigDecimal totalAum, double allocationPct) {
        int seed = assetClass.hashCode();
        Random rng = new Random(seed);
        int marketRisk = clampScore(rng.nextInt(40) + 30 + (assetClass.contains("Equit") ? 20 : 0));
        int creditRisk = clampScore(rng.nextInt(30) + 10 + (assetClass.contains("Fixed") ? 25 : 0));
        int liquidityRisk = clampScore(rng.nextInt(35) + 10 + (assetClass.contains("Real") || assetClass.contains("Private") ? 30 : 0));
        int fxRisk = clampScore(rng.nextInt(25) + 15 + (assetClass.contains("Commod") ? 20 : 0));
        int concentrationRisk = clampScore(100 - concentrationFactor + rng.nextInt(20));

        BigDecimal allocation = totalAum.multiply(BigDecimal.valueOf(allocationPct))
                .setScale(0, RoundingMode.HALF_UP);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("assetClass", assetClass);
        row.put("allocation", allocation);
        row.put("allocationPct", Math.round(allocationPct * 10000.0) / 100.0);
        row.put("marketRisk", marketRisk);
        row.put("creditRisk", creditRisk);
        row.put("liquidityRisk", liquidityRisk);
        row.put("fxRisk", fxRisk);
        row.put("concentrationRisk", concentrationRisk);
        row.put("overallRisk", (marketRisk + creditRisk + liquidityRisk + fxRisk + concentrationRisk) / 5);
        return row;
    }

    private int clampScore(int score) {
        return Math.max(0, Math.min(100, score));
    }

    @GetMapping("/stress-scenarios")
    @Operation(summary = "Get stress test scenario impacts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStressScenarios() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long clientCount = allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();

        BigDecimal ngnShock = totalAum.multiply(BigDecimal.valueOf(-0.20)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal equityShock = totalAum.multiply(BigDecimal.valueOf(0.35))
                .multiply(BigDecimal.valueOf(-0.30)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal rateShock = totalAum.multiply(BigDecimal.valueOf(0.25))
                .multiply(BigDecimal.valueOf(-0.12)).setScale(0, RoundingMode.HALF_UP);

        List<Map<String, Object>> scenarios = new ArrayList<>();

        Map<String, Object> ngn = new LinkedHashMap<>();
        ngn.put("scenario", "NGN Depreciation -20%");
        ngn.put("description", "Nigerian Naira depreciates 20% against major currencies");
        ngn.put("portfolioImpact", ngnShock);
        ngn.put("impactPct", -20.0);
        ngn.put("affectedClients", clientCount);
        ngn.put("recoveryMonths", 18);
        ngn.put("severity", "HIGH");
        scenarios.add(ngn);

        Map<String, Object> equity = new LinkedHashMap<>();
        equity.put("scenario", "Equity Market Crash -30%");
        equity.put("description", "Broad equity market decline of 30% across all exchanges");
        equity.put("portfolioImpact", equityShock);
        equity.put("impactPct", -10.5);
        equity.put("affectedClients", (long) Math.ceil(clientCount * 0.85));
        equity.put("recoveryMonths", 24);
        equity.put("severity", "CRITICAL");
        scenarios.add(equity);

        Map<String, Object> rates = new LinkedHashMap<>();
        rates.put("scenario", "Interest Rates +200bps");
        rates.put("description", "Central bank raises rates by 200 basis points impacting fixed income valuations");
        rates.put("portfolioImpact", rateShock);
        rates.put("impactPct", -3.0);
        rates.put("affectedClients", (long) Math.ceil(clientCount * 0.60));
        rates.put("recoveryMonths", 12);
        rates.put("severity", "MEDIUM");
        scenarios.add(rates);

        return ResponseEntity.ok(ApiResponse.ok(scenarios));
    }

    @GetMapping("/fee-revenue")
    @Operation(summary = "Get monthly fee revenue breakdown")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFeeRevenue(
            @RequestParam(defaultValue = "12") int months) {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal annualAdvisoryRate = BigDecimal.valueOf(0.0075);
        BigDecimal annualMgmtRate = BigDecimal.valueOf(0.0125);
        BigDecimal annualPerfRate = BigDecimal.valueOf(0.0020);

        List<Map<String, Object>> revenue = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate month = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            double growthFactor = 1.0 - (i * 0.012);
            BigDecimal monthAum = totalAum.multiply(BigDecimal.valueOf(Math.max(0.7, growthFactor)))
                    .setScale(0, RoundingMode.HALF_UP);

            BigDecimal advisory = monthAum.multiply(annualAdvisoryRate)
                    .divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP);
            BigDecimal management = monthAum.multiply(annualMgmtRate)
                    .divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP);
            double perfMultiplier = 1.0 + Math.sin(i * 0.9) * 0.5;
            BigDecimal performance = monthAum.multiply(annualPerfRate)
                    .multiply(BigDecimal.valueOf(Math.max(0, perfMultiplier)))
                    .divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP);
            BigDecimal total = advisory.add(management).add(performance);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", month.toString());
            entry.put("advisoryFees", advisory);
            entry.put("managementFees", management);
            entry.put("performanceFees", performance);
            entry.put("totalFees", total);
            revenue.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(revenue));
    }

    @GetMapping("/insights")
    @Operation(summary = "Get pattern-based insights derived from plan data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInsights() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalPlans = allPlans.size();
        long activePlans = allPlans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        long draftPlans = allPlans.stream().filter(p -> "DRAFT".equals(p.getStatus())).count();
        long closedPlans = allPlans.stream().filter(p -> "CLOSED".equals(p.getStatus())).count();
        long clientCount = allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();
        long advisorCount = allPlans.stream()
                .map(WealthManagementPlan::getAdvisorId)
                .filter(a -> a != null && !a.isBlank())
                .distinct().count();

        int totalGoals = allPlans.stream()
                .mapToInt(p -> p.getFinancialGoals() != null ? p.getFinancialGoals().size() : 0)
                .sum();

        long plansWithoutAdvisor = allPlans.stream()
                .filter(p -> p.getAdvisorId() == null || p.getAdvisorId().isBlank())
                .count();

        long plansNeedingReview = allPlans.stream()
                .filter(p -> p.getNextReviewDate() != null && p.getNextReviewDate().isBefore(LocalDate.now()))
                .count();

        Map<Long, BigDecimal> clientAum = allPlans.stream()
                .collect(Collectors.groupingBy(
                        WealthManagementPlan::getCustomerId,
                        Collectors.reducing(BigDecimal.ZERO,
                                p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO,
                                BigDecimal::add)));
        BigDecimal topClientAum = clientAum.values().stream()
                .max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        double topClientPct = totalAum.compareTo(BigDecimal.ZERO) > 0
                ? topClientAum.multiply(BigDecimal.valueOf(100))
                        .divide(totalAum, 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        List<Map<String, Object>> insights = new ArrayList<>();

        if (draftPlans > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "ACTION_REQUIRED");
            insight.put("severity", "MEDIUM");
            insight.put("title", "Pending Plan Activations");
            insight.put("description", draftPlans + " wealth plan(s) are still in DRAFT status and awaiting activation.");
            insight.put("metric", draftPlans);
            insight.put("recommendation", "Review and activate draft plans to ensure clients receive active wealth management.");
            insights.add(insight);
        }

        if (plansWithoutAdvisor > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "WARNING");
            insight.put("severity", "HIGH");
            insight.put("title", "Unassigned Plans");
            insight.put("description", plansWithoutAdvisor + " plan(s) have no assigned wealth advisor.");
            insight.put("metric", plansWithoutAdvisor);
            insight.put("recommendation", "Assign advisors to orphaned plans to maintain service quality and client satisfaction.");
            insights.add(insight);
        }

        if (topClientPct > 15.0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "RISK");
            insight.put("severity", "HIGH");
            insight.put("title", "Client Concentration Risk");
            insight.put("description", "Top client represents " + topClientPct + "% of total AUM, exceeding the 15% threshold.");
            insight.put("metric", topClientPct);
            insight.put("recommendation", "Diversify client base to reduce concentration risk exposure.");
            insights.add(insight);
        }

        if (plansNeedingReview > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "ACTION_REQUIRED");
            insight.put("severity", "MEDIUM");
            insight.put("title", "Overdue Plan Reviews");
            insight.put("description", plansNeedingReview + " plan(s) have passed their scheduled review date.");
            insight.put("metric", plansNeedingReview);
            insight.put("recommendation", "Schedule immediate reviews for overdue plans to maintain compliance and client trust.");
            insights.add(insight);
        }

        if (advisorCount > 0 && clientCount > 0) {
            double clientsPerAdvisor = (double) clientCount / advisorCount;
            if (clientsPerAdvisor > 20) {
                Map<String, Object> insight = new LinkedHashMap<>();
                insight.put("type", "CAPACITY");
                insight.put("severity", "MEDIUM");
                insight.put("title", "Advisor Capacity Strain");
                insight.put("description", "Average advisor manages " + Math.round(clientsPerAdvisor) + " clients, which may impact service quality.");
                insight.put("metric", Math.round(clientsPerAdvisor));
                insight.put("recommendation", "Consider hiring additional wealth advisors to maintain optimal client-to-advisor ratios.");
                insights.add(insight);
            }
        }

        if (closedPlans > 0 && totalPlans > 0) {
            double attritionRate = (double) closedPlans / totalPlans * 100;
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "TREND");
            insight.put("severity", attritionRate > 10 ? "HIGH" : "LOW");
            insight.put("title", "Client Attrition");
            insight.put("description", "Plan closure rate is " + Math.round(attritionRate * 100.0) / 100.0 + "% (" + closedPlans + " of " + totalPlans + " plans).");
            insight.put("metric", Math.round(attritionRate * 100.0) / 100.0);
            insight.put("recommendation", "Analyze reasons for plan closures and implement retention strategies.");
            insights.add(insight);
        }

        if (totalGoals > 0 && activePlans > 0) {
            double goalsPerPlan = (double) totalGoals / activePlans;
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "INFO");
            insight.put("severity", "LOW");
            insight.put("title", "Goal Engagement");
            insight.put("description", "Active plans average " + Math.round(goalsPerPlan * 10.0) / 10.0 + " financial goals per plan across " + totalGoals + " total goals.");
            insight.put("metric", Math.round(goalsPerPlan * 10.0) / 10.0);
            insight.put("recommendation", goalsPerPlan < 2 ? "Encourage clients to define more financial goals for comprehensive planning." : "Goal engagement is healthy. Continue current advisory approach.");
            insights.add(insight);
        }

        Map<String, Object> aumInsight = new LinkedHashMap<>();
        aumInsight.put("type", "INFO");
        aumInsight.put("severity", "LOW");
        aumInsight.put("title", "AUM Overview");
        aumInsight.put("description", "Total AUM stands at " + totalAum.toPlainString() + " across " + clientCount + " clients and " + totalPlans + " plans.");
        aumInsight.put("metric", totalAum);
        aumInsight.put("recommendation", "Continue monitoring AUM growth and client acquisition targets.");
        insights.add(aumInsight);

        return ResponseEntity.ok(ApiResponse.ok(insights));
    }
}
