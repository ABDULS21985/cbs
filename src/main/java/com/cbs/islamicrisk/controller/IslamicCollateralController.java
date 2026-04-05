package com.cbs.islamicrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCollateralExtension;
import com.cbs.islamicrisk.service.IslamicCollateralService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-risk/collateral")
@RequiredArgsConstructor
public class IslamicCollateralController {

    private final IslamicCollateralService islamicCollateralService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicCollateralExtension>> register(
            @Valid @RequestBody IslamicRiskRequests.RegisterIslamicCollateralRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicCollateralService.registerCollateral(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','RISK_OFFICER','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCollateralExtension>> getCollateral(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.getCollateral(id)));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','RISK_OFFICER','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicCollateralExtension>>> byContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.getCollateralByContract(contractId)));
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> validate(@PathVariable Long id) {
        islamicCollateralService.validateCollateralPermissibility(id);
        return ResponseEntity.ok(ApiResponse.ok("Collateral validated"));
    }

    @PostMapping("/{id}/valuation")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<String>> recordValuation(
            @PathVariable Long id,
            @Valid @RequestBody IslamicRiskRequests.ValuationRequest request) {
        islamicCollateralService.recordValuation(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Valuation recorded"));
    }

    @GetMapping("/contract/{contractId}/coverage")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.CollateralCoverageResult>> coverage(
            @PathVariable Long contractId,
            @RequestParam String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.calculateCoverage(contractId, contractType)));
    }

    @GetMapping("/re-screening-due")
    @PreAuthorize("hasAnyRole('COMPLIANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicCollateralExtension>>> reScreeningDue() {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.getCollateralRequiringReScreening()));
    }

    @GetMapping("/expiring-takaful")
    @PreAuthorize("hasAnyRole('COMPLIANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicCollateralExtension>>> expiringTakaful(
            @RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.getCollateralWithExpiringTakaful(daysAhead)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.CollateralPortfolioSummary>> summary() {
        return ResponseEntity.ok(ApiResponse.ok(islamicCollateralService.getCollateralSummary()));
    }
}
