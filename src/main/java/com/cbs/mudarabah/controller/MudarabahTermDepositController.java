package com.cbs.mudarabah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.*;
import com.cbs.mudarabah.service.MudarabahTermDepositService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/mudarabah/term-deposits")
@RequiredArgsConstructor
public class MudarabahTermDepositController {

    private final MudarabahTermDepositService mudarabahTermDepositService;

    @PostMapping
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> createTermDeposit(
            @Valid @RequestBody CreateMudarabahTermDepositRequest request) {
        log.info("Creating Mudarabah term deposit");
        MudarabahTermDepositResponse response = mudarabahTermDepositService.createTermDeposit(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Mudarabah term deposit created successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> getTermDeposit(
            @PathVariable Long id) {
        log.info("Fetching Mudarabah term deposit: {}", id);
        MudarabahTermDepositResponse response = mudarabahTermDepositService.getTermDeposit(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/ref/{depositRef}")
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> getByDepositRef(
            @PathVariable String depositRef) {
        log.info("Fetching Mudarabah term deposit by reference: {}", depositRef);
        MudarabahTermDepositResponse response = mudarabahTermDepositService.getByDepositRef(depositRef);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<MudarabahTermDepositResponse>>> getCustomerTermDeposits(
            @PathVariable Long customerId) {
        log.info("Fetching Mudarabah term deposits for customer: {}", customerId);
        List<MudarabahTermDepositResponse> response = mudarabahTermDepositService.getCustomerTermDeposits(customerId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/early-withdraw")
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> processEarlyWithdrawal(
            @PathVariable Long id,
            @Valid @RequestBody EarlyWithdrawalRequest request) {
        log.info("Processing early withdrawal for term deposit: {}", id);
        MudarabahTermDepositResponse response = mudarabahTermDepositService.processEarlyWithdrawal(id, request.getReason());
        return ResponseEntity.ok(ApiResponse.ok(response, "Early withdrawal processed successfully"));
    }

    @PostMapping("/{id}/process-maturity")
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> processMaturity(
            @PathVariable Long id) {
        log.info("Processing maturity for term deposit: {}", id);
        MudarabahTermDepositResponse response = mudarabahTermDepositService.processMaturity(id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Maturity processed successfully"));
    }

    @PostMapping("/{id}/lien")
    public ResponseEntity<ApiResponse<MudarabahTermDepositResponse>> placeLien(
            @PathVariable Long id,
            @Valid @RequestBody PlaceLienRequest request) {
        log.info("Placing lien on term deposit: {}", id);
        MudarabahTermDepositResponse response = mudarabahTermDepositService.placeLien(id, request.getFinancingReference(), request.getLienAmount());
        return ResponseEntity.ok(ApiResponse.ok(response, "Lien placed successfully"));
    }

    @DeleteMapping("/{id}/lien")
    public ResponseEntity<ApiResponse<Void>> releaseLien(
            @PathVariable Long id,
            @RequestParam String reason) {
        log.info("Releasing lien on term deposit: {}, reason: {}", id, reason);
        mudarabahTermDepositService.releaseLien(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Lien released successfully"));
    }

    @GetMapping("/maturing")
    public ResponseEntity<ApiResponse<List<MudarabahTermDepositResponse>>> getMaturingDeposits(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching maturing deposits from {} to {}", from, to);
        List<MudarabahTermDepositResponse> response = mudarabahTermDepositService.getMaturingDeposits(from, to);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/portfolio-summary")
    public ResponseEntity<ApiResponse<MudarabahTDPortfolioSummary>> getTDPortfolioSummary() {
        log.info("Fetching Mudarabah term deposit portfolio summary");
        MudarabahTDPortfolioSummary summary = mudarabahTermDepositService.getTDPortfolioSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }
}
