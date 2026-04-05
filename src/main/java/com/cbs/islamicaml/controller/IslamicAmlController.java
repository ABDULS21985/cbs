package com.cbs.islamicaml.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.service.IslamicAmlMonitoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-aml/monitoring")
@RequiredArgsConstructor
@Slf4j
public class IslamicAmlController {

    private final IslamicAmlMonitoringService monitoringService;

    // ===================== TRANSACTION MONITORING =====================

    @PostMapping("/screen")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> screenTransaction(
            @Valid @RequestBody AmlMonitoringContext context) {
        log.info("Screening transaction for customer {}", context.getCustomerId());
        List<IslamicAmlAlertResponse> alerts = monitoringService.monitorTransaction(context);
        return ResponseEntity.ok(ApiResponse.ok(alerts, "Transaction screening completed"));
    }

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> runBatchMonitoring(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate analysisDate) {
        log.info("Running batch monitoring for date {}", analysisDate);
        List<IslamicAmlAlertResponse> alerts = monitoringService.runBatchMonitoring(analysisDate);
        return ResponseEntity.ok(ApiResponse.ok(alerts, "Batch monitoring completed"));
    }

    @PostMapping("/tawarruq/{customerId}")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> monitorTawarruqPatterns(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "90") int lookbackDays) {
        log.info("Monitoring Tawarruq patterns for customer {} with lookback {} days", customerId, lookbackDays);
        List<IslamicAmlAlertResponse> alerts = monitoringService.monitorTawarruqPatterns(customerId, lookbackDays);
        return ResponseEntity.ok(ApiResponse.ok(alerts, "Tawarruq monitoring completed"));
    }

    @PostMapping("/pool/{poolId}")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> monitorPoolMovements(
            @PathVariable Long poolId,
            @RequestParam(defaultValue = "30") int lookbackDays) {
        log.info("Monitoring pool movements for pool {} with lookback {} days", poolId, lookbackDays);
        List<IslamicAmlAlertResponse> alerts = monitoringService.monitorPoolMovements(poolId, lookbackDays);
        return ResponseEntity.ok(ApiResponse.ok(alerts, "Pool movement monitoring completed"));
    }

    // ===================== ALERT MANAGEMENT =====================

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> getAlerts(
            IslamicAmlAlertCriteria criteria, Pageable pageable) {
        Page<IslamicAmlAlertResponse> page = monitoringService.getAlerts(criteria, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), PageMeta.from(page)));
    }

    @GetMapping("/alerts/{id}")
    public ResponseEntity<ApiResponse<IslamicAmlAlertResponse>> getAlert(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(monitoringService.getAlert(id)));
    }

    @PostMapping("/alerts/{id}/assign")
    public ResponseEntity<ApiResponse<Void>> assignAlert(
            @PathVariable Long id, @RequestParam String assignedTo) {
        monitoringService.assignAlert(id, assignedTo);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert assigned to " + assignedTo));
    }

    @PostMapping("/alerts/{id}/investigate")
    public ResponseEntity<ApiResponse<Void>> investigateAlert(
            @PathVariable Long id, @Valid @RequestBody InvestigationDetails details) {
        monitoringService.investigateAlert(id, details);
        return ResponseEntity.ok(ApiResponse.ok(null, "Investigation recorded"));
    }

    @PostMapping("/alerts/{id}/escalate")
    public ResponseEntity<ApiResponse<Void>> escalateAlert(
            @PathVariable Long id,
            @RequestParam String escalateTo,
            @RequestParam String reason) {
        monitoringService.escalateAlert(id, escalateTo, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert escalated to " + escalateTo));
    }

    @PostMapping("/alerts/{id}/close")
    public ResponseEntity<ApiResponse<Void>> closeAlert(
            @PathVariable Long id, @Valid @RequestBody CloseAlertRequest request) {
        monitoringService.closeAlert(id, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert closed"));
    }

    @PostMapping("/alerts/{id}/file-sar")
    public ResponseEntity<ApiResponse<Void>> fileSar(
            @PathVariable Long id, @RequestParam Long sarId) {
        monitoringService.fileSar(id, sarId);
        return ResponseEntity.ok(ApiResponse.ok(null, "SAR filed for alert"));
    }

    @GetMapping("/alerts/overdue")
    public ResponseEntity<ApiResponse<List<IslamicAmlAlertResponse>>> getOverdueAlerts() {
        return ResponseEntity.ok(ApiResponse.ok(monitoringService.getOverdueAlerts()));
    }

    @GetMapping("/alerts/statistics")
    public ResponseEntity<ApiResponse<IslamicAmlAlertStatistics>> getAlertStatistics() {
        return ResponseEntity.ok(ApiResponse.ok(monitoringService.getAlertStatistics()));
    }

    // ===================== RULE MANAGEMENT =====================

    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<IslamicAmlRuleResponse>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(monitoringService.getRules()));
    }

    @GetMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<IslamicAmlRuleResponse>> getRule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(monitoringService.getRule(id)));
    }

    @PostMapping("/rules")
    public ResponseEntity<ApiResponse<IslamicAmlRuleResponse>> createRule(
            @Valid @RequestBody CreateIslamicAmlRuleRequest request) {
        IslamicAmlRuleResponse rule = monitoringService.createRule(request);
        return ResponseEntity.ok(ApiResponse.ok(rule, "Rule created"));
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<ApiResponse<IslamicAmlRuleResponse>> updateRule(
            @PathVariable Long id, @Valid @RequestBody CreateIslamicAmlRuleRequest request) {
        IslamicAmlRuleResponse rule = monitoringService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.ok(rule, "Rule updated"));
    }
}
