package com.cbs.fees.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.fees.engine.FeeEngine;
import com.cbs.fees.entity.*;
import com.cbs.fees.service.FeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/fees")
@RequiredArgsConstructor
@Tag(name = "Fee & Commission Engine", description = "Fee definitions, calculation, charging, waiver")
public class FeeController {

    private final FeeService feeService;

    @PostMapping("/definitions")
    @Operation(summary = "Create a fee definition")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FeeDefinition>> createDefinition(@RequestBody FeeDefinition fee) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(feeService.createFeeDefinition(fee)));
    }

    @GetMapping("/definitions")
    @Operation(summary = "List all active fee definitions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FeeDefinition>>> getAllFees() {
        return ResponseEntity.ok(ApiResponse.ok(feeService.getAllActiveFees()));
    }

    @GetMapping("/preview/{feeCode}")
    @Operation(summary = "Preview fee calculation without charging")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<FeeEngine.FeeResult>> previewFee(
            @PathVariable String feeCode, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.previewFee(feeCode, amount)));
    }

    @PostMapping("/charge")
    @Operation(summary = "Charge a specific fee")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FeeEngine.FeeResult>> chargeFee(
            @RequestParam String feeCode, @RequestParam Long accountId,
            @RequestParam BigDecimal amount, @RequestParam(required = false) String triggerRef) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.chargeFee(feeCode, accountId, amount, triggerRef)));
    }

    @PostMapping("/charge/event")
    @Operation(summary = "Charge all fees triggered by a business event")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FeeEngine.FeeResult>>> chargeEventFees(
            @RequestParam String triggerEvent, @RequestParam Long accountId,
            @RequestParam BigDecimal amount, @RequestParam(required = false) String triggerRef) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.chargeEventFees(triggerEvent, accountId, amount, triggerRef)));
    }

    @PostMapping("/waive/{chargeLogId}")
    @Operation(summary = "Waive a previously charged fee")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FeeChargeLog>> waiveFee(
            @PathVariable Long chargeLogId, @RequestParam String waivedBy, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.waiveFee(chargeLogId, waivedBy, reason)));
    }

    @GetMapping("/history/account/{accountId}")
    @Operation(summary = "Get fee charge history for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FeeChargeLog>>> getAccountFeeHistory(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<FeeChargeLog> result = feeService.getAccountFeeHistory(accountId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
