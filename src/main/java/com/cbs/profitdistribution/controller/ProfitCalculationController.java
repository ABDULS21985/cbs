package com.cbs.profitdistribution.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.profitdistribution.dto.CalculatePoolProfitRequest;
import com.cbs.profitdistribution.dto.PoolProfitCalculationResponse;
import com.cbs.profitdistribution.service.ProfitCalculationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/profit-distribution/calculations")
@RequiredArgsConstructor
@Slf4j
public class ProfitCalculationController {

    private final ProfitCalculationService profitCalculationService;

    @PostMapping
    public ResponseEntity<ApiResponse<PoolProfitCalculationResponse>> calculatePoolProfit(
            @Valid @RequestBody CalculatePoolProfitRequest request) {
        log.info("Calculating pool profit for pool: {} from: {} to: {}",
                request.getPoolId(), request.getPeriodFrom(), request.getPeriodTo());
        PoolProfitCalculationResponse response = profitCalculationService.calculatePoolProfit(
                request.getPoolId(), request.getPeriodFrom(), request.getPeriodTo());
        return ResponseEntity.ok(ApiResponse.ok(response, "Pool profit calculated successfully"));
    }

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<PoolProfitCalculationResponse>>> calculateAllPoolProfits(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Calculating all pool profits from: {} to: {}", from, to);
        List<PoolProfitCalculationResponse> response = profitCalculationService.calculateAllPoolProfits(from, to);
        return ResponseEntity.ok(ApiResponse.ok(response, "All pool profits calculated successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PoolProfitCalculationResponse>> getCalculation(
            @PathVariable Long id) {
        log.info("Getting calculation: {}", id);
        PoolProfitCalculationResponse response = profitCalculationService.getCalculation(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/ref/{ref}")
    public ResponseEntity<ApiResponse<PoolProfitCalculationResponse>> getCalculationByRef(
            @PathVariable String ref) {
        log.info("Getting calculation by reference: {}", ref);
        PoolProfitCalculationResponse response = profitCalculationService.getCalculationByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/recalculate")
    public ResponseEntity<ApiResponse<PoolProfitCalculationResponse>> recalculatePoolProfit(
            @PathVariable Long id) {
        log.info("Recalculating pool profit for calculation: {}", id);
        PoolProfitCalculationResponse response = profitCalculationService.recalculatePoolProfit(id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Pool profit recalculated successfully"));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<Void>> validateCalculation(
            @PathVariable Long id,
            @RequestParam String validatedBy) {
        log.info("Validating calculation: {} by: {}", id, validatedBy);
        profitCalculationService.validateCalculation(id, validatedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Calculation validated successfully"));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveCalculation(
            @PathVariable Long id,
            @RequestParam String approvedBy) {
        log.info("Approving calculation: {} by: {}", id, approvedBy);
        profitCalculationService.approveCalculation(id, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Calculation approved successfully"));
    }

    @GetMapping("/pool/{poolId}")
    public ResponseEntity<ApiResponse<List<PoolProfitCalculationResponse>>> getCalculationsByPool(
            @PathVariable Long poolId) {
        log.info("Getting calculations for pool: {}", poolId);
        List<PoolProfitCalculationResponse> response = profitCalculationService.getCalculationsByPool(poolId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
