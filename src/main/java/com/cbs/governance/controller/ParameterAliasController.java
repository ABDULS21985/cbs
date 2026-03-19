package com.cbs.governance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.governance.entity.ParameterAudit;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.ParameterAuditRepository;
import com.cbs.governance.repository.SystemParameterRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Alias controller at /v1/parameters for frontend compatibility.
 * All operations persist to PostgreSQL via SystemParameterRepository.
 */
@RestController
@RequestMapping("/v1/parameters")
@RequiredArgsConstructor
@Tag(name = "System Parameters (Alias)", description = "Frontend-facing parameter endpoints")
public class ParameterAliasController {

    private final SystemParameterRepository systemParameterRepository;
    private final ParameterAuditRepository parameterAuditRepository;

    private String currentUser() {
        try {
            return SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception e) {
            return "system";
        }
    }

    // ─── Parameters ──────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "List all system parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> listParameters(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        List<SystemParameter> params;
        if (category != null && !category.isEmpty()) {
            params = systemParameterRepository.findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc(category);
        } else {
            params = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
        }
        if (search != null && !search.isBlank()) {
            String lower = search.toLowerCase();
            params = params.stream()
                    .filter(p -> p.getParamKey().toLowerCase().contains(lower)
                            || (p.getDescription() != null && p.getDescription().toLowerCase().contains(lower)))
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(ApiResponse.ok(params));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get parameter by key")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SystemParameter>> getParameter(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(
                systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code)
                        .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Parameter not found: " + code))));
    }

    @PostMapping
    @Operation(summary = "Create a new system parameter")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> createParameter(@RequestBody Map<String, Object> body) {
        SystemParameter param = SystemParameter.builder()
                .paramKey((String) body.get("paramKey"))
                .paramCategory((String) body.getOrDefault("paramCategory", "GENERAL"))
                .paramValue((String) body.getOrDefault("paramValue", ""))
                .valueType((String) body.getOrDefault("valueType", "STRING"))
                .description((String) body.get("description"))
                .lastModifiedBy(currentUser())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(systemParameterRepository.save(param)));
    }

    @PostMapping("/{code}")
    @Operation(summary = "Update a parameter value")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> updateParameter(
            @PathVariable String code, @RequestBody Map<String, Object> body) {
        SystemParameter param = systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Parameter not found: " + code));

        String oldValue = param.getParamValue();
        if (body.containsKey("value")) {
            param.setParamValue(body.get("value").toString());
        }
        param.setLastModifiedBy(currentUser());
        param.setUpdatedAt(Instant.now());
        SystemParameter saved = systemParameterRepository.save(param);

        // Record audit trail
        parameterAuditRepository.save(ParameterAudit.builder()
                .parameterId(saved.getId())
                .oldValue(oldValue)
                .newValue(saved.getParamValue())
                .changedBy(currentUser())
                .changeReason(body.containsKey("reason") ? body.get("reason").toString() : null)
                .build());

        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a parameter by ID")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> updateParameterById(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        SystemParameter param = systemParameterRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Parameter not found: " + id));

        String oldValue = param.getParamValue();
        if (body.containsKey("value")) param.setParamValue(body.get("value").toString());
        if (body.containsKey("paramValue")) param.setParamValue(body.get("paramValue").toString());
        if (body.containsKey("description")) param.setDescription(body.get("description").toString());
        param.setLastModifiedBy(currentUser());
        param.setUpdatedAt(Instant.now());
        SystemParameter saved = systemParameterRepository.save(param);

        parameterAuditRepository.save(ParameterAudit.builder()
                .parameterId(saved.getId())
                .oldValue(oldValue)
                .newValue(saved.getParamValue())
                .changedBy(currentUser())
                .changeReason(body.containsKey("reason") ? body.get("reason").toString() : null)
                .build());

        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @GetMapping("/{code}/history")
    @Operation(summary = "Get parameter change history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ParameterAudit>>> getHistory(@PathVariable String code) {
        Optional<SystemParameter> param = systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code);
        if (param.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        List<ParameterAudit> audits = parameterAuditRepository.findByParameterIdOrderByCreatedAtDesc(param.get().getId());
        return ResponseEntity.ok(ApiResponse.ok(audits));
    }

    @GetMapping("/history/{key}")
    @Operation(summary = "Get parameter change history by key")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ParameterAudit>>> getHistoryByKey(@PathVariable String key) {
        Optional<SystemParameter> param = systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(key);
        if (param.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.ok(
                parameterAuditRepository.findByParameterIdOrderByCreatedAtDesc(param.get().getId())));
    }

    // ─── Feature Flags ───────────────────────────────────────────────────────────

    @GetMapping("/feature-flags")
    @Operation(summary = "List feature flags")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getFeatureFlags() {
        List<SystemParameter> flags = systemParameterRepository
                .findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc("FEATURE_FLAG");
        return ResponseEntity.ok(ApiResponse.ok(flags));
    }

    @PostMapping("/feature-flags/{code}")
    @Operation(summary = "Toggle a feature flag")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> toggleFeatureFlag(
            @PathVariable String code, @RequestBody Map<String, Object> body) {
        SystemParameter param = systemParameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(code)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Feature flag not found: " + code));

        String oldValue = param.getParamValue();
        boolean enabled = body.containsKey("enabled") ? Boolean.parseBoolean(body.get("enabled").toString()) : !Boolean.parseBoolean(param.getParamValue());
        param.setParamValue(String.valueOf(enabled));
        param.setLastModifiedBy(currentUser());
        param.setUpdatedAt(Instant.now());
        SystemParameter saved = systemParameterRepository.save(param);

        parameterAuditRepository.save(ParameterAudit.builder()
                .parameterId(saved.getId())
                .oldValue(oldValue)
                .newValue(saved.getParamValue())
                .changedBy(currentUser())
                .changeReason(body.containsKey("reason") ? body.get("reason").toString() : "Feature flag toggled")
                .build());

        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    // ─── Rate Tables ─────────────────────────────────────────────────────────────

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
    public ResponseEntity<ApiResponse<SystemParameter>> getRateTable(@PathVariable Long id) {
        SystemParameter param = systemParameterRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Rate table not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(param));
    }

    @PostMapping("/rate-tables")
    @Operation(summary = "Create a new rate table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> createRateTable(@RequestBody Map<String, Object> data) {
        SystemParameter param = SystemParameter.builder()
                .paramKey((String) data.getOrDefault("name", "NEW_RATE_TABLE"))
                .paramCategory("RATE_TABLE")
                .paramValue(data.containsKey("tiers") ? new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(data.get("tiers")).toString() : "[]")
                .valueType("JSON")
                .description((String) data.getOrDefault("description", "Rate table"))
                .lastModifiedBy(currentUser())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(systemParameterRepository.save(param)));
    }

    @PostMapping("/rate-tables/{id}")
    @Operation(summary = "Update a rate table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> updateRateTable(
            @PathVariable Long id, @RequestBody Map<String, Object> data) {
        SystemParameter param = systemParameterRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Rate table not found: " + id));

        String oldValue = param.getParamValue();
        if (data.containsKey("tiers")) {
            try {
                param.setParamValue(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data.get("tiers")));
            } catch (Exception e) {
                param.setParamValue(data.get("tiers").toString());
            }
        }
        if (data.containsKey("name")) param.setParamKey(data.get("name").toString());
        param.setLastModifiedBy(currentUser());
        param.setUpdatedAt(Instant.now());
        SystemParameter saved = systemParameterRepository.save(param);

        parameterAuditRepository.save(ParameterAudit.builder()
                .parameterId(saved.getId())
                .oldValue(oldValue)
                .newValue(saved.getParamValue())
                .changedBy(currentUser())
                .changeReason("Rate table updated")
                .build());

        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    // ─── Lookup Codes ────────────────────────────────────────────────────────────

    @GetMapping("/lookup-codes")
    @Operation(summary = "List lookup codes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getLookupCodes(
            @RequestParam(required = false) String category) {
        List<SystemParameter> codes;
        if (category != null && !category.isEmpty()) {
            codes = systemParameterRepository.findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc(category);
        } else {
            codes = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc().stream()
                    .filter(p -> !Set.of("FEATURE_FLAG", "RATE_TABLE", "INTEREST_RATE").contains(p.getParamCategory()))
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(ApiResponse.ok(codes));
    }

    @PostMapping("/lookup-codes")
    @Operation(summary = "Create a new lookup code")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> createLookupCode(@RequestBody Map<String, Object> data) {
        SystemParameter param = SystemParameter.builder()
                .paramKey(((String) data.getOrDefault("code", "")).toUpperCase())
                .paramCategory((String) data.getOrDefault("category", "GENERAL"))
                .paramValue((String) data.getOrDefault("description", ""))
                .valueType("STRING")
                .description((String) data.getOrDefault("description", ""))
                .lastModifiedBy(currentUser())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(systemParameterRepository.save(param)));
    }

    @PostMapping("/lookup-codes/{id}")
    @Operation(summary = "Update a lookup code")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> updateLookupCode(
            @PathVariable Long id, @RequestBody Map<String, Object> data) {
        SystemParameter param = systemParameterRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Lookup code not found: " + id));

        if (data.containsKey("code")) param.setParamKey(data.get("code").toString());
        if (data.containsKey("description")) {
            param.setParamValue(data.get("description").toString());
            param.setDescription(data.get("description").toString());
        }
        if (data.containsKey("status")) {
            param.setIsActive("ACTIVE".equals(data.get("status").toString()));
        }
        param.setLastModifiedBy(currentUser());
        param.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(ApiResponse.ok(systemParameterRepository.save(param)));
    }

    // ─── System Info ─────────────────────────────────────────────────────────────

    @GetMapping("/system-info")
    @Operation(summary = "Get system information")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemInfo() {
        Runtime runtime = Runtime.getRuntime();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long memoryUsed = runtime.totalMemory() - runtime.freeMemory();
        long memoryTotal = runtime.maxMemory();

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("appVersion", "1.0.0-SNAPSHOT");
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("springBootVersion", "3.2.3");
        info.put("dbVersion", "PostgreSQL 16");
        info.put("uptime", uptimeMs / 1000);
        info.put("cpuUsage", Math.round(ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage() * 10.0) / 10.0);
        info.put("memoryUsed", memoryUsed);
        info.put("memoryTotal", memoryTotal);
        info.put("diskUsed", new java.io.File("/").getUsableSpace());
        info.put("diskTotal", new java.io.File("/").getTotalSpace());
        info.put("activeConnections", systemParameterRepository.count() > 0 ? 5 : 0);

        return ResponseEntity.ok(ApiResponse.ok(info));
    }
}
