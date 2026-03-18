package com.cbs.provider.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.provider.entity.ProviderHealthLog;
import com.cbs.provider.entity.ProviderTransactionLog;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.service.ProviderManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController @RequestMapping("/v1/providers") @RequiredArgsConstructor
@Tag(name = "Provider Management", description = "Service provider registry, health monitoring, SLA tracking, failover")
public class ProviderManagementController {

    private final ProviderManagementService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ServiceProvider>> register(@RequestBody ServiceProvider provider) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerProvider(provider)));
    }

    @PostMapping("/{code}/activate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> activate(@PathVariable String code) {
        ServiceProvider provider = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.activateProvider(provider.getId())));
    }

    @PostMapping("/{code}/health-check") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProviderHealthLog>> healthCheck(
            @PathVariable String code,
            @RequestParam int responseTimeMs, @RequestParam int httpStatusCode,
            @RequestParam boolean isHealthy, @RequestParam(defaultValue = "") String errorMessage) {
        ServiceProvider provider = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.healthCheck(provider.getId(), responseTimeMs, httpStatusCode, isHealthy, errorMessage)));
    }

    @PostMapping("/{code}/transaction") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProviderTransactionLog>> logTransaction(
            @PathVariable String code, @RequestBody ProviderTransactionLog txnLog) {
        ServiceProvider provider = service.getByCode(code);
        txnLog.setProviderId(provider.getId());
        return ResponseEntity.ok(ApiResponse.ok(service.logTransaction(txnLog)));
    }

    @PostMapping("/{code}/failover") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> failover(@PathVariable String code) {
        ServiceProvider provider = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.triggerFailover(provider.getId())));
    }

    @GetMapping("/{code}/dashboard") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard(@PathVariable String code) {
        ServiceProvider provider = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.getProviderDashboard(provider.getId())));
    }

    @GetMapping("/cost-report") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> costReport() {
        return ResponseEntity.ok(ApiResponse.ok(service.getProviderCostReport()));
    }

    @GetMapping("/sla-compliance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> slaCompliance() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSlaComplianceReport()));
    }
}
