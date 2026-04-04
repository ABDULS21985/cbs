package com.cbs.qard.controller;

import com.cbs.account.dto.TransactionResponse;
import com.cbs.common.dto.ApiResponse;
import com.cbs.qard.dto.*;
import com.cbs.qard.entity.QardRepaymentSchedule;
import com.cbs.qard.service.QardHasanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/qard")
@RequiredArgsConstructor
public class QardHasanController {

    private final QardHasanService qardHasanService;

    @PostMapping("/deposit-accounts")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QardHasanAccountResponse>> openDepositAccount(
            @Valid @RequestBody OpenQardDepositRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(qardHasanService.openQardDepositAccount(request)));
    }

    @PostMapping("/loans")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<QardHasanAccountResponse>> createLoan(
            @Valid @RequestBody CreateQardLoanRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(qardHasanService.createQardLoan(request)));
    }

    @GetMapping("/accounts/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QardHasanAccountResponse>> getAccount(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getQardAccount(id)));
    }

    @GetMapping("/accounts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<QardHasanAccountResponse>>> getCustomerAccounts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getCustomerQardAccounts(customerId)));
    }

    @PostMapping("/deposit-accounts/{id}/deposit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TransactionResponse>> deposit(
            @PathVariable Long id,
            @Valid @RequestBody QardTransactionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.depositToQardAccount(id, request)));
    }

    @PostMapping("/deposit-accounts/{id}/withdraw")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TransactionResponse>> withdraw(
            @PathVariable Long id,
            @Valid @RequestBody QardTransactionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.withdrawFromQardAccount(id, request)));
    }

    @GetMapping("/loans/{id}/schedule")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<List<QardRepaymentSchedule>>> getSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getRepaymentSchedule(id)));
    }

    @PostMapping("/loans/{id}/repay")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> repay(
            @PathVariable Long id,
            @Valid @RequestBody QardRepaymentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.processRepayment(id, request)));
    }

    @PostMapping("/loans/{id}/default")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markDefaulted(
            @PathVariable Long id,
            @RequestParam String reason
    ) {
        qardHasanService.processDefaultedQard(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("defaulted", true)));
    }

    @PostMapping("/loans/{id}/write-off")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> writeOff(
            @PathVariable Long id,
            @RequestParam String reason,
            Authentication authentication
    ) {
        qardHasanService.writeOffQard(id, authentication.getName(), reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("writtenOff", true)));
    }

    @GetMapping("/portfolio-summary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<QardPortfolioSummary>> portfolioSummary() {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getPortfolioSummary()));
    }

    @GetMapping("/loans/overdue")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<List<QardHasanAccountResponse>>> overdueLoans() {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getOverdueQardLoans()));
    }

    @GetMapping("/loans/maturing")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<List<QardHasanAccountResponse>>> maturingLoans(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(qardHasanService.getQardLoansMaturing(fromDate, toDate)));
    }
}
