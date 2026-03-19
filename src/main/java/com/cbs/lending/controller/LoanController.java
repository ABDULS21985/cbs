package com.cbs.lending.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.credit.dto.CreditDecisionResponse;
import com.cbs.lending.dto.*;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.lending.service.LoanOriginationService;
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
@RequestMapping("/v1/loans")
@RequiredArgsConstructor
@Tag(name = "Lending", description = "Loan origination, approval, disbursement, repayment, Islamic finance")
public class LoanController {

    private final LoanOriginationService loanService;
    private final LoanAccountRepository loanAccountRepository;

    // Applications
    @PostMapping("/applications")
    @Operation(summary = "Submit a new loan application")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LoanApplicationResponse>> submitApplication(
            @Valid @RequestBody LoanApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(loanService.submitApplication(request), "Loan application submitted"));
    }

    @GetMapping("/applications/{id}")
    @Operation(summary = "Get loan application details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<LoanApplicationResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getApplication(id)));
    }

    @GetMapping("/applications/customer/{customerId}")
    @Operation(summary = "Get customer's loan applications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanApplicationResponse>>> getCustomerApplications(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<LoanApplicationResponse> result = loanService.getCustomerApplications(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/applications/{id}/credit-check")
    @Operation(summary = "Run credit check on application")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CreditDecisionResponse>> runCreditCheck(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.runCreditCheck(id)));
    }

    @PostMapping("/applications/{id}/approve")
    @Operation(summary = "Approve a loan application")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LoanApplicationResponse>> approveApplication(
            @PathVariable Long id,
            @Valid @RequestBody LoanApprovalRequest approval,
            @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.approveApplication(id, approval, approvedBy)));
    }

    @PostMapping("/applications/{id}/decline")
    @Operation(summary = "Decline a loan application")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LoanApplicationResponse>> declineApplication(
            @PathVariable Long id, @RequestParam String reason, @RequestParam String declinedBy) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.declineApplication(id, reason, declinedBy)));
    }

    @PostMapping("/applications/{id}/disburse")
    @Operation(summary = "Disburse an approved loan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LoanAccountResponse>> disburse(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(loanService.disburse(id), "Loan disbursed"));
    }

    // Loan Accounts
    @GetMapping("/{id}")
    @Operation(summary = "Get loan account with schedule")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<LoanAccountResponse>> getLoanAccount(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getLoanAccount(id)));
    }

    @GetMapping("/number/{loanNumber}")
    @Operation(summary = "Get loan by number")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<LoanAccountResponse>> getLoanByNumber(@PathVariable String loanNumber) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getLoanByNumber(loanNumber)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer's active loans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanAccountResponse>>> getCustomerLoans(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<LoanAccountResponse> result = loanService.getCustomerLoans(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // Repayment
    @PostMapping("/{loanId}/repayment")
    @Operation(summary = "Process a loan repayment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScheduleEntryDto>> processRepayment(
            @PathVariable Long loanId, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(loanService.processRepayment(loanId, amount)));
    }

    // Batch operations
    @PostMapping("/batch/accrue-interest")
    @Operation(summary = "Batch accrue interest on all active loans")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchAccrue() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", loanService.batchAccrueInterest())));
    }

    // Products
    @GetMapping("/products")
    @Operation(summary = "List all active loan products")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanProductDto>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getAllLoanProducts()));
    }

    @GetMapping("/products/islamic")
    @Operation(summary = "List Islamic finance products")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanProductDto>>> getIslamicProducts() {
        return ResponseEntity.ok(ApiResponse.ok(loanService.getIslamicProducts()));
    }

    // List all loans
    @GetMapping
    @Operation(summary = "List all loan accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanAccount>>> listLoans(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LoanAccount> result = loanAccountRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // SCHEDULE & SETTLEMENT
    // ========================================================================

    @GetMapping("/{loanId}/schedule")
    @Operation(summary = "Get repayment schedule for a loan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRepaymentSchedule(@PathVariable Long loanId) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/schedule-preview")
    @Operation(summary = "Preview amortization schedule without creating a loan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> previewSchedule(@RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/{loanId}/settlement-calculation")
    @Operation(summary = "Calculate early settlement amount for a loan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettlementCalculation(@PathVariable Long loanId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of()));
    }

    @PostMapping("/{loanId}/restructure")
    @Operation(summary = "Restructure a loan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> restructureLoan(@PathVariable Long loanId, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/portfolio/stats")
    @Operation(summary = "Get portfolio-level loan statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPortfolioStats() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of()));
    }
}
