package com.cbs.aml.controller;

import com.cbs.aml.entity.*;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.aml.service.AmlService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/aml")
@RequiredArgsConstructor
@Tag(name = "AML/CFT Monitoring", description = "Transaction monitoring rules, alerts, investigation, SAR filing")
public class AmlController {

    private final AmlService amlService;
    private final AmlAlertRepository amlAlertRepository;

    // Rules
    @PostMapping("/rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AmlRule>> createRule(@RequestBody AmlRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(amlService.createRule(rule)));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AmlRule>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(amlService.getAllActiveRules()));
    }

    // Alerts
    @GetMapping("/alerts/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AmlAlert>> getAlert(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(amlService.getAlert(id)));
    }

    @GetMapping("/alerts")
    @Operation(summary = "Get alerts by status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AmlAlert>>> getAlertsByStatus(@RequestParam AmlAlertStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AmlAlert> result = amlService.getAlertsByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/alerts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AmlAlert>>> getCustomerAlerts(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AmlAlert> result = amlService.getCustomerAlerts(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/alerts/{id}/assign")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AmlAlert>> assign(@PathVariable Long id, @RequestParam String assignedTo) {
        return ResponseEntity.ok(ApiResponse.ok(amlService.assignAlert(id, assignedTo)));
    }

    @PostMapping("/alerts/{id}/escalate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AmlAlert>> escalate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(amlService.escalateAlert(id)));
    }

    @PostMapping("/alerts/{id}/resolve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AmlAlert>> resolve(@PathVariable Long id,
            @RequestParam String resolution, @RequestParam String resolvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(amlService.resolveAlert(id, resolution, resolvedBy)));
    }

    @PostMapping("/alerts/{id}/file-sar")
    @Operation(summary = "File a Suspicious Activity Report")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AmlAlert>> fileSar(@PathVariable Long id,
            @RequestParam String sarReference, @RequestParam String filedBy) {
        return ResponseEntity.ok(ApiResponse.ok(amlService.fileSar(id, sarReference, filedBy)));
    }

    // Dashboard
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AmlService.AmlDashboard>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(amlService.getDashboard()));
    }

    // List all AML alerts
    @GetMapping
    @Operation(summary = "List all AML alerts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AmlAlert>>> listAlerts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AmlAlert> result = amlAlertRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
