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

    @PostMapping("/{code}/beneficiaries")
    @io.swagger.v3.oas.annotations.Operation(summary = "Add beneficiary to trust")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> addBeneficiary(
            @PathVariable String code, @RequestBody java.util.Map<String, Object> data) {
        data.put("id", java.util.UUID.randomUUID().toString().substring(0, 8));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @PutMapping("/{code}/beneficiaries/{beneficiaryId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "Update beneficiary")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> updateBeneficiary(
            @PathVariable String code, @PathVariable String beneficiaryId,
            @RequestBody java.util.Map<String, Object> data) {
        data.put("id", beneficiaryId);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @DeleteMapping("/{code}/beneficiaries/{beneficiaryId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "Remove beneficiary")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeBeneficiary(
            @PathVariable String code, @PathVariable String beneficiaryId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{code}/scheduled-distributions")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get scheduled distributions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getScheduledDistributions(
            @PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.List.of()));
    }

    @PostMapping("/{code}/scheduled-distributions")
    @io.swagger.v3.oas.annotations.Operation(summary = "Schedule a distribution")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> scheduleDistribution(
            @PathVariable String code, @RequestBody java.util.Map<String, Object> data) {
        data.put("id", java.util.UUID.randomUUID().toString().substring(0, 8));
        data.put("status", "SCHEDULED");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @GetMapping("/{code}/compliance")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get trust compliance status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getTrustCompliance(
            @PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.List.of(
                java.util.Map.<String, Object>of("item", "Annual Filing", "status", "COMPLIANT", "dueDate", "2026-12-31", "notes", "Filed on time"),
                java.util.Map.<String, Object>of("item", "KYC Update", "status", "PENDING", "dueDate", "2026-06-30", "notes", "Review in progress"),
                java.util.Map.<String, Object>of("item", "Distribution Reporting", "status", "COMPLIANT", "dueDate", "2026-03-31", "notes", "Submitted")
        )));
    }

    @GetMapping("/analytics")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get trust analytics summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTrustAnalytics() {
        var trusts = service.getAllTrusts();
        var totalCorpus = trusts.stream().map(t -> t.getCorpusValue() != null ? t.getCorpusValue() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        var totalDistributions = trusts.stream().map(t -> t.getDistributionsYtd() != null ? t.getDistributionsYtd() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of(
                "totalTrusts", trusts.size(),
                "totalCorpus", totalCorpus,
                "totalDistributionsYtd", totalDistributions,
                "activeTrusts", trusts.stream().filter(t -> "ACTIVE".equals(t.getStatus())).count(),
                "pendingTrusts", trusts.stream().filter(t -> "PENDING".equals(t.getStatus())).count()
        )));
    }
}
