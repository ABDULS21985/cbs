package com.cbs.branchnetwork.controller;

import com.cbs.branchnetwork.entity.BranchPerformance;
import com.cbs.branchnetwork.service.BranchPerformanceService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/branch-performance") @RequiredArgsConstructor
@Tag(name = "Branch Performance", description = "Branch portfolio performance tracking, ranking, digital migration analysis")
public class BranchPerformanceController {

    private final BranchPerformanceService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchPerformance>> record(@RequestBody BranchPerformance performance) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordPerformance(performance)));
    }

    @GetMapping("/ranking") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchPerformance>>> ranking(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate,
            @RequestParam(required = false, defaultValue = "MONTHLY") String periodType) {
        if (periodDate == null) periodDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(service.getBranchRanking(periodDate, periodType)));
    }

    @GetMapping("/underperformers") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchPerformance>>> underperformers(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate,
            @RequestParam(required = false, defaultValue = "MONTHLY") String periodType,
            @RequestParam(required = false) BigDecimal maxCostToIncome) {
        if (periodDate == null) periodDate = LocalDate.now();
        if (maxCostToIncome == null) maxCostToIncome = new BigDecimal("100");
        return ResponseEntity.ok(ApiResponse.ok(service.getUnderperformers(periodDate, periodType, maxCostToIncome)));
    }

    @GetMapping("/digital-migration") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchPerformance>>> digitalMigration(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate,
            @RequestParam(required = false, defaultValue = "MONTHLY") String periodType) {
        if (periodDate == null) periodDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(service.getDigitalMigrationReport(periodDate, periodType)));
    }

    @GetMapping("/branch/{branchId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchPerformance>>> byBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByBranch(branchId)));
    }
}
