package com.cbs.bankdraft.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.bankdraft.entity.BankDraft;
import com.cbs.bankdraft.service.BankDraftService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/bank-drafts") @RequiredArgsConstructor
@Tag(name = "Bank Drafts", description = "Demand drafts, cashier's checks, bankers drafts — issuance, presentment, stop payment, reissue")
public class BankDraftController {
    private final BankDraftService bankDraftService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankDraft>> issue(@RequestBody BankDraft draft) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(bankDraftService.issue(draft)));
    }
    @PostMapping("/{number}/present") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankDraft>> present(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.present(number)));
    }
    @PostMapping("/{number}/pay") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankDraft>> pay(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.pay(number)));
    }
    @PostMapping("/{number}/stop") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankDraft>> stop(@PathVariable String number, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.stopPayment(number, reason)));
    }
    @PostMapping("/{number}/reissue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankDraft>> reissue(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.reissue(number)));
    }
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BankDraft>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.getAll()));
    }
    @PostMapping("/expire-overdue") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> expireOverdue() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", bankDraftService.expireOverdueDrafts())));
    }
    @GetMapping("/expire-overdue") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getExpireOverdueStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", 0)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BankDraft>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(bankDraftService.getByCustomer(customerId)));
    }
}
