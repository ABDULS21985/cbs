package com.cbs.alm.controller;

import com.cbs.alm.entity.*;
import com.cbs.alm.service.AlmService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/alm") @RequiredArgsConstructor
@Tag(name = "ALM & Interest Rate Risk", description = "Gap analysis, NII simulation, EVE sensitivity, duration, scenarios")
@Transactional(readOnly = true)
public class AlmController {

    private final AlmService almService;

    @GetMapping("/gap-report")
    @Operation(summary = "List all ALM gap reports")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmGapReport>>> listGapReports() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllGapReports()));
    }

    @PostMapping("/gap-report")
    @Operation(summary = "Generate ALM gap report with NII/EVE simulation")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlmGapReport>> generateReport(
            @RequestParam LocalDate reportDate, @RequestParam String currencyCode,
            @RequestParam BigDecimal totalRsa, @RequestParam BigDecimal totalRsl,
            @RequestBody List<Map<String, Object>> buckets,
            @RequestParam(required = false) BigDecimal avgAssetDuration,
            @RequestParam(required = false) BigDecimal avgLiabDuration,
            @RequestParam String generatedBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                almService.generateGapReport(reportDate, currencyCode, totalRsa, totalRsl, buckets,
                        avgAssetDuration, avgLiabDuration, generatedBy)));
    }

    @PostMapping("/gap-report/{id}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlmGapReport>> approve(@PathVariable Long id, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(almService.approveReport(id, approvedBy)));
    }

    @GetMapping("/gap-report/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmGapReport>>> getReports(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getReportsForDate(date)));
    }

    @GetMapping("/duration/{portfolioCode}")
    @Operation(summary = "Calculate portfolio modified duration")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDuration(
            @PathVariable String portfolioCode, @RequestParam(defaultValue = "5.0") BigDecimal yieldRate) {
        return ResponseEntity.ok(ApiResponse.ok(almService.calculateDurationAnalytics(portfolioCode, yieldRate)));
    }

    // Scenarios
    @PostMapping("/scenarios")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlmScenario>> createScenario(@RequestBody AlmScenario scenario) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(almService.createScenario(scenario)));
    }

    @GetMapping("/scenarios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmScenario>>> getScenarios() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getActiveScenarios()));
    }

    @GetMapping("/scenarios/regulatory")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmScenario>>> getRegulatoryScenarios() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getRegulatoryScenarios()));
    }

    // ── Stress Testing ──────────────────────────────────────────────────────

    @PostMapping("/scenarios/{id}/run")
    @Operation(summary = "Run a stress scenario against the current portfolio")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runScenario(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.runStressScenario(id)));
    }

    @GetMapping("/scenarios/historical/{crisisName}")
    @Operation(summary = "Historical scenario replay")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> historicalReplay(@PathVariable String crisisName) {
        return ResponseEntity.ok(ApiResponse.ok(almService.historicalReplay(crisisName)));
    }

    @PostMapping("/scenarios/compare")
    @Operation(summary = "Compare multiple scenarios side by side")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> compareScenarios(@RequestBody List<Long> scenarioIds) {
        return ResponseEntity.ok(ApiResponse.ok(almService.compareScenarios(scenarioIds)));
    }
}
