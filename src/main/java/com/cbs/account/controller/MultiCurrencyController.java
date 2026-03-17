package com.cbs.account.controller;

import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.service.MultiCurrencyService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Multi-Currency Wallets", description = "Currency wallet management and FX conversion")
public class MultiCurrencyController {

    private final MultiCurrencyService multiCurrencyService;

    @PostMapping("/account/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CurrencyWallet>> addWallet(@PathVariable Long accountId, @RequestParam String currencyCode) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(multiCurrencyService.addWallet(accountId, currencyCode)));
    }

    @GetMapping("/account/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<CurrencyWallet>>> getWallets(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(multiCurrencyService.getWallets(accountId)));
    }

    @PostMapping("/account/{accountId}/credit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CurrencyWallet>> credit(@PathVariable Long accountId,
            @RequestParam String currencyCode, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(multiCurrencyService.creditWallet(accountId, currencyCode, amount)));
    }

    @PostMapping("/account/{accountId}/debit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CurrencyWallet>> debit(@PathVariable Long accountId,
            @RequestParam String currencyCode, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(multiCurrencyService.debitWallet(accountId, currencyCode, amount)));
    }

    @PostMapping("/account/{accountId}/convert")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BigDecimal>> convert(@PathVariable Long accountId,
            @RequestParam String fromCurrency, @RequestParam String toCurrency, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(multiCurrencyService.convertBetweenWallets(accountId, fromCurrency, toCurrency, amount)));
    }
}
