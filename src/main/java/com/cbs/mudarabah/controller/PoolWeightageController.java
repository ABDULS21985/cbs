package com.cbs.mudarabah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.*;
import com.cbs.mudarabah.service.PoolWeightageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/mudarabah/pools")
@RequiredArgsConstructor
public class PoolWeightageController {

    private final PoolWeightageService poolWeightageService;

    @PostMapping("/record-all-weightages")
    public ResponseEntity<ApiResponse<Void>> recordDailyWeightagesForAllPools(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Recording daily weightages for all pools on date: {}", date);
        poolWeightageService.recordDailyWeightagesForAllPools(date);
        return ResponseEntity.ok(ApiResponse.ok(null, "Daily weightages recorded for all pools"));
    }

    @PostMapping("/{poolId}/record-weightages")
    public ResponseEntity<ApiResponse<Void>> recordDailyWeightages(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Recording daily weightages for pool: {} on date: {}", poolId, date);
        poolWeightageService.recordDailyWeightages(poolId, date);
        return ResponseEntity.ok(ApiResponse.ok(null, "Daily weightages recorded successfully"));
    }

    @GetMapping("/{poolId}/weightages")
    public ResponseEntity<ApiResponse<PoolWeightageSummary>> getPoolWeightageSummary(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching weightage summary for pool: {} from {} to {}", poolId, from, to);
        PoolWeightageSummary summary = poolWeightageService.getPoolWeightageSummary(poolId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/{poolId}/weightage/{accountId}")
    public ResponseEntity<ApiResponse<BigDecimal>> calculateWeightage(
            @PathVariable Long poolId,
            @PathVariable Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Calculating weightage for pool: {}, account: {} from {} to {}", poolId, accountId, from, to);
        BigDecimal weightage = poolWeightageService.calculateWeightage(poolId, accountId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(weightage));
    }

    @PostMapping("/{poolId}/allocate-profit")
    public ResponseEntity<ApiResponse<List<PoolProfitAllocationResponse>>> allocateProfit(
            @PathVariable Long poolId,
            @Valid @RequestBody AllocateProfitRequest request) {
        log.info("Allocating profit for pool: {}, gross profit: {}", poolId, request.getGrossProfit());
        List<PoolProfitAllocationResponse> allocations = poolWeightageService.allocateProfit(
                poolId, request.getGrossProfit(), request.getPeriodFrom(), request.getPeriodTo());
        return ResponseEntity.ok(ApiResponse.ok(allocations, "Profit allocated successfully"));
    }

    @PostMapping("/{poolId}/allocations/approve")
    public ResponseEntity<ApiResponse<Void>> approveAllocations(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        log.info("Approving allocations for pool: {} from {} to {}", poolId, periodFrom, periodTo);
        poolWeightageService.approveAllocations(poolId, periodFrom, periodTo);
        return ResponseEntity.ok(ApiResponse.ok(null, "Allocations approved successfully"));
    }

    @PostMapping("/{poolId}/distribute-profit")
    public ResponseEntity<ApiResponse<Void>> distributeProfit(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        log.info("Distributing profit for pool: {} from {} to {}", poolId, periodFrom, periodTo);
        poolWeightageService.distributeProfit(poolId, periodFrom, periodTo);
        return ResponseEntity.ok(ApiResponse.ok(null, "Profit distributed successfully"));
    }

    @GetMapping("/{poolId}/allocations")
    public ResponseEntity<ApiResponse<PoolPerformanceReport>> getAllocations(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching allocations for pool: {} from {} to {}", poolId, from, to);
        PoolPerformanceReport report = poolWeightageService.getPoolPerformanceReport(poolId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @GetMapping("/{poolId}/performance")
    public ResponseEntity<ApiResponse<PoolPerformanceReport>> getPoolPerformanceReport(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching performance report for pool: {} from {} to {}", poolId, from, to);
        PoolPerformanceReport report = poolWeightageService.getPoolPerformanceReport(poolId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @GetMapping("/accounts/{accountId}/profit-allocations")
    public ResponseEntity<ApiResponse<List<PoolProfitAllocationResponse>>> getProfitAllocationHistory(
            @PathVariable Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching profit allocation history for account: {} from {} to {}", accountId, from, to);
        List<PoolProfitAllocationResponse> history = poolWeightageService.getProfitAllocationHistory(accountId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }
}
