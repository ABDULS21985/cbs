package com.cbs.shariahcompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariahcompliance.dto.AddExclusionEntryRequest;
import com.cbs.shariahcompliance.dto.AlertSearchCriteria;
import com.cbs.shariahcompliance.dto.AlertStatistics;
import com.cbs.shariahcompliance.dto.CreateExclusionListRequest;
import com.cbs.shariahcompliance.dto.CreateScreeningRuleRequest;
import com.cbs.shariahcompliance.dto.ResolveAlertRequest;
import com.cbs.shariahcompliance.dto.ScreeningRuleResponse;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ShariahComplianceAlert;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shariah-compliance/screening")
@RequiredArgsConstructor
@Slf4j
public class ShariahScreeningController {

    private final ShariahScreeningService shariahScreeningService;

    // ── Screening ─────────────────────────────────────────────────────────────

    @PostMapping("/screen")
    public ResponseEntity<ApiResponse<ShariahScreeningResultResponse>> screenTransaction(
            @Valid @RequestBody ShariahScreeningRequest request) {
        log.info("Screening transaction: {}", request.getTransactionRef());
        ShariahScreeningResultResponse result = shariahScreeningService.screenTransaction(request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Transaction screened successfully"));
    }

    @PostMapping("/pre-screen")
    public ResponseEntity<ApiResponse<ShariahScreeningResultResponse>> preScreenTransaction(
            @Valid @RequestBody ShariahScreeningRequest request) {
        log.info("Pre-screening transaction: {}", request.getTransactionRef());
        ShariahScreeningResultResponse result = shariahScreeningService.preScreenTransaction(request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Transaction pre-screened successfully"));
    }

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<ShariahScreeningResultResponse>>> batchScreen(
            @Valid @RequestBody List<ShariahScreeningRequest> requests) {
        log.info("Batch screening {} transactions", requests.size());
        List<ShariahScreeningResultResponse> results = shariahScreeningService.batchScreen(requests);
        return ResponseEntity.ok(ApiResponse.ok(results, "Batch screening completed"));
    }

    // ── Rules ─────────────────────────────────────────────────────────────────

    @PostMapping("/rules")
    public ResponseEntity<ApiResponse<ScreeningRuleResponse>> createRule(
            @Valid @RequestBody CreateScreeningRuleRequest request) {
        log.info("Creating screening rule: {}", request.getRuleCode());
        ScreeningRuleResponse rule = shariahScreeningService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(rule, "Screening rule created"));
    }

    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<ScreeningRuleResponse>>> getActiveRules() {
        List<ScreeningRuleResponse> rules = shariahScreeningService.getActiveRules();
        return ResponseEntity.ok(ApiResponse.ok(rules));
    }

    @GetMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<ScreeningRuleResponse>> getRule(@PathVariable Long id) {
        ScreeningRuleResponse rule = shariahScreeningService.getRule(id);
        return ResponseEntity.ok(ApiResponse.ok(rule));
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<ScreeningRuleResponse>> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody CreateScreeningRuleRequest request) {
        log.info("Updating screening rule id={}", id);
        ScreeningRuleResponse rule = shariahScreeningService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.ok(rule, "Screening rule updated"));
    }

