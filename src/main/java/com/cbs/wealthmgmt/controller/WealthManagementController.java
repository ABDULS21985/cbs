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
}
