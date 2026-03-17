package com.cbs.governance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.governance.entity.*;
import com.cbs.governance.service.ParameterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/governance/parameters") @RequiredArgsConstructor
@Tag(name = "Parameter Management", description = "Centralised system parameters with hierarchical lookup, maker-checker, audit trail")
public class ParameterController {
    private final ParameterService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> create(@RequestBody SystemParameter param, @RequestParam String createdBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createParameter(param, createdBy)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> update(
            @PathVariable Long id, @RequestParam String newValue, @RequestParam String changedBy,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateParameter(id, newValue, changedBy, reason)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SystemParameter>> approve(@PathVariable Long id, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(service.approveParameter(id, approvedBy)));
    }

    @GetMapping("/key/{key}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SystemParameter>> getByKey(
            @PathVariable String key, @RequestParam(required = false) Long tenantId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getParameter(key, tenantId)));
    }

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCategory(category)));
    }

    @GetMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/{id}/audit")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ParameterAudit>>> getAudit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAuditTrail(id)));
    }
}
