package com.cbs.islamicrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.service.IslamicRiskClassificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-risk/classification")
@RequiredArgsConstructor
public class IslamicRiskClassificationController {

    private final IslamicRiskClassificationService classificationService;

    @PostMapping("/classify/{contractId}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFinancingRiskClassification>> classify(
            @PathVariable Long contractId,
            @Valid @RequestBody IslamicRiskRequests.ClassifyContractRequest request,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate classificationDate) {
        return ResponseEntity.ok(ApiResponse.ok(
                classificationService.classifyContract(contractId, request.getContractTypeCode(), classificationDate, request)));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<String>> classifyBatch(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate classificationDate) {
        classificationService.classifyAll(classificationDate);
        return ResponseEntity.ok(ApiResponse.ok("Classification batch completed"));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicFinancingRiskClassification>> latest(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getLatestClassification(contractId)));
    }

    @PostMapping("/watch-list/add")
    @PreAuthorize("hasRole('RISK_OFFICER')")
    public ResponseEntity<ApiResponse<String>> addToWatchList(@Valid @RequestBody IslamicRiskRequests.WatchListRequest request) {
        classificationService.addToWatchList(request.getContractId(), request.getContractTypeCode(), request.getReason());
        return ResponseEntity.ok(ApiResponse.ok("Contract added to watch list"));
    }

    @PostMapping("/watch-list/remove")
    @PreAuthorize("hasRole('RISK_OFFICER')")
    public ResponseEntity<ApiResponse<String>> removeFromWatchList(@Valid @RequestBody IslamicRiskRequests.WatchListRequest request) {
        classificationService.removeFromWatchList(request.getContractId(), request.getReason(), request.getActionBy());
        return ResponseEntity.ok(ApiResponse.ok("Contract removed from watch list"));
    }

    @GetMapping("/watch-list")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicFinancingRiskClassification>>> watchList() {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getWatchListContracts()));
    }

    @GetMapping("/stage-migration")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.StageMigrationMatrix>> stageMigration(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getStageMigration(from, to)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.RiskClassificationSummary>> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getSummary(asOfDate)));
    }
}
