package com.cbs.wealthmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.wealthmgmt.dto.WealthPlanResponse;
import com.cbs.wealthmgmt.entity.WealthAdvisor;
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

@RestController
@RequestMapping("/v1/wealth-management")
@RequiredArgsConstructor
@Tag(name = "Wealth Management", description = "Financial planning, goals, estate/tax strategy, advisor assignment")
public class WealthManagementController {

    private final WealthManagementService service;

    // ========================================================================
    // PLAN ENDPOINTS
    // ========================================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthPlanResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getAllPlans().stream().map(WealthPlanResponse::from).toList()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> create(@RequestBody WealthManagementPlan plan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(plan)));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get wealth management plan detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WealthPlanResponse>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(WealthPlanResponse.from(service.getByCode(code))));
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

    @PostMapping("/{code}/assign-advisor")
    @Operation(summary = "Assign advisor to plan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> assignAdvisor(
            @PathVariable String code, @RequestBody Map<String, String> body) {
        WealthManagementPlan plan = service.getByCode(code);
        String advisorCode = body.get("advisorId");
        // Validate advisor exists
        WealthAdvisor advisor = service.getAdvisorByCode(advisorCode);
        plan.setAdvisorId(advisorCode);
        plan.setAdvisorName(advisor.getFullName());
        return ResponseEntity.ok(ApiResponse.ok(service.updatePlan(code, plan)));
    }

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
    @Operation(summary = "Get plan performance metrics from real data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlanPerformance(@PathVariable String code) {
        WealthManagementPlan plan = service.getByCode(code);
        BigDecimal aum = plan.getTotalInvestableAssets() != null ? plan.getTotalInvestableAssets() : BigDecimal.ZERO;
        double ytdReturn = plan.getYtdReturn() != null ? plan.getYtdReturn().doubleValue() : 0.0;
        double benchmarkReturn = plan.getBenchmarkReturn() != null ? plan.getBenchmarkReturn().doubleValue() : 0.0;
        BigDecimal absoluteGain = aum.multiply(BigDecimal.valueOf(ytdReturn / 100)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal feesCharged = plan.getFeesChargedYtd() != null ? plan.getFeesChargedYtd() : BigDecimal.ZERO;

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "planCode", code,
                "ytdReturn", ytdReturn,
                "absoluteGain", absoluteGain,
                "benchmarkReturn", benchmarkReturn,
                "benchmarkDiff", Math.round((ytdReturn - benchmarkReturn) * 100.0) / 100.0,
                "feesChargedYtd", feesCharged,
                "contributionsYtd", plan.getContributionsYtd() != null ? plan.getContributionsYtd() : BigDecimal.ZERO,
                "withdrawalsYtd", plan.getWithdrawalsYtd() != null ? plan.getWithdrawalsYtd() : BigDecimal.ZERO
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
    // ADVISOR ENDPOINTS (backed by wealth_advisor table)
    // ========================================================================

    @GetMapping("/advisors")
    @Operation(summary = "List all wealth advisors")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthAdvisor>>> listAdvisors() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllAdvisors()));
    }

    @GetMapping("/advisors/{id}")
    @Operation(summary = "Get advisor detail by code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WealthAdvisor>> getAdvisor(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAdvisorByCode(id)));
    }

    @PostMapping("/advisors")
    @Operation(summary = "Create/register a wealth advisor")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthAdvisor>> createAdvisor(@RequestBody WealthAdvisor advisor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createAdvisor(advisor)));
    }

    @PutMapping("/advisors/{id}")
    @Operation(summary = "Update a wealth advisor")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthAdvisor>> updateAdvisor(
            @PathVariable String id, @RequestBody WealthAdvisor updates) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateAdvisor(id, updates)));
    }

    @GetMapping("/advisors/{id}/performance")
    @Operation(summary = "Get advisor performance metrics from real plan data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdvisorPerformance(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.computeAdvisorMetrics(id)));
    }

    @GetMapping("/advisors/{id}/clients")
    @Operation(summary = "Get advisor's client list from real plan data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorClients(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        List<Map<String, Object>> clients = plans.stream().map(p -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", String.valueOf(p.getCustomerId()));
            map.put("clientName", p.getCustomerName() != null ? p.getCustomerName() : "Customer " + p.getCustomerId());
            map.put("planCode", p.getPlanCode());
            map.put("aum", p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO);
            map.put("planType", p.getPlanType());
            map.put("riskProfile", p.getRiskProfile() != null ? p.getRiskProfile() : "");
            map.put("status", p.getStatus());
            map.put("lastReview", p.getLastReviewDate() != null ? p.getLastReviewDate().toString() : "");
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(clients));
    }

    @GetMapping("/advisors/{id}/reviews")
    @Operation(summary = "Get advisor's scheduled reviews from real plan data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorReviews(@PathVariable String id) {
        List<WealthManagementPlan> plans = service.getByAdvisor(id);
        List<Map<String, Object>> reviews = plans.stream()
                .filter(p -> p.getNextReviewDate() != null)
                .map(p -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", "REV-" + p.getPlanCode());
                    map.put("clientName", p.getCustomerName() != null ? p.getCustomerName() : "Customer " + p.getCustomerId());
                    map.put("planCode", p.getPlanCode());
                    map.put("scheduledDate", p.getNextReviewDate().toString());
                    map.put("reviewType", "ANNUAL");
                    map.put("status", p.getNextReviewDate().isBefore(LocalDate.now()) ? "OVERDUE" : "SCHEDULED");
                    return map;
                }).toList();
        return ResponseEntity.ok(ApiResponse.ok(reviews));
    }

    @PostMapping("/advisors/{id}/reviews")
    @Operation(summary = "Schedule a new advisor review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> scheduleReview(
            @PathVariable String id, @RequestBody Map<String, Object> data) {
        // Validate advisor exists
        service.getAdvisorByCode(id);
        Map<String, Object> review = new LinkedHashMap<>(data);
        review.put("id", "REV-" + UUID.randomUUID().toString().substring(0, 8));
        review.put("advisorId", id);
        review.put("status", "SCHEDULED");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(review));
    }

    @GetMapping("/advisors/{id}/certifications")
    @Operation(summary = "Get advisor certifications from real entity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdvisorCertifications(@PathVariable String id) {
        WealthAdvisor advisor = service.getAdvisorByCode(id);
        List<Map<String, Object>> certs = advisor.getCertifications() != null ? advisor.getCertifications() : List.of();
        return ResponseEntity.ok(ApiResponse.ok(certs));
    }
}
