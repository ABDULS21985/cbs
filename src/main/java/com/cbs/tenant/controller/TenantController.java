package com.cbs.tenant.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tenant.entity.Tenant;
import com.cbs.tenant.service.TenantService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/tenants") @RequiredArgsConstructor
@Tag(name = "Multi-Tenancy", description = "Tenant provisioning, isolation, branding, limits")
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Tenant>> create(@RequestBody Tenant tenant) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tenantService.createTenant(tenant)));
    }

    @GetMapping("/{tenantCode}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Tenant>> get(@PathVariable String tenantCode) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getTenant(tenantCode)));
    }

    @GetMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Tenant>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getAllActive()));
    }

    @PostMapping("/{tenantCode}/deactivate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Tenant>> deactivate(@PathVariable String tenantCode) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.deactivate(tenantCode)));
    }
}
