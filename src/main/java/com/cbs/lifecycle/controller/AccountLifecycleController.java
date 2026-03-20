package com.cbs.lifecycle.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.lifecycle.dto.LifecycleEventDto;
import com.cbs.lifecycle.service.AccountLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/lifecycle")
@RequiredArgsConstructor
@Tag(name = "Account Lifecycle", description = "Dormancy detection, reactivation, escheatment, lifecycle audit")
public class AccountLifecycleController {

    private final AccountLifecycleService lifecycleService;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping("/dormancy/detect")
    @Operation(summary = "Run dormancy detection on all active accounts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> detectDormancy() {
        int count = lifecycleService.detectDormantAccounts();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accountsMarkedDormant", count)));
    }

    @PostMapping("/accounts/{accountId}/reactivate")
    @Operation(summary = "Reactivate a dormant account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> reactivateAccount(
            @PathVariable Long accountId) {
        lifecycleService.reactivateAccount(accountId, currentActorProvider.getCurrentActor());
        return ResponseEntity.ok(ApiResponse.ok(null, "Account reactivated"));
    }

    @PostMapping("/escheatment/detect")
    @Operation(summary = "Run escheatment detection for dormant accounts (6+ years)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> detectEscheatment() {
        int count = lifecycleService.detectEscheatmentCandidates();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accountsEscheated", count)));
    }

    @GetMapping("/accounts/{accountNumber}/history")
    @Operation(summary = "Get lifecycle event history for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LifecycleEventDto>>> getHistory(
            @PathVariable String accountNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LifecycleEventDto> result = lifecycleService.getAccountLifecycleHistoryByNumber(
                accountNumber, PageRequest.of(page, Math.min(size, 100)));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
