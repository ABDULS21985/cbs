package com.cbs.account.controller;

import com.cbs.account.dto.*;
import com.cbs.account.service.WalletService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Multi-Currency Wallets", description = "Currency wallet operations: create, fund, withdraw, FX convert")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/account/{accountId}")
    @Operation(summary = "Get all wallets for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<WalletResponse>>> getWallets(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getWallets(accountId)));
    }

    @PostMapping("/account/{accountId}")
    @Operation(summary = "Create a new currency wallet for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WalletResponse>> addWallet(
            @PathVariable Long accountId,
            @Valid @RequestBody WalletCreateRequest request) {
        WalletResponse response = walletService.addWallet(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Wallet created successfully"));
    }

    @PostMapping("/account/{accountId}/credit")
    @Operation(summary = "Credit (fund) a wallet")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WalletResponse>> credit(
            @PathVariable Long accountId,
            @Valid @RequestBody WalletCreditRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.credit(accountId, request)));
    }

    @PostMapping("/account/{accountId}/debit")
    @Operation(summary = "Debit (withdraw) from a wallet")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WalletResponse>> debit(
            @PathVariable Long accountId,
            @Valid @RequestBody WalletDebitRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.debit(accountId, request)));
    }

    @PostMapping("/account/{accountId}/convert")
    @Operation(summary = "FX conversion between two wallets on the same account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> convert(
            @PathVariable Long accountId,
            @Valid @RequestBody WalletConvertRequest request) {
        BigDecimal convertedAmount = walletService.convert(accountId, request);
        return ResponseEntity.ok(ApiResponse.ok(convertedAmount, "Conversion completed"));
    }

    @GetMapping("/{walletId}/transactions")
    @Operation(summary = "Get transaction history for a wallet")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<WalletTransactionResponse>>> getTransactions(
            @PathVariable Long walletId) {
        return ResponseEntity.ok(ApiResponse.ok(walletService.getTransactions(walletId)));
    }
}
