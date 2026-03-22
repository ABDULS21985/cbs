package com.cbs.dspm.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.dspm.entity.*;
import com.cbs.dspm.service.DspmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/dspm")
@RequiredArgsConstructor
@Tag(name = "DSPM", description = "Data Security & Privacy Management — scans, policies, exceptions, identities, audit")
public class DspmController {

    private final DspmService service;

    // ── Data Sources ────────────────────────────────────────────────────────

    @GetMapping("/sources")
    @Operation(summary = "List all data sources")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmDataSource>>> listSources() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllDataSources()));
    }

    @PostMapping("/sources")
    @Operation(summary = "Register a new data source")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmDataSource>> createSource(@RequestBody DspmDataSource source) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createDataSource(source)));
    }

    @GetMapping("/sources/{code}")
    @Operation(summary = "Get data source by code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DspmDataSource>> getSource(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDataSourceByCode(code)));
    }

    // ── Scans (FIXES: accepts scope, assetTypes, fullScan from body) ────────

    @GetMapping("/scans")
    @Operation(summary = "List all scans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmScan>>> listScans() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllScans()));
    }

    @PostMapping("/scans")
    @Operation(summary = "Start a new scan with configurable scope, asset types, and full-scan flag")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmScan>> startScan(@RequestBody DspmScan scan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.startScan(scan)));
    }

    @PostMapping("/scans/{code}/complete")
    @Operation(summary = "Mark a scan as completed with findings summary")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmScan>> completeScan(
            @PathVariable String code,
            @RequestParam(defaultValue = "0") int issuesFound,
            @RequestParam(defaultValue = "0") int critical,
            @RequestParam(defaultValue = "0") int high,
            @RequestParam(defaultValue = "0") int medium,
            @RequestParam(defaultValue = "0") int low) {
        return ResponseEntity.ok(ApiResponse.ok(service.completeScan(code, issuesFound, critical, high, medium, low)));
    }

    // ── Policies (FIXES: accepts full rule object in body) ──────────────────

    @GetMapping("/policies")
    @Operation(summary = "List all policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmPolicy>>> listPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPolicies()));
    }

    @PostMapping("/policies")
    @Operation(summary = "Create a policy with full rule configuration")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmPolicy>> createPolicy(@RequestBody DspmPolicy policy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPolicy(policy)));
    }

    @PutMapping("/policies/{code}")
    @Operation(summary = "Update policy configuration including rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmPolicy>> updatePolicy(@PathVariable String code, @RequestBody DspmPolicy updates) {
        return ResponseEntity.ok(ApiResponse.ok(service.updatePolicy(code, updates)));
    }

    @PostMapping("/policies/{code}/activate")
    @Operation(summary = "Activate a policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmPolicy>> activatePolicy(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activatePolicy(code)));
    }

    // ── Exceptions (FIXES: supports sort/order via query params) ────────────

    @GetMapping("/exceptions")
    @Operation(summary = "List exceptions with sorting and pagination")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmException>>> listExceptions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String order) {
        Page<DspmException> result;
        if (status != null && !status.isBlank()) {
            result = service.getExceptionsByStatus(status, page, size, sortBy, order);
        } else {
            result = service.getExceptions(page, size, sortBy, order);
        }
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/exceptions")
    @Operation(summary = "Create an exception")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DspmException>> createException(@RequestBody DspmException exception) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createException(exception)));
    }

    @PostMapping("/exceptions/{code}/approve")
    @Operation(summary = "Approve an exception")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmException>> approveException(@PathVariable String code, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(service.approveException(code, approvedBy)));
    }

    @PostMapping("/exceptions/{code}/reject")
    @Operation(summary = "Reject an exception")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmException>> rejectException(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.rejectException(code)));
    }

    // ── Identities ──────────────────────────────────────────────────────────

    @GetMapping("/identities")
    @Operation(summary = "List all tracked identities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmIdentity>>> listIdentities() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllIdentities()));
    }

    @GetMapping("/identities/{code}")
    @Operation(summary = "Get identity details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DspmIdentity>> getIdentity(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getIdentityByCode(code)));
    }

    @PostMapping("/identities")
    @Operation(summary = "Register a tracked identity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DspmIdentity>> createIdentity(@RequestBody DspmIdentity identity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createIdentity(identity)));
    }

    // ── Access Audit (FIXES: Identity Audit Trail) ──────────────────────────

    @GetMapping("/identities/{code}/audit")
    @Operation(summary = "Get access audit trail for an identity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmAccessAudit>>> getIdentityAudit(
            @PathVariable String code,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        DspmIdentity identity = service.getIdentityByCode(code);
        Page<DspmAccessAudit> result = service.getAuditByIdentity(identity.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/audit")
    @Operation(summary = "List risky access events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DspmAccessAudit>>> listRiskyAccess() {
        return ResponseEntity.ok(ApiResponse.ok(service.getRiskyAccess()));
    }

    @PostMapping("/audit")
    @Operation(summary = "Record an access audit event")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DspmAccessAudit>> recordAccess(@RequestBody DspmAccessAudit audit) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordAccess(audit)));
    }
}
