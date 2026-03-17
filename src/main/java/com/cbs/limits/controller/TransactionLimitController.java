package com.cbs.limits.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.limits.entity.*;
import com.cbs.limits.service.TransactionLimitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/v1/limits")
@RequiredArgsConstructor
@Tag(name = "Transaction Limits", description = "Hierarchical transaction limit management and usage tracking")
public class TransactionLimitController {

    private final TransactionLimitService limitService;

    @PostMapping
    @Operation(summary = "Create a transaction limit")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TransactionLimit>> createLimit(@RequestBody TransactionLimit limit) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(limitService.createLimit(limit)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update limit amount/count")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TransactionLimit>> updateLimit(
            @PathVariable Long id,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) Integer maxCount) {
        return ResponseEntity.ok(ApiResponse.ok(limitService.updateLimit(id, maxAmount, maxCount)));
    }

    @GetMapping("/account/{accountId}")
    @Operation(summary = "Get limits configured for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<TransactionLimit>>> getAccountLimits(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(limitService.getLimitsForAccount(accountId)));
    }

    @GetMapping("/usage/{accountId}/{limitType}")
    @Operation(summary = "Get today's usage for an account and limit type")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionLimitUsage>> getUsage(
            @PathVariable Long accountId, @PathVariable LimitType limitType) {
        Optional<TransactionLimitUsage> usage = limitService.getTodayUsage(accountId, limitType);
        return ResponseEntity.ok(ApiResponse.ok(usage.orElse(null)));
    }
}
