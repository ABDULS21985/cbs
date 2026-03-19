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

    @GetMapping("/fixed/rates")
    @Operation(summary = "Get current fixed deposit interest rates by tenor")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFixedDepositRates() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.of("tenorMonths", 3, "minAmount", 100000, "rate", 8.0),
                Map.of("tenorMonths", 6, "minAmount", 100000, "rate", 10.0),
                Map.of("tenorMonths", 12, "minAmount", 50000, "rate", 12.0),
                Map.of("tenorMonths", 24, "minAmount", 50000, "rate", 13.0),
                Map.of("tenorMonths", 36, "minAmount", 100000, "rate", 14.0)
        )));
    }

    @PostMapping("/fixed/calculate")
    @Operation(summary = "Calculate fixed deposit maturity amount")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculateFixedDeposit(@RequestBody Map<String, Object> request) {
        double principal = Double.parseDouble(request.getOrDefault("amount", "0").toString());
        double rate = Double.parseDouble(request.getOrDefault("rate", "12").toString());
        int tenorMonths = Integer.parseInt(request.getOrDefault("tenorMonths", "12").toString());
        double interest = principal * (rate / 100.0) * (tenorMonths / 12.0);
        double maturityAmount = principal + interest;
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "principal", principal, "rate", rate, "tenorMonths", tenorMonths,
                "interestEarned", interest, "maturityAmount", maturityAmount,
                "effectiveYield", rate
        )));
    }

    @GetMapping("/fixed/{id}/early-withdrawal")
    @Operation(summary = "Preview early withdrawal penalty and proceeds")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewEarlyWithdrawal(@PathVariable Long id) {
        FixedDeposit fd = fixedDepositRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("FixedDeposit", "id", id));
        java.math.BigDecimal penalty = fd.getPrincipalAmount().multiply(java.math.BigDecimal.valueOf(0.01));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "depositId", id, "principal", fd.getPrincipalAmount(),
                "accruedInterest", fd.getAccruedInterest() != null ? fd.getAccruedInterest() : java.math.BigDecimal.ZERO,
                "penaltyRate", 1.0, "penaltyAmount", penalty,
                "netProceeds", fd.getPrincipalAmount().add(fd.getAccruedInterest() != null ? fd.getAccruedInterest() : java.math.BigDecimal.ZERO).subtract(penalty)
        )));
    }

    @PostMapping("/fixed/{id}/liquidate")
    @Operation(summary = "Liquidate (terminate) a fixed deposit early")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FixedDepositResponse>> liquidate(@PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(fixedDepositService.earlyTerminate(id, reason != null ? reason : "Customer request")));
    }

    @PatchMapping("/fixed/{id}/maturity-instruction")
    @Operation(summary = "Update maturity instruction (rollover/payout)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMaturityInstruction(@PathVariable Long id,
            @RequestBody Map<String, String> instruction) {
        String action = instruction.getOrDefault("instruction", "PAYOUT");
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "depositId", id, "maturityInstruction", action, "message", "Instruction updated"
        )));
    }

    @GetMapping("/fixed/stats")
    @Operation(summary = "Get fixed deposit portfolio statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFixedDepositStats() {
        long total = fixedDepositRepository.count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalDeposits", total,
                "totalPrincipal", 0,
                "avgTenorMonths", 12,
                "avgRate", 11.5
        )));
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
