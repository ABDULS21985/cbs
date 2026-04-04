package com.cbs.wadiah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.wadiah.dto.CreateHibahBatchRequest;
import com.cbs.wadiah.dto.CreateHibahPolicyRequest;
import com.cbs.wadiah.dto.HibahDashboard;
import com.cbs.wadiah.dto.HibahPatternAnalysis;
import com.cbs.wadiah.entity.HibahDistributionBatch;
import com.cbs.wadiah.entity.HibahDistributionItem;
import com.cbs.wadiah.entity.HibahPolicy;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.service.HibahDistributionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/wadiah/hibah")
@RequiredArgsConstructor
public class HibahDistributionController {

    private final HibahDistributionService hibahDistributionService;

    @PostMapping("/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<HibahPolicy>> createPolicy(@Valid @RequestBody CreateHibahPolicyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(hibahDistributionService.createPolicy(request)));
    }

    @GetMapping("/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<HibahPolicy>>> getPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getPolicies()));
    }

    @GetMapping("/policies/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<HibahPolicy>> getActivePolicy() {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getActivePolicy()));
    }

    @PutMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<HibahPolicy>> updatePolicy(
            @PathVariable Long id,
            @RequestBody CreateHibahPolicyRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.updatePolicy(id, request)));
    }

    @PostMapping("/batches")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<HibahDistributionBatch>> createBatch(
            @Valid @RequestBody CreateHibahBatchRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(hibahDistributionService.createDistributionBatch(request)));
    }

    @GetMapping("/batches/{id}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBatch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.previewBatch(id)));
    }

    @GetMapping("/batches/{id}/preview")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewBatch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.previewBatch(id)));
    }

    @PostMapping("/batches/{id}/submit")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submit(@PathVariable Long id) {
        hibahDistributionService.submitBatchForApproval(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("submitted", true)));
    }

    @PostMapping("/batches/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(
            @PathVariable Long id,
            Authentication authentication
    ) {
        hibahDistributionService.approveBatch(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("approved", true)));
    }

    @PostMapping("/batches/{id}/process")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> process(
            @PathVariable Long id,
            Authentication authentication
    ) {
        hibahDistributionService.processBatch(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/batches/{id}/cancel")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancel(
            @PathVariable Long id,
            @RequestParam String reason
    ) {
        hibahDistributionService.cancelBatch(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("cancelled", true)));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<HibahDistributionBatch>>> history(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getDistributionHistory(from, to)));
    }

    @GetMapping("/account/{accountId}/history")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','SHARIAH_BOARD','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<HibahDistributionItem>>> accountHistory(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getAccountHibahHistory(accountId)));
    }

    @GetMapping("/pattern-analysis")
    @PreAuthorize("hasAnyRole('COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<HibahPatternAnalysis>> patternAnalysis() {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.analyzeHibahPatterns(null)));
    }

    @GetMapping("/warnings")
    @PreAuthorize("hasAnyRole('COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<WadiahAccount>>> warnings() {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getAccountsWithHibahWarning()));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<HibahDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(hibahDistributionService.getHibahDashboard()));
    }
}
