package com.cbs.account.controller;

import com.cbs.account.dto.AccountComplianceCheckRequest;
import com.cbs.account.dto.AccountComplianceCheckResponse;
import com.cbs.account.service.AccountComplianceService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Account Management", description = "Current/Checking Accounts, Savings, Transactions, Interest")
public class AccountComplianceController {

    private final AccountComplianceService accountComplianceService;

    @PostMapping("/compliance-check")
    @Operation(summary = "Run pre-opening compliance checks for an account request")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AccountComplianceCheckResponse>> runComplianceCheck(
            @Valid @RequestBody AccountComplianceCheckRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(accountComplianceService.check(request)));
    }
}
