package com.cbs.wadiah.controller;

import com.cbs.account.dto.TransactionResponse;
import com.cbs.common.dto.ApiResponse;
import com.cbs.wadiah.dto.*;
import com.cbs.wadiah.entity.WadiahStatementConfig;
import com.cbs.wadiah.service.WadiahAccountService;
import com.cbs.wadiah.service.WadiahStatementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/wadiah")
@RequiredArgsConstructor
public class WadiahAccountController {

    private final WadiahAccountService wadiahAccountService;
    private final WadiahStatementService wadiahStatementService;

    @PostMapping("/accounts")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahAccountResponse>> openAccount(
            @Valid @RequestBody OpenWadiahAccountRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(wadiahAccountService.openWadiahAccount(request)));
    }

    @GetMapping("/accounts/{accountId}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahAccountResponse>> getAccount(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.getWadiahAccount(accountId)));
    }

    @GetMapping("/accounts/number/{accountNumber}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahAccountResponse>> getByNumber(@PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.getWadiahAccountByNumber(accountNumber)));
    }

    @GetMapping("/accounts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahAccountResponse>>> getCustomerAccounts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.getCustomerWadiahAccounts(customerId)));
    }

    @PutMapping("/accounts/{accountId}/config")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateConfig(
            @PathVariable Long accountId,
            @RequestBody UpdateWadiahConfigRequest request
    ) {
        wadiahAccountService.updateWadiahConfig(accountId, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("updated", true)));
    }

    @PostMapping("/accounts/{accountId}/deposit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> deposit(
            @PathVariable Long accountId,
            @Valid @RequestBody WadiahDepositRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.deposit(accountId, request)));
    }

    @PostMapping("/accounts/{accountId}/withdraw")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> withdraw(
            @PathVariable Long accountId,
            @Valid @RequestBody WadiahWithdrawalRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.withdraw(accountId, request)));
    }

    @PostMapping("/accounts/{accountId}/sweep/configure")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> configureSweep(
            @PathVariable Long accountId,
            @RequestParam Long targetInvestmentAccountId,
            @RequestParam BigDecimal threshold
    ) {
        wadiahAccountService.configureSweep(accountId, targetInvestmentAccountId, threshold);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("configured", true)));
    }

    @PostMapping("/accounts/{accountId}/sweep/execute")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> executeSweep(@PathVariable Long accountId) {
        wadiahAccountService.executeSweep(accountId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("executed", true)));
    }

    @GetMapping("/accounts/{accountId}/zakat-balance")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> getZakatableBalance(
            @PathVariable Long accountId,
            @RequestParam(required = false) LocalDate asOfDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.calculateZakatableBalance(accountId, asOfDate)));
    }

    @GetMapping("/portfolio-summary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahPortfolioSummary>> getPortfolioSummary() {
        return ResponseEntity.ok(ApiResponse.ok(wadiahAccountService.getPortfolioSummary()));
    }

    @PostMapping("/accounts/{accountId}/statements/generate")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahStatement>> generateStatement(
            @PathVariable Long accountId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String language
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                wadiahStatementService.generateWadiahStatement(accountId, fromDate, toDate, language)
        ));
    }

    @GetMapping("/accounts/{accountId}/statements")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahStatement>>> listGeneratedStatements(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahStatementService.listGeneratedStatements(accountId)));
    }

    @GetMapping("/statements/{statementRef}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahStatement>> getStatement(@PathVariable String statementRef) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahStatementService.getGeneratedStatement(statementRef)));
    }

    @GetMapping("/accounts/{accountId}/statement-config")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahStatementConfig>> getStatementConfig(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahStatementService.getStatementConfig(accountId)));
    }

    @PutMapping("/accounts/{accountId}/statement-config")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahStatementConfig>> updateStatementConfig(
            @PathVariable Long accountId,
            @RequestBody UpdateWadiahStatementConfigRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                wadiahStatementService.updateStatementConfig(accountId, request)
        ));
    }

    @GetMapping("/accounts/{accountId}/mini-statement")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahStatement.WadiahStatementLine>>> getMiniStatement(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahStatementService.getMiniStatement(accountId, limit)));
    }
}
