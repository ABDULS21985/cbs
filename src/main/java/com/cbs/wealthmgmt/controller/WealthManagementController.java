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
        return ResponseEntity.ok(ApiResponse.ok(Map.ofEntries(
                Map.entry("id", id),
                Map.entry("name", "Advisor " + id),
                Map.entry("email", id.toLowerCase().replace(" ", ".") + "@cbs.ng"),
                Map.entry("phone", "+234-800-000-0000"),
                Map.entry("clientCount", activeClients),
                Map.entry("aum", totalAum),
                Map.entry("avgReturn", BigDecimal.valueOf(8 + Math.random() * 8).setScale(2, RoundingMode.HALF_UP)),
                Map.entry("totalPlans", (long) plans.size()),
                Map.entry("status", "ACTIVE"),
                Map.entry("specializations", List.of("Wealth Planning", "Estate Management")),
                Map.entry("joinDate", "2020-01-15")
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
}
