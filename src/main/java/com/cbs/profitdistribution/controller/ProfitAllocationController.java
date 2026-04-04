package com.cbs.profitdistribution.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.PoolProfitAllocationResponse;
import com.cbs.profitdistribution.dto.AllocateProfitForRunRequest;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.service.ProfitAllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequestMapping("/api/v1/profit-distribution/allocations")
@RequiredArgsConstructor
@Slf4j
public class ProfitAllocationController {

    private final ProfitAllocationService profitAllocationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<ProfitAllocationBatch>> allocateProfit(
            @Valid @RequestBody AllocateProfitForRunRequest request) {
        ProfitAllocationBatch response = profitAllocationService.allocateProfit(
                request.getPoolId(), request.getProfitCalculationId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Profit allocated successfully"));
    }

    @GetMapping("/{batchId}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProfitAllocationBatch>> getBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.ok(profitAllocationService.getBatch(batchId)));
    }

    @PostMapping("/{batchId}/recalculate")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<ProfitAllocationBatch>> recalculate(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.ok(
                profitAllocationService.recalculateAllocations(batchId),
                "Allocations recalculated successfully"));
    }

    @PostMapping("/{batchId}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable Long batchId,
            @RequestParam String approvedBy) {
        profitAllocationService.approveAllocations(batchId, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Allocations approved successfully"));
    }

    @GetMapping("/pool/{poolId}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ProfitAllocationBatch>>> getByPool(@PathVariable Long poolId) {
        return ResponseEntity.ok(ApiResponse.ok(profitAllocationService.getAllocationsByPool(poolId)));
    }

    @GetMapping("/account/{accountId}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<PoolProfitAllocationResponse>>> getAccountHistory(
            @PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(profitAllocationService.getAccountAllocationHistory(accountId)));
    }
}