    @PatchMapping("/rules/{id}/enable")
    public ResponseEntity<ApiResponse<Void>> enableRule(@PathVariable Long id) {
        log.info("Enabling screening rule id={}", id);
        shariahScreeningService.enableRule(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Screening rule enabled"));
    }

    @PatchMapping("/rules/{id}/disable")
    public ResponseEntity<ApiResponse<Void>> disableRule(@PathVariable Long id) {
        log.info("Disabling screening rule id={}", id);
        shariahScreeningService.disableRule(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Screening rule disabled"));
    }

    // ── Exclusion Lists ───────────────────────────────────────────────────────

    @PostMapping("/exclusion-lists")
    public ResponseEntity<ApiResponse<ShariahExclusionList>> createExclusionList(
            @Valid @RequestBody CreateExclusionListRequest request) {
        log.info("Creating exclusion list: {}", request.getListCode());
        ShariahExclusionList list = shariahScreeningService.createExclusionList(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(list, "Exclusion list created"));
    }

    @GetMapping("/exclusion-lists")
    public ResponseEntity<ApiResponse<List<ShariahExclusionList>>> getAllExclusionLists() {
        List<ShariahExclusionList> lists = shariahScreeningService.getAllExclusionLists();
        return ResponseEntity.ok(ApiResponse.ok(lists));
    }

    @GetMapping("/exclusion-lists/{code}/entries")
    public ResponseEntity<ApiResponse<List<ShariahExclusionListEntry>>> getListEntries(
            @PathVariable String code) {
        List<ShariahExclusionListEntry> entries = shariahScreeningService.getListEntries(code);
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @PostMapping("/exclusion-lists/{code}/entries")
    public ResponseEntity<ApiResponse<Void>> addEntryToList(
            @PathVariable String code,
            @Valid @RequestBody AddExclusionEntryRequest request) {
        log.info("Adding entry to exclusion list {}", code);
        shariahScreeningService.addEntryToList(code, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(null, "Entry added to exclusion list"));
    }

    @DeleteMapping("/exclusion-lists/{code}/entries/{entryId}")
    public ResponseEntity<ApiResponse<Void>> removeEntryFromList(
            @PathVariable String code,
            @PathVariable Long entryId,
            @RequestParam String reason) {
        log.info("Removing entry {} from exclusion list {} — reason: {}", entryId, code, reason);
        shariahScreeningService.removeEntryFromList(code, entryId, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Entry removed from exclusion list"));
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<Page<ShariahComplianceAlert>>> getAlerts(
            AlertSearchCriteria criteria, Pageable pageable) {
        Page<ShariahComplianceAlert> alerts = shariahScreeningService.getAlerts(criteria, pageable);
        return ResponseEntity.ok(ApiResponse.ok(alerts));
    }

    @GetMapping("/alerts/{id}")
    public ResponseEntity<ApiResponse<ShariahComplianceAlert>> getAlert(@PathVariable Long id) {
        ShariahComplianceAlert alert = shariahScreeningService.getAlert(id);
        return ResponseEntity.ok(ApiResponse.ok(alert));
    }

    @PostMapping("/alerts/{id}/assign")
    public ResponseEntity<ApiResponse<Void>> assignAlert(
            @PathVariable Long id,
            @RequestParam String assignedTo) {
        log.info("Assigning alert id={} to {}", id, assignedTo);
        shariahScreeningService.assignAlert(id, assignedTo);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert assigned"));
    }

    @PostMapping("/alerts/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveAlert(
            @PathVariable Long id,
            @Valid @RequestBody ResolveAlertRequest request) {
        log.info("Resolving alert id={}", id);
        shariahScreeningService.resolveAlert(id, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert resolved"));
    }

    @PostMapping("/alerts/{id}/escalate")
    public ResponseEntity<ApiResponse<Void>> escalateAlert(
            @PathVariable Long id,
            @RequestParam String escalatedTo,
            @RequestParam String reason) {
        log.info("Escalating alert id={} to {} — reason: {}", id, escalatedTo, reason);
        shariahScreeningService.escalateAlert(id, escalatedTo, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert escalated"));
    }

    @GetMapping("/alerts/overdue")
    public ResponseEntity<ApiResponse<List<ShariahComplianceAlert>>> getOverdueAlerts() {
        List<ShariahComplianceAlert> alerts = shariahScreeningService.getOverdueAlerts();
        return ResponseEntity.ok(ApiResponse.ok(alerts));
    }

    @GetMapping("/alerts/statistics")
    public ResponseEntity<ApiResponse<AlertStatistics>> getAlertStatistics() {
        AlertStatistics statistics = shariahScreeningService.getAlertStatistics();
        return ResponseEntity.ok(ApiResponse.ok(statistics));
    }
}
