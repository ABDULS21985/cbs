package com.cbs.profitdistribution.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.dto.PoolAssetAssignmentResponse;
import com.cbs.profitdistribution.dto.PoolExpenseRecordResponse;
import com.cbs.profitdistribution.dto.PoolIncomeRecordResponse;
import com.cbs.profitdistribution.dto.PoolPortfolio;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.dto.SegregationValidationResult;
import com.cbs.profitdistribution.dto.TransferAssetRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/pools")
@RequiredArgsConstructor
@Slf4j
public class PoolAssetController {

    private final PoolAssetManagementService poolAssetManagementService;

    @PostMapping("/{poolId}/assets")
    public ResponseEntity<ApiResponse<PoolAssetAssignmentResponse>> assignAssetToPool(
            @PathVariable Long poolId,
            @Valid @RequestBody AssignAssetToPoolRequest request) {
        log.info("Assigning asset to pool: {}", poolId);
        PoolAssetAssignmentResponse response = poolAssetManagementService.assignAssetToPool(poolId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Asset assigned to pool successfully"));
    }

    @DeleteMapping("/{poolId}/assets/{assignmentId}")
    public ResponseEntity<ApiResponse<Void>> unassignAssetFromPool(
            @PathVariable Long poolId,
            @PathVariable Long assignmentId,
            @RequestParam String reason) {
        log.info("Unassigning asset {} from pool: {}, reason: {}", assignmentId, poolId, reason);
        poolAssetManagementService.unassignAssetFromPool(assignmentId, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Asset unassigned from pool successfully"));
    }

    @PostMapping("/{poolId}/assets/{assignmentId}/transfer")
    public ResponseEntity<ApiResponse<Void>> transferAssetBetweenPools(
            @PathVariable Long poolId,
            @PathVariable Long assignmentId,
            @Valid @RequestBody TransferAssetRequest request) {
        log.info("Transferring asset {} from pool: {} to pool: {}", assignmentId, poolId, request.getNewPoolId());
        poolAssetManagementService.transferAssetBetweenPools(
                assignmentId, request.getNewPoolId(), request.getTransferAmount(), request.getReason());
        return ResponseEntity.ok(ApiResponse.ok(null, "Asset transferred between pools successfully"));
    }

    @GetMapping("/{poolId}/assets")
    public ResponseEntity<ApiResponse<List<PoolAssetAssignmentResponse>>> getPoolAssets(
            @PathVariable Long poolId) {
        log.info("Getting assets for pool: {}", poolId);
        List<PoolAssetAssignmentResponse> response = poolAssetManagementService.getPoolAssets(poolId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{poolId}/portfolio")
    public ResponseEntity<ApiResponse<PoolPortfolio>> getPoolPortfolio(
            @PathVariable Long poolId) {
        log.info("Getting portfolio for pool: {}", poolId);
        PoolPortfolio response = poolAssetManagementService.getPoolPortfolio(poolId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{poolId}/validate-segregation")
    public ResponseEntity<ApiResponse<SegregationValidationResult>> validatePoolSegregation(
            @PathVariable Long poolId) {
        log.info("Validating segregation for pool: {}", poolId);
        SegregationValidationResult response = poolAssetManagementService.validatePoolSegregation(poolId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{poolId}/income")
    public ResponseEntity<ApiResponse<PoolIncomeRecordResponse>> recordIncome(
            @PathVariable Long poolId,
            @Valid @RequestBody RecordPoolIncomeRequest request) {
        log.info("Recording income for pool: {}", poolId);
        PoolIncomeRecordResponse response = poolAssetManagementService.recordIncome(poolId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Income recorded successfully"));
    }

    @GetMapping("/{poolId}/income")
    public ResponseEntity<ApiResponse<List<PoolIncomeRecordResponse>>> getPoolIncome(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Getting income for pool: {} from: {} to: {}", poolId, from, to);
        List<PoolIncomeRecordResponse> response = poolAssetManagementService.getPoolIncome(poolId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{poolId}/expenses")
    public ResponseEntity<ApiResponse<PoolExpenseRecordResponse>> recordExpense(
            @PathVariable Long poolId,
            @Valid @RequestBody RecordPoolExpenseRequest request) {
        log.info("Recording expense for pool: {}", poolId);
        PoolExpenseRecordResponse response = poolAssetManagementService.recordExpense(poolId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Expense recorded successfully"));
    }

    @GetMapping("/{poolId}/expenses")
    public ResponseEntity<ApiResponse<List<PoolExpenseRecordResponse>>> getPoolExpenses(
            @PathVariable Long poolId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Getting expenses for pool: {} from: {} to: {}", poolId, from, to);
        List<PoolExpenseRecordResponse> response = poolAssetManagementService.getPoolExpenses(poolId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
