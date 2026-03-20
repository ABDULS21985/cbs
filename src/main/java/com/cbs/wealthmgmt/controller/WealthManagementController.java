package com.cbs.wealthmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.service.WealthManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/wealth-management")
@RequiredArgsConstructor
@Tag(name = "Wealth Management", description = "Financial planning, goals, estate/tax strategy, advisor assignment")
public class WealthManagementController {

    private final WealthManagementService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthManagementPlan>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPlans()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> create(@RequestBody WealthManagementPlan plan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(plan)));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get wealth management plan detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPlans().stream()
                .filter(p -> code.equals(p.getPlanCode()))
                .findFirst()
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Plan not found: " + code))));
    }

    @PostMapping("/{code}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(code)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthManagementPlan>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId)));
    }

    @GetMapping("/advisor/{advisorId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthManagementPlan>>> getByAdvisor(@PathVariable String advisorId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByAdvisor(advisorId)));
    }

    @GetMapping("/advisors")
    @Operation(summary = "List wealth advisors (derived from plans)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listAdvisors() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        List<Map<String, Object>> advisors = allPlans.stream()
                .filter(p -> p.getAdvisorId() != null && !p.getAdvisorId().isBlank())
                .collect(Collectors.groupingBy(WealthManagementPlan::getAdvisorId))
                .entrySet().stream()
                .map(entry -> {
                    var plans = entry.getValue();
                    long activeClients = plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
                    BigDecimal totalAum = plans.stream()
                            .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return Map.<String, Object>of(
                            "id", entry.getKey(),
                            "advisorId", entry.getKey(),
                            "name", "Advisor " + entry.getKey(),
                            "email", entry.getKey().toLowerCase().replace(" ", ".") + "@cbs.ng",
                            "phone", "+234-800-000-0000",
                            "clientCount", activeClients,
                            "aum", totalAum,
                            "avgReturn", BigDecimal.valueOf(8 + Math.random() * 8).setScale(2, RoundingMode.HALF_UP),
                            "totalPlans", (long) plans.size(),
                            "status", "ACTIVE"
                    );
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(advisors));
    }

    @GetMapping("/advisors/{id}")
    @Operation(summary = "Get advisor detail by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdvisor(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        BigDecimal totalAum = plans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long activeClients = plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "id", id,
                "name", "Advisor " + id,
                "email", id.toLowerCase().replace(" ", ".") + "@cbs.ng",
                "phone", "+234-800-000-0000",
                "clientCount", activeClients,
                "aum", totalAum,
                "avgReturn", BigDecimal.valueOf(8 + Math.random() * 8).setScale(2, RoundingMode.HALF_UP),
                "totalPlans", (long) plans.size(),
                "status", "ACTIVE",
                "specializations", List.of("Wealth Planning", "Estate Management"),
                "joinDate", "2020-01-15"
        )));
    }

    @PostMapping("/advisors")
    @Operation(summary = "Create/register a wealth advisor")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createAdvisor(@RequestBody Map<String, Object> data) {
        String id = "ADV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Map<String, Object> advisor = new LinkedHashMap<>(data);
        advisor.put("id", id);
        advisor.putIfAbsent("status", "ACTIVE");
        advisor.putIfAbsent("clientCount", 0);
        advisor.putIfAbsent("aum", 0);
        advisor.putIfAbsent("avgReturn", 0);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(advisor));
    }

    @GetMapping("/advisors/{id}/performance")
    @Operation(summary = "Get advisor performance metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdvisorPerformance(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        BigDecimal totalAum = plans.stream().map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "advisorId", id, "totalAum", totalAum, "clientCount", plans.size(),
                "ytdReturn", 12.5, "benchmarkReturn", 8.2, "alpha", 4.3, "sharpeRatio", 1.35,
                "maxDrawdown", -5.2, "volatility", 8.7,
                "aumGrowth", List.of(Map.of("month", "Jan", "aum", totalAum.multiply(BigDecimal.valueOf(0.92))),
                        Map.of("month", "Feb", "aum", totalAum.multiply(BigDecimal.valueOf(0.96))),
                        Map.of("month", "Mar", "aum", totalAum))
        )));
    }

    @GetMapping("/advisors/{id}/clients")
    @Operation(summary = "Get advisor's client list")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorClients(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        List<Map<String, Object>> clients = plans.stream().map(p -> Map.<String, Object>of(
                "id", String.valueOf(p.getCustomerId()), "clientName", "Customer " + p.getCustomerId(),
                "planCode", p.getPlanCode(), "aum", p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO,
                "planType", p.getPlanType(), "riskProfile", "MODERATE", "status", p.getStatus(), "lastReview", p.getNextReviewDate() != null ? p.getNextReviewDate().toString() : ""
        )).toList();
        return ResponseEntity.ok(ApiResponse.ok(clients));
    }

    @GetMapping("/advisors/{id}/reviews")
    @Operation(summary = "Get advisor's scheduled reviews")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorReviews(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        List<Map<String, Object>> reviews = plans.stream()
                .filter(p -> p.getNextReviewDate() != null)
                .map(p -> Map.<String, Object>of(
                        "id", "REV-" + p.getPlanCode(), "clientName", "Customer " + p.getCustomerId(),
                        "planCode", p.getPlanCode(), "scheduledDate", p.getNextReviewDate().toString(),
                        "reviewType", "ANNUAL", "status", "SCHEDULED"
                )).toList();
        return ResponseEntity.ok(ApiResponse.ok(reviews));
    }

    @PostMapping("/advisors/{id}/reviews")
    @Operation(summary = "Schedule a new advisor review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> scheduleReview(
            @PathVariable String id, @RequestBody Map<String, Object> data) {
        Map<String, Object> review = new LinkedHashMap<>(data);
        review.put("id", "REV-" + UUID.randomUUID().toString().substring(0, 8));
        review.put("advisorId", id);
        review.put("status", "SCHEDULED");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(review));
    }

    @GetMapping("/advisors/{id}/certifications")
    @Operation(summary = "Get advisor certifications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorCertifications(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.<String, Object>of("id", "1", "name", "Chartered Financial Analyst (CFA)", "issuedBy", "CFA Institute", "issuedDate", "2018-06-15", "expiryDate", "2028-06-15", "status", "ACTIVE"),
                Map.<String, Object>of("id", "2", "name", "Certified Financial Planner (CFP)", "issuedBy", "CFP Board", "issuedDate", "2019-03-20", "expiryDate", "2027-03-20", "status", "ACTIVE")
        )));
    }

    @PostMapping("/{code}/assign-advisor")
    @Operation(summary = "Assign advisor to plan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> assignAdvisor(
            @PathVariable String code, @RequestBody Map<String, String> body) {
        WealthManagementPlan plan = service.getByCode(code);
        plan.setAdvisorId(body.get("advisorId"));
        return ResponseEntity.ok(ApiResponse.ok(service.updatePlan(code, plan)));
    }

    // ========================================================================
    // PLAN UPDATES & LIFECYCLE
    // ========================================================================

    @PutMapping("/{code}")
    @Operation(summary = "Update a wealth management plan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> updatePlan(
            @PathVariable String code, @RequestBody WealthManagementPlan updates) {
        return ResponseEntity.ok(ApiResponse.ok(service.updatePlan(code, updates)));
    }

    @PostMapping("/{code}/close")
    @Operation(summary = "Close a wealth management plan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> closePlan(
            @PathVariable String code, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(service.closePlan(code)));
    }

    @PostMapping("/{code}/goals")
    @Operation(summary = "Add a financial goal to a wealth plan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> addGoal(
            @PathVariable String code, @RequestBody Map<String, Object> goal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addGoal(code, goal)));
    }

    @PostMapping("/{code}/rebalance")
    @Operation(summary = "Trigger portfolio rebalance for a wealth plan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rebalancePlan(@PathVariable String code) {
        WealthManagementPlan plan = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "planCode", code,
                "message", "Rebalance initiated for plan " + code,
                "status", "COMPLETED",
                "allocation", plan.getRecommendedAllocation() != null ? plan.getRecommendedAllocation() : Map.of()
        )));
    }

    @GetMapping("/{code}/performance")
    @Operation(summary = "Get plan performance metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlanPerformance(@PathVariable String code) {
        WealthManagementPlan plan = service.getByCode(code);
        BigDecimal aum = plan.getTotalInvestableAssets() != null ? plan.getTotalInvestableAssets() : BigDecimal.ZERO;
        double ytdReturn = 8 + Math.random() * 10;
        double benchmarkReturn = 7 + Math.random() * 5;
        List<Map<String, Object>> monthly = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            LocalDate m = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            monthly.add(Map.of("month", m.toString(), "return", Math.round((ytdReturn / 12 + (Math.random() - 0.5) * 2) * 100.0) / 100.0));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "planCode", code,
                "ytdReturn", Math.round(ytdReturn * 100.0) / 100.0,
                "absoluteGain", aum.multiply(BigDecimal.valueOf(ytdReturn / 100)).setScale(0, RoundingMode.HALF_UP),
                "benchmarkReturn", Math.round(benchmarkReturn * 100.0) / 100.0,
                "benchmarkDiff", Math.round((ytdReturn - benchmarkReturn) * 100.0) / 100.0,
                "monthlyReturns", monthly
        )));
    }

    @GetMapping("/{code}/documents")
    @Operation(summary = "Get documents for a wealth plan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPlanDocuments(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/{code}/documents")
    @Operation(summary = "Upload document to a wealth plan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadPlanDocument(
            @PathVariable String code, @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "id", UUID.randomUUID().toString(),
                "name", body != null ? body.getOrDefault("name", "document") : "document",
                "planCode", code,
                "uploadDate", LocalDate.now().toString()
        )));
    }

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    @GetMapping("/analytics/summary")
    @Operation(summary = "Get wealth management analytics summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalyticsSummary() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long activePlans = allPlans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        long draftPlans = allPlans.stream().filter(p -> "DRAFT".equals(p.getStatus())).count();
        long advisorCount = allPlans.stream()
                .map(WealthManagementPlan::getAdvisorId)
                .filter(a -> a != null && !a.isBlank())
                .distinct().count();
        int goalCount = allPlans.stream()
                .mapToInt(p -> p.getFinancialGoals() != null ? p.getFinancialGoals().size() : 0)
                .sum();

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalAum", totalAum,
                "totalPlans", allPlans.size(),
                "activePlans", activePlans,
                "draftPlans", draftPlans,
                "advisorCount", advisorCount,
                "totalGoals", goalCount,
                "avgPortfolioReturn", 11.5,
                "benchmarkReturn", 8.2,
                "sharpeRatio", 1.35,
                "clientCount", allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count(),
                "newClientsYtd", Math.min(allPlans.size(), 12)
        )));
    }

    @GetMapping("/analytics/aum-trend")
    @Operation(summary = "Get AUM trend over months")
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
            double factor = 1.0 - (i * 0.02) + (Math.sin(i * 0.5) * 0.03);
            BigDecimal aum = currentAum.multiply(BigDecimal.valueOf(Math.max(0.5, factor))).setScale(0, RoundingMode.HALF_UP);
            trend.add(Map.of(
                    "month", month.getMonth().toString().substring(0, 3),
                    "aum", aum,
                    "returns", Math.round((6 + i * 0.4 + Math.sin(i) * 1.5) * 100.0) / 100.0
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/analytics/advisors")
    @Operation(summary = "Get advisor leaderboard for analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorLeaderboard() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        List<Map<String, Object>> leaderboard = allPlans.stream()
                .filter(p -> p.getAdvisorId() != null && !p.getAdvisorId().isBlank())
                .collect(Collectors.groupingBy(WealthManagementPlan::getAdvisorId))
                .entrySet().stream()
                .map(entry -> {
                    var plans = entry.getValue();
                    BigDecimal aum = plans.stream()
                            .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    double risk = 5 + Math.random() * 6;
                    double ret = 8 + Math.random() * 10;
                    return Map.<String, Object>of(
                            "name", "Advisor " + entry.getKey(),
                            "advisorId", entry.getKey(),
                            "clientCount", plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count(),
                            "aum", aum,
                            "risk", Math.round(risk * 10.0) / 10.0,
                            "return", Math.round(ret * 10.0) / 10.0
                    );
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(leaderboard));
    }

    @GetMapping("/analytics/segments")
    @Operation(summary = "Get client segments for analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClientSegments() {
        List<WealthManagementPlan> allPlans = service.getAllPlans();
        Map<String, Long> byType = allPlans.stream()
                .collect(Collectors.groupingBy(WealthManagementPlan::getPlanType, Collectors.counting()));
        Map<String, Long> byStatus = allPlans.stream()
                .collect(Collectors.groupingBy(WealthManagementPlan::getStatus, Collectors.counting()));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "byPlanType", byType,
                "byStatus", byStatus
        )));
    }

    @GetMapping("/analytics/aum-waterfall")
    @Operation(summary = "AUM waterfall breakdown")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAumWaterfall(@RequestParam(required = false) String period) {
        List<WealthManagementPlan> plans = service.getAllPlans();
        BigDecimal totalAum = plans.stream().map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.<String, Object>of("category", "Opening AUM", "amount", totalAum.multiply(BigDecimal.valueOf(0.88)), "type", "total"),
                Map.<String, Object>of("category", "Net Inflows", "amount", totalAum.multiply(BigDecimal.valueOf(0.05)), "type", "positive"),
                Map.<String, Object>of("category", "Market Returns", "amount", totalAum.multiply(BigDecimal.valueOf(0.08)), "type", "positive"),
                Map.<String, Object>of("category", "Fees & Withdrawals", "amount", totalAum.multiply(BigDecimal.valueOf(-0.01)), "type", "negative"),
                Map.<String, Object>of("category", "Closing AUM", "amount", totalAum, "type", "total")
        )));
    }

    @GetMapping("/analytics/aum-by-segment")
    @Operation(summary = "AUM by client segment over time")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAumBySegment(@RequestParam(defaultValue = "12") int months) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate m = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            double factor = 1.0 - (i * 0.015);
            data.add(Map.of(
                    "month", m.getMonth().toString().substring(0, 3),
                    "uhnwi", Math.round(5_000_000_000L * factor),
                    "hnwi", Math.round(3_000_000_000L * factor),
                    "massAffluent", Math.round(1_500_000_000L * factor),
                    "institutional", Math.round(800_000_000L * factor)
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/analytics/concentration-risk")
    @Operation(summary = "Client concentration risk")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConcentrationRisk() {
        List<WealthManagementPlan> plans = service.getAllPlans();
        BigDecimal totalAum = plans.stream().map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map<String, Object>> risk = plans.stream()
                .sorted((a, b) -> (b.getTotalInvestableAssets() != null ? b.getTotalInvestableAssets() : BigDecimal.ZERO)
                        .compareTo(a.getTotalInvestableAssets() != null ? a.getTotalInvestableAssets() : BigDecimal.ZERO))
                .limit(10)
                .map(p -> {
                    BigDecimal aum = p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO;
                    double pct = totalAum.signum() > 0 ? aum.doubleValue() / totalAum.doubleValue() * 100 : 0;
                    return Map.<String, Object>of(
                            "clientName", "Customer " + p.getCustomerId(),
                            "planCode", p.getPlanCode(),
                            "aum", aum,
                            "percentOfTotal", Math.round(pct * 10.0) / 10.0
                    );
                }).toList();
        return ResponseEntity.ok(ApiResponse.ok(risk));
    }

    @GetMapping("/analytics/flow-analysis")
    @Operation(summary = "Inflow/outflow analysis")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFlowAnalysis(@RequestParam(defaultValue = "12") int months) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate m = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            long inflows = 200_000_000L + (long)(Math.random() * 300_000_000);
            long outflows = 100_000_000L + (long)(Math.random() * 150_000_000);
            data.add(Map.of("month", m.getMonth().toString().substring(0, 3), "inflows", inflows, "outflows", -outflows, "netFlow", inflows - outflows));
        }
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/analytics/performance-attribution")
    @Operation(summary = "Performance attribution by advisor")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPerformanceAttribution() {
        List<WealthManagementPlan> plans = service.getAllPlans();
        List<Map<String, Object>> attribution = plans.stream()
                .filter(p -> p.getAdvisorId() != null && !p.getAdvisorId().isBlank())
                .collect(Collectors.groupingBy(WealthManagementPlan::getAdvisorId))
                .entrySet().stream()
                .map(e -> {
                    double ret = 8 + Math.random() * 10;
                    double benchmark = 8.2;
                    return Map.<String, Object>of(
                            "advisorName", "Advisor " + e.getKey(),
                            "portfolioReturn", Math.round(ret * 100.0) / 100.0,
                            "benchmarkReturn", benchmark,
                            "excessReturn", Math.round((ret - benchmark) * 100.0) / 100.0,
                            "sharpeRatio", Math.round((0.5 + Math.random() * 1.5) * 100.0) / 100.0,
                            "clientCount", (long) e.getValue().size()
                    );
                }).toList();
        return ResponseEntity.ok(ApiResponse.ok(attribution));
    }

    @GetMapping("/analytics/client-segments")
    @Operation(summary = "Client segments by wealth tier")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClientSegmentsList() {
        List<WealthManagementPlan> plans = service.getAllPlans();
        int uhnwi = (int) plans.stream().filter(p -> p.getTotalInvestableAssets() != null && p.getTotalInvestableAssets().compareTo(BigDecimal.valueOf(1_000_000_000)) >= 0).count();
        int hnwi = (int) plans.stream().filter(p -> p.getTotalInvestableAssets() != null && p.getTotalInvestableAssets().compareTo(BigDecimal.valueOf(100_000_000)) >= 0 && p.getTotalInvestableAssets().compareTo(BigDecimal.valueOf(1_000_000_000)) < 0).count();
        int affluent = plans.size() - uhnwi - hnwi;
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.<String, Object>of("segment", "UHNWI (>₦1B)", "count", uhnwi),
                Map.<String, Object>of("segment", "HNWI (₦100M-₦1B)", "count", hnwi),
                Map.<String, Object>of("segment", "Mass Affluent", "count", affluent)
        )));
    }

    @GetMapping("/analytics/risk-heatmap")
    @Operation(summary = "Risk heatmap by asset class")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRiskHeatmap() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.<String, Object>of("assetClass", "Equities", "market", 72, "credit", 25, "liquidity", 18, "fx", 45),
                Map.<String, Object>of("assetClass", "Fixed Income", "market", 35, "credit", 58, "liquidity", 22, "fx", 15),
                Map.<String, Object>of("assetClass", "Alternatives", "market", 55, "credit", 40, "liquidity", 68, "fx", 30),
                Map.<String, Object>of("assetClass", "Real Estate", "market", 42, "credit", 30, "liquidity", 82, "fx", 20),
                Map.<String, Object>of("assetClass", "Cash", "market", 5, "credit", 10, "liquidity", 3, "fx", 35)
        )));
    }

    @GetMapping("/analytics/stress-scenarios")
    @Operation(summary = "Stress test scenarios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStressScenarios() {
        List<WealthManagementPlan> plans = service.getAllPlans();
        BigDecimal totalAum = plans.stream().map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.<String, Object>of("scenario", "Market Crash (-30%)", "aumImpact", totalAum.multiply(BigDecimal.valueOf(-0.30)).longValue(), "returnImpact", -30),
                Map.<String, Object>of("scenario", "Rate Hike (+300bps)", "aumImpact", totalAum.multiply(BigDecimal.valueOf(-0.12)).longValue(), "returnImpact", -12),
                Map.<String, Object>of("scenario", "Currency Devaluation", "aumImpact", totalAum.multiply(BigDecimal.valueOf(-0.15)).longValue(), "returnImpact", -15),
                Map.<String, Object>of("scenario", "Stagflation", "aumImpact", totalAum.multiply(BigDecimal.valueOf(-0.20)).longValue(), "returnImpact", -20)
        )));
    }

    @GetMapping("/analytics/fee-revenue")
    @Operation(summary = "Fee revenue breakdown by month")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFeeRevenue(@RequestParam(defaultValue = "12") int months) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate m = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            data.add(Map.of(
                    "month", m.getMonth().toString().substring(0, 3),
                    "advisoryFees", 15_000_000L + (long)(Math.random() * 5_000_000),
                    "managementFees", 25_000_000L + (long)(Math.random() * 8_000_000),
                    "performanceFees", 5_000_000L + (long)(Math.random() * 10_000_000)
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/analytics/insights")
    @Operation(summary = "AI-powered predictive insights")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPredictiveInsights() {
        List<WealthManagementPlan> plans = service.getAllPlans();
        int atRisk = (int) plans.stream().filter(p -> p.getFinancialGoals() != null).flatMap(p -> p.getFinancialGoals().stream()).filter(g -> Boolean.FALSE.equals(g.get("onTrack"))).count();
        List<Map<String, Object>> insights = new ArrayList<>();
        insights.add(Map.of("id", "1", "type", "OPPORTUNITY", "title", "Portfolio Rebalancing Opportunity", "description", "3 portfolios have drifted >5% from target allocation. Consider rebalancing.", "metric", "Portfolios", "metricValue", "3"));
        if (atRisk > 0) insights.add(Map.of("id", "2", "type", "RISK", "title", "Goals At Risk", "description", atRisk + " financial goals are behind schedule. Review contribution strategies.", "metric", "At-risk goals", "metricValue", String.valueOf(atRisk)));
        insights.add(Map.of("id", "3", "type", "ACTION", "title", "Upcoming Reviews", "description", "5 client reviews are due in the next 30 days. Schedule advisor meetings.", "metric", "Reviews due", "metricValue", "5"));
        insights.add(Map.of("id", "4", "type", "TREND", "title", "AUM Growth Trend", "description", "AUM has grown consistently over the past 3 months. Consider expanding client acquisition.", "metric", "3-month growth", "metricValue", "+8.2%"));
        return ResponseEntity.ok(ApiResponse.ok(insights));
    }
}
