package com.cbs.islamicrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicEclConfiguration;
import com.cbs.islamicrisk.service.IslamicEclService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-risk/ecl")
@RequiredArgsConstructor
public class IslamicEclController {

    private final IslamicEclService islamicEclService;

    @PostMapping("/calculate/{contractId}")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicEclCalculation>> calculate(
            @PathVariable Long contractId,
            @RequestParam String contractType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate calculationDate) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.calculateEcl(contractId, contractType, calculationDate)));
    }

    @PostMapping("/batch/{contractType}")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.EclBatchResult>> batch(
            @PathVariable String contractType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate calculationDate) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.calculateEclBatch(contractType, calculationDate)));
    }

    @PostMapping("/batch/all")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<List<IslamicRiskResponses.EclBatchResult>>> batchAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate calculationDate) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.calculateAllEcl(calculationDate)));
    }

    @PostMapping("/post-provisions")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<String>> postProvisions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate calculationDate) {
        islamicEclService.postProvisions(calculationDate);
        return ResponseEntity.ok(ApiResponse.ok("Provision posting completed"));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicEclCalculation>> latest(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getLatestEcl(contractId)));
    }

    @GetMapping("/contract/{contractId}/history")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicEclCalculation>>> history(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getEclHistory(contractId)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.EclPortfolioSummary>> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate calculationDate) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getEclSummary(calculationDate)));
    }

    @GetMapping("/movement")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.EclMovementReport>> movement(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getEclMovement(from, to)));
    }

    @GetMapping("/stage-distribution/{contractType}")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.StageDistribution>> stageDistribution(@PathVariable String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getStageDistribution(contractType)));
    }

    @GetMapping("/configs")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicEclConfiguration>>> getConfigs() {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.getConfigs()));
    }

    @PostMapping("/configs")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicEclConfiguration>> createConfig(
            @Valid @RequestBody IslamicRiskRequests.EclConfigRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicEclService.createConfig(request)));
    }

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicEclConfiguration>> updateConfig(
            @PathVariable Long id,
            @Valid @RequestBody IslamicRiskRequests.EclConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicEclService.updateConfig(id, request)));
    }
}
