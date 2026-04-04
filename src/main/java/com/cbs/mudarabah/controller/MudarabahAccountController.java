package com.cbs.mudarabah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.*;
import com.cbs.mudarabah.service.MudarabahAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/mudarabah")
@RequiredArgsConstructor
public class MudarabahAccountController {

    private final MudarabahAccountService mudarabahAccountService;

    @PostMapping("/savings")
    public ResponseEntity<ApiResponse<MudarabahAccountResponse>> openMudarabahSavingsAccount(
            @Valid @RequestBody OpenMudarabahSavingsRequest request) {
        log.info("Opening Mudarabah savings account for request: {}", request);
        MudarabahAccountResponse response = mudarabahAccountService.openMudarabahSavingsAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Mudarabah savings account opened successfully"));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<ApiResponse<MudarabahAccountResponse>> getMudarabahAccount(
            @PathVariable Long accountId) {
        log.info("Fetching Mudarabah account: {}", accountId);
        MudarabahAccountResponse response = mudarabahAccountService.getMudarabahAccount(accountId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/accounts/ref/{contractRef}")
    public ResponseEntity<ApiResponse<MudarabahAccountResponse>> getByContractReference(
            @PathVariable String contractRef) {
        log.info("Fetching Mudarabah account by contract reference: {}", contractRef);
        MudarabahAccountResponse response = mudarabahAccountService.getByContractReference(contractRef);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/accounts/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<MudarabahAccountResponse>>> getCustomerMudarabahAccounts(
            @PathVariable Long customerId) {
        log.info("Fetching Mudarabah accounts for customer: {}", customerId);
        List<MudarabahAccountResponse> response = mudarabahAccountService.getCustomerMudarabahAccounts(customerId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/accounts/{accountId}/deposit")
    public ResponseEntity<ApiResponse<MudarabahAccountResponse>> deposit(
            @PathVariable Long accountId,
            @Valid @RequestBody MudarabahDepositRequest request) {
        log.info("Processing deposit for Mudarabah account: {}", accountId);
        MudarabahAccountResponse response = mudarabahAccountService.deposit(accountId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Deposit processed successfully"));
    }

    @PostMapping("/accounts/{accountId}/withdraw")
    public ResponseEntity<ApiResponse<MudarabahAccountResponse>> withdraw(
            @PathVariable Long accountId,
            @Valid @RequestBody MudarabahWithdrawalRequest request) {
        log.info("Processing withdrawal for Mudarabah account: {}", accountId);
        MudarabahAccountResponse response = mudarabahAccountService.withdraw(accountId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Withdrawal processed successfully"));
    }

    @GetMapping("/accounts/{accountId}/weight")
    public ResponseEntity<ApiResponse<BigDecimal>> calculateCurrentWeight(
            @PathVariable Long accountId) {
        log.info("Calculating current weight for Mudarabah account: {}", accountId);
        BigDecimal weight = mudarabahAccountService.calculateCurrentWeight(accountId);
        return ResponseEntity.ok(ApiResponse.ok(weight));
    }

    @GetMapping("/portfolio-summary")
    public ResponseEntity<ApiResponse<MudarabahPortfolioSummary>> getPortfolioSummary() {
        log.info("Fetching Mudarabah portfolio summary");
        MudarabahPortfolioSummary summary = mudarabahAccountService.getPortfolioSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }
}
