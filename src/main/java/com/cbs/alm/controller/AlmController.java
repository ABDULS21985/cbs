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
            @RequestParam(required = false) BigDecimal avgLiabDuration) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                almService.generateGapReport(reportDate, currencyCode, totalRsa, totalRsl, buckets,
                        avgAssetDuration, avgLiabDuration)));
    }

    @PostMapping("/gap-report/{id}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlmGapReport>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.approveReport(id)));
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

    @GetMapping("/stress-runs")
    @Operation(summary = "List all stress test runs (audit trail)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<com.cbs.alm.entity.StressTestRun>>> getStressRuns() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllStressTestRuns()));
    }

    @GetMapping("/stress-runs/scenario/{scenarioId}")
    @Operation(summary = "List stress test runs for a specific scenario")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<com.cbs.alm.entity.StressTestRun>>> getStressRunsByScenario(@PathVariable Long scenarioId) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getStressTestRunsByScenario(scenarioId)));
    }

    // ── ALCO Pack Management ─────────────────────────────────────────────────

    @GetMapping("/alco-packs")
    @Operation(summary = "List all ALCO packs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlcoPack>>> listAlcoPacks() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllAlcoPacks()));
    }

    @GetMapping("/alco-packs/{id}")
    @Operation(summary = "Get ALCO pack by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AlcoPack>> getAlcoPack(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAlcoPack(id)));
    }

    @GetMapping("/alco-packs/month/{month}")
    @Operation(summary = "Get latest ALCO pack for a given month")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AlcoPack>> getAlcoPackByMonth(@PathVariable String month) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAlcoPackByMonth(month)));
    }

    @PostMapping("/alco-packs")
    @Operation(summary = "Create a new ALCO pack")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoPack>> createAlcoPack(@RequestBody AlcoPack pack) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(almService.createAlcoPack(pack)));
    }

    @PatchMapping("/alco-packs/{id}")
    @Operation(summary = "Update ALCO pack sections and executive summary")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoPack>> updateAlcoPack(
            @PathVariable Long id, @RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<String> sections = (List<String>) payload.get("sections");
        String executiveSummary = (String) payload.get("executiveSummary");
        return ResponseEntity.ok(ApiResponse.ok(almService.updateAlcoPack(id, sections, executiveSummary)));
    }

    @PostMapping("/alco-packs/{id}/submit")
    @Operation(summary = "Submit ALCO pack for review")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoPack>> submitAlcoPackForReview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.submitAlcoPackForReview(id)));
    }

    @PostMapping("/alco-packs/{id}/approve")
    @Operation(summary = "Approve ALCO pack")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoPack>> approveAlcoPack(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.approveAlcoPack(id)));
    }

    @PostMapping("/alco-packs/{id}/distribute")
    @Operation(summary = "Distribute ALCO pack to members")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoPack>> distributeAlcoPack(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.distributeAlcoPack(id)));
    }

    @GetMapping("/alco-packs/month/{month}/versions")
    @Operation(summary = "Get version history for a month")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlcoPack>>> getAlcoPackVersions(@PathVariable String month) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAlcoPackVersions(month)));
    }

    @PostMapping("/alco-packs/generate-summary")
    @Operation(summary = "Auto-generate executive summary from ALM data")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateExecutiveSummary(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ApiResponse.ok(almService.generateExecutiveSummary(payload.get("month"))));
    }

    // ── Action Items ─────────────────────────────────────────────────────────

    @GetMapping("/action-items")
    @Operation(summary = "List all ALCO action items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlcoActionItem>>> listActionItems() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllActionItems()));
    }

    @PostMapping("/action-items")
    @Operation(summary = "Create an action item")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlcoActionItem>> createActionItem(@RequestBody AlcoActionItem item) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(almService.createActionItem(item)));
    }

    @PatchMapping("/action-items/{id}")
    @Operation(summary = "Update action item status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AlcoActionItem>> updateActionItem(
            @PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ApiResponse.ok(
                almService.updateActionItemStatus(id, payload.get("status"), payload.get("updateNotes"))));
    }

    // ── Regulatory Returns ───────────────────────────────────────────────────

    @GetMapping("/regulatory-returns")
    @Operation(summary = "List all regulatory returns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmRegulatoryReturn>>> listRegulatoryReturns() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllRegulatoryReturns()));
    }

    @GetMapping("/regulatory-returns/{id}")
    @Operation(summary = "Get regulatory return detail with data and validation results")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AlmRegulatoryReturn>> getRegulatoryReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getRegulatoryReturn(id)));
    }

    @PostMapping("/regulatory-returns/{id}/validate")
    @Operation(summary = "Validate regulatory return data")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.validateRegulatoryReturn(id)));
    }

    @PostMapping("/regulatory-returns/{id}/submit")
    @Operation(summary = "Submit regulatory return to CBN")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AlmRegulatorySubmission>> submitReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(almService.submitRegulatoryReturn(id)));
    }

    @GetMapping("/regulatory-returns/{returnId}/submissions")
    @Operation(summary = "Get submission history for a return")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmRegulatorySubmission>>> getReturnSubmissions(@PathVariable Long returnId) {
        return ResponseEntity.ok(ApiResponse.ok(almService.getSubmissionsForReturn(returnId)));
    }

    @GetMapping("/regulatory-submissions")
    @Operation(summary = "Get all regulatory submissions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AlmRegulatorySubmission>>> getAllSubmissions() {
        return ResponseEntity.ok(ApiResponse.ok(almService.getAllSubmissions()));
    }
}
