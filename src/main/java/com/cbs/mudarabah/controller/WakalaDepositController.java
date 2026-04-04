package com.cbs.mudarabah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.*;
import com.cbs.mudarabah.service.WakalaDepositService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/wakala")
@RequiredArgsConstructor
public class WakalaDepositController {

    private final WakalaDepositService wakalaDepositService;

    @PostMapping("/accounts")
    public ResponseEntity<ApiResponse<WakalaDepositResponse>> openWakalaAccount(
            @Valid @RequestBody OpenWakalaAccountRequest request) {
        log.info("Opening Wakala deposit account");
        WakalaDepositResponse response = wakalaDepositService.openWakalaAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Wakala account opened successfully"));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<ApiResponse<WakalaDepositResponse>> getAccount(
            @PathVariable Long accountId) {
        log.info("Fetching Wakala account: {}", accountId);
        WakalaDepositResponse response = wakalaDepositService.getAccount(accountId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/accounts/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<WakalaDepositResponse>>> getCustomerWakalaAccounts(
            @PathVariable Long customerId) {
        log.info("Fetching Wakala accounts for customer: {}", customerId);
        List<WakalaDepositResponse> response = wakalaDepositService.getCustomerWakalaAccounts(customerId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/accounts/{accountId}/distribute")
    public ResponseEntity<ApiResponse<WakalaFeeDistributionResponse>> calculateFeeAndDistribute(
            @PathVariable Long accountId,
            @Valid @RequestBody WakalaFeeDistributionRequest request) {
        log.info("Calculating fee and distributing for Wakala account: {}", accountId);
        WakalaFeeDistributionResponse response = wakalaDepositService.calculateFeeAndDistribute(
                accountId, request.getGrossProfit(), request.getPeriodFrom(), request.getPeriodTo());
        return ResponseEntity.ok(ApiResponse.ok(response, "Fee calculated and distributed successfully"));
    }
}
