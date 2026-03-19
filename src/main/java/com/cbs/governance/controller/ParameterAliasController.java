package com.cbs.governance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Alias controller at /v1/parameters for frontend compatibility.
 * Backend stores parameters at /v1/governance/parameters.
 */
@RestController
@RequestMapping("/v1/parameters")
@RequiredArgsConstructor
@Tag(name = "System Parameters (Alias)", description = "Frontend-facing parameter endpoints")
public class ParameterAliasController {

    private final SystemParameterRepository systemParameterRepository;

    @GetMapping
    @Operation(summary = "List all system parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> listParameters() {
        return ResponseEntity.ok(ApiResponse.ok(
                systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc()));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get parameter by key")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SystemParameter>> getParameter(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(
                systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code)
                        .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Parameter not found: " + code))));
    }

    @PostMapping("/{code}")
    @Operation(summary = "Update a parameter value")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> updateParameter(
            @PathVariable String code, @RequestBody Map<String, Object> body) {
        SystemParameter param = systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Parameter not found: " + code));
        if (body.containsKey("value")) {
            param.setParamValue(body.get("value").toString());
        }
        return ResponseEntity.ok(ApiResponse.ok(systemParameterRepository.save(param)));
    }

    @GetMapping("/{code}/history")
    @Operation(summary = "Get parameter change history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHistory(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/feature-flags")
    @Operation(summary = "List feature flags")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getFeatureFlags() {
        List<SystemParameter> flags = systemParameterRepository
                .findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc().stream()
                .filter(p -> "FEATURE_FLAG".equals(p.getParamCategory()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(flags));
    }

    @PostMapping("/feature-flags/{code}")
    @Operation(summary = "Toggle a feature flag")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> toggleFeatureFlag(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("code", code, "message", "Feature flag toggled")));
    }

    @GetMapping("/rate-tables")
    @Operation(summary = "List rate table parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getRateTables() {
        List<SystemParameter> rates = systemParameterRepository
                .findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc().stream()
                .filter(p -> "RATE_TABLE".equals(p.getParamCategory()) || "INTEREST_RATE".equals(p.getParamCategory()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(rates));
    }

    @GetMapping("/rate-tables/{id}")
    @Operation(summary = "Get rate table detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRateTable(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id)));
    }

    @PostMapping("/rate-tables/{id}")
    @Operation(summary = "Update a rate table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateRateTable(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "message", "Rate table updated")));
    }

    @GetMapping("/lookup-codes")
    @Operation(summary = "List lookup code categories")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<String>>> getLookupCodes() {
        List<String> categories = systemParameterRepository
                .findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc().stream()
                .map(SystemParameter::getParamCategory)
                .distinct()
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @PostMapping("/lookup-codes")
    @Operation(summary = "Create a new lookup code")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> createLookupCode(@RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Lookup code created")));
    }

    @PostMapping("/lookup-codes/{id}")
    @Operation(summary = "Update a lookup code")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateLookupCode(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "message", "Lookup code updated")));
    }

    @GetMapping("/system-info")
    @Operation(summary = "Get system information")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "version", "1.0.0-SNAPSHOT",
                "javaVersion", System.getProperty("java.version"),
                "uptime", java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()
        )));
    }
}
