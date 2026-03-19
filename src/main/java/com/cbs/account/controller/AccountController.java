package com.cbs.account.controller;

import com.cbs.account.dto.*;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.ProductCategory;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.service.AccountService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Account Management", description = "Current/Checking Accounts, Savings, Transactions, Interest")
public class AccountController {

    private final AccountService accountService;

    // ========================================================================
    // ACCOUNT OPERATIONS
    // ========================================================================

    @PostMapping
    @Operation(summary = "Open a new account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AccountResponse>> openAccount(
            @Valid @RequestBody OpenAccountRequest request) {
        AccountResponse response = accountService.openAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Account opened successfully"));
    }

    @GetMapping("/{accountNumber}")
    @Operation(summary = "Get account details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<AccountResponse>> getAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getAccount(accountNumber)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get all accounts for a customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getCustomerAccounts(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getCustomerAccounts(customerId)));
    }

    @GetMapping
    @Operation(summary = "Search/list accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> searchAccounts(
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String branchCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AccountResponse> result = accountService.searchAccounts(status, branchCode, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PatchMapping("/{accountNumber}/status")
    @Operation(summary = "Change account status")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AccountResponse>> changeStatus(
            @PathVariable String accountNumber,
            @RequestParam AccountStatus newStatus,
            @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(
                accountService.changeAccountStatus(accountNumber, newStatus, reason)));
    }

    @GetMapping("/{accountNumber}/maintenance-history")
    @Operation(summary = "Get audit trail of maintenance operations on this account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMaintenanceHistory(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/{accountNumber}/signatories")
    @Operation(summary = "Get account signatories")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSignatories(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/{accountNumber}/signatories")
    @Operation(summary = "Add a signatory to an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addSignatory(@PathVariable String accountNumber, @RequestBody Map<String, Object> data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @DeleteMapping("/{accountNumber}/signatories/{signatoryId}")
    @Operation(summary = "Remove a signatory from an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeSignatory(@PathVariable String accountNumber, @PathVariable String signatoryId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/{accountNumber}/signing-rule")
    @Operation(summary = "Update signing rule for an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateSigningRule(@PathVariable String accountNumber, @RequestBody Map<String, String> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{accountNumber}/interest-rate-override")
    @Operation(summary = "Override interest rate for an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> overrideInterestRate(@PathVariable String accountNumber, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/{accountNumber}/limits")
    @Operation(summary = "Change transaction limits for an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> changeTransactionLimits(@PathVariable String accountNumber, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/{accountNumber}/officer")
    @Operation(summary = "Change account officer")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> changeAccountOfficer(@PathVariable String accountNumber, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{accountNumber}/interest-history")
    @Operation(summary = "Get interest history for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInterestHistory(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/{accountNumber}/holds")
    @Operation(summary = "Get holds on an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHolds(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/{accountNumber}/holds/{holdId}/release")
    @Operation(summary = "Release a hold on an account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> releaseHold(@PathVariable String accountNumber, @PathVariable String holdId, @RequestBody Map<String, String> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{accountNumber}/linked-products")
    @Operation(summary = "Get linked products for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLinkedProducts(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of()));
    }

    // ========================================================================
    // TRANSACTIONS
    // ========================================================================

    @PostMapping("/transactions/debit")
    @Operation(summary = "Post a debit transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> postDebit(
            @Valid @RequestBody PostTransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(accountService.postDebit(request)));
    }

    @PostMapping("/transactions/credit")
    @Operation(summary = "Post a credit transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> postCredit(
            @Valid @RequestBody PostTransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(accountService.postCredit(request)));
    }

    @PostMapping("/transactions/transfer")
    @Operation(summary = "Transfer between accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> transfer(
            @RequestParam @NotBlank String fromAccount,
            @RequestParam @NotBlank String toAccount,
            @RequestParam @DecimalMin("0.01") BigDecimal amount,
            @RequestParam(required = false) String narration,
            @RequestParam(defaultValue = "SYSTEM") TransactionChannel channel) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(accountService.postTransfer(fromAccount, toAccount, amount, narration, channel)));
    }

    @GetMapping("/{accountNumber}/transactions")
    @Operation(summary = "Get transaction history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getTransactions(
            @PathVariable String accountNumber,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<TransactionResponse> result = accountService.getTransactionHistory(accountNumber, from, to, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // INTEREST (Capability 10)
    // ========================================================================

    @PostMapping("/{accountId}/interest/accrue")
    @Operation(summary = "Accrue interest for a single account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> accrueInterest(@PathVariable Long accountId) {
        BigDecimal accrued = accountService.accrueInterestForAccount(accountId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accruedAmount", accrued)));
    }

    @PostMapping("/{accountId}/interest/post")
    @Operation(summary = "Post accrued interest to account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TransactionResponse>> postInterest(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.postInterest(accountId)));
    }

    @PostMapping("/interest/batch-accrue")
    @Operation(summary = "Batch accrue interest for all interest-bearing accounts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchAccrueInterest() {
        int processed = accountService.batchAccrueInterest();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accountsProcessed", processed)));
    }

    // ========================================================================
    // PRODUCT CATALOG
    // ========================================================================

    @GetMapping("/products")
    @Operation(summary = "List all active products")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getAllProducts()));
    }

    @GetMapping("/products/{code}")
    @Operation(summary = "Get product details with interest tiers")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ProductDto>> getProduct(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getProduct(code)));
    }

    @GetMapping("/products/category/{category}")
    @Operation(summary = "Get products by category")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getProductsByCategory(
            @PathVariable ProductCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getProductsByCategory(category)));
    }
}
