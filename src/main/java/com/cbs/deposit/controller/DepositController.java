package com.cbs.deposit.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.deposit.dto.*;
import com.cbs.deposit.entity.FixedDeposit;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.deposit.service.FixedDepositService;
import com.cbs.deposit.service.RecurringDepositService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/deposits")
@RequiredArgsConstructor
@Tag(name = "Deposits", description = "Fixed Deposits, Recurring Deposits")
public class DepositController {

    private final FixedDepositService fixedDepositService;
    private final RecurringDepositService recurringDepositService;
    private final FixedDepositRepository fixedDepositRepository;

    // ========================================================================
    // FIXED DEPOSITS
    // ========================================================================

    @PostMapping("/fixed")
    @Operation(summary = "Book a new fixed deposit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> bookFixedDeposit(
            @Valid @RequestBody CreateFixedDepositRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(fixedDepositService.bookDeposit(request), "Fixed deposit booked"));
    }

    @GetMapping("/fixed/{id}")
    @Operation(summary = "Get fixed deposit details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> getFixedDeposit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fixedDepositService.getDeposit(id)));
    }

    @GetMapping("/fixed/number/{depositNumber}")
    @Operation(summary = "Get fixed deposit by number")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> getFixedDepositByNumber(@PathVariable String depositNumber) {
        return ResponseEntity.ok(ApiResponse.ok(fixedDepositService.getDepositByNumber(depositNumber)));
    }

    @GetMapping("/fixed/customer/{customerId}")
    @Operation(summary = "Get customer's fixed deposits")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FixedDepositResponse>>> getCustomerFixedDeposits(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<FixedDepositResponse> result = fixedDepositService.getCustomerDeposits(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/fixed/{id}/terminate")
    @Operation(summary = "Early terminate a fixed deposit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> earlyTerminate(
            @PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(fixedDepositService.earlyTerminate(id, reason)));
    }

    @PostMapping("/fixed/{id}/partial-liquidate")
    @Operation(summary = "Partially liquidate a fixed deposit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> partialLiquidate(
            @PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(fixedDepositService.partialLiquidate(id, amount)));
    }

    @PostMapping("/fixed/batch/accrue")
    @Operation(summary = "Batch accrue interest on all active fixed deposits")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchAccrueFD() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", fixedDepositService.batchAccrueInterest())));
    }

    @PostMapping("/fixed/batch/maturity")
    @Operation(summary = "Process matured fixed deposits")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processMaturity() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", fixedDepositService.processMaturedDeposits())));
    }

    // ========================================================================
    // RECURRING DEPOSITS
    // ========================================================================

    @PostMapping("/recurring")
    @Operation(summary = "Book a new recurring deposit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<RecurringDepositResponse>> bookRecurringDeposit(
            @Valid @RequestBody CreateRecurringDepositRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(recurringDepositService.bookDeposit(request), "Recurring deposit booked"));
    }

    @GetMapping("/recurring/{id}")
    @Operation(summary = "Get recurring deposit with installments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<RecurringDepositResponse>> getRecurringDeposit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(recurringDepositService.getDeposit(id)));
    }

    @GetMapping("/recurring/customer/{customerId}")
    @Operation(summary = "Get customer's recurring deposits")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<RecurringDepositResponse>>> getCustomerRecurringDeposits(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<RecurringDepositResponse> result = recurringDepositService.getCustomerDeposits(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/recurring/{id}/installments/{number}/pay")
    @Operation(summary = "Pay a recurring deposit installment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InstallmentDto>> payInstallment(
            @PathVariable Long id, @PathVariable Integer number) {
        return ResponseEntity.ok(ApiResponse.ok(recurringDepositService.payInstallment(id, number)));
    }

    @PostMapping("/recurring/batch/auto-debit")
    @Operation(summary = "Process auto-debits for due recurring deposits")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processAutoDebits() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", recurringDepositService.processAutoDebits())));
    }

    // List all fixed deposits
    @GetMapping("/fixed")
    @Operation(summary = "List all fixed deposits")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FixedDeposit>>> listFixedDeposits(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FixedDeposit> result = fixedDepositRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
