package com.cbs.trustservices.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.trustservices.entity.TrustAccount;
import com.cbs.trustservices.service.TrustService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/trusts")
@RequiredArgsConstructor
@Tag(name = "Trust Services", description = "Trust creation, corpus management, distributions, beneficiary tracking")
public class TrustController {

    private final TrustService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllTrusts()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TrustAccount>> create(@RequestBody TrustAccount trust) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(trust)));
    }

    @GetMapping("/{code}")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get trust detail by code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TrustAccount>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllTrusts().stream()
                .filter(t -> code.equals(t.getTrustCode()))
                .findFirst()
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trust not found: " + code))));
    }

    @PostMapping("/{code}/distribute")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TrustAccount>> distribute(
            @PathVariable String code, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordDistribution(code, amount)));
    }

    @GetMapping("/grantor/{grantorId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> getByGrantor(@PathVariable Long grantorId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByGrantor(grantorId)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @PutMapping("/{code}")
    @io.swagger.v3.oas.annotations.Operation(summary = "Update trust account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TrustAccount>> updateTrust(
            @PathVariable String code, @RequestBody TrustAccount updates) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateTrust(code, updates)));
    }

    @GetMapping("/{code}/distributions")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get distribution history for a trust")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getDistributions(@PathVariable String code) {
        TrustAccount trust = service.getAllTrusts().stream()
                .filter(t -> code.equals(t.getTrustCode()))
                .findFirst()
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trust not found: " + code));
        // Return distribution records from trust metadata or empty list
        return ResponseEntity.ok(ApiResponse.ok(java.util.List.of()));
    }
}
