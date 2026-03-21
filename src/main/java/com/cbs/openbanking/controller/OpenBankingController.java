package com.cbs.openbanking.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.openbanking.entity.*;
import com.cbs.openbanking.service.OpenBankingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/openbanking") @RequiredArgsConstructor
@Tag(name = "Open Banking / API Gateway", description = "API client registration, consent management, rate limiting, TPP access")
public class OpenBankingController {

    private final OpenBankingService openBankingService;

    @PostMapping("/clients")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OpenBankingService.ApiClientRegistration>> registerClient(
            @RequestBody ApiClient client, @RequestParam String apiKey) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(openBankingService.registerClient(client, apiKey)));
    }

    @GetMapping("/clients")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ApiClient>>> getAllClients() {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.getAllClients()));
    }

    @GetMapping("/consents")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ApiConsent>>> listConsents() {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.getAllConsents()));
    }

    @PostMapping("/consents")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ApiConsent>> createConsent(
            @RequestParam String clientId, @RequestParam Long customerId, @RequestParam String consentType,
            @RequestParam List<String> permissions, @RequestParam(required = false) List<Long> accountIds,
            @RequestParam(defaultValue = "1440") int validityMinutes) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                openBankingService.createConsent(clientId, customerId, consentType, permissions, accountIds, validityMinutes)));
    }

    @PostMapping("/consents/{consentId}/authorise")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ApiConsent>> authorise(@PathVariable String consentId, @RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.authoriseConsent(consentId, customerId)));
    }

    @PostMapping("/consents/{consentId}/revoke")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ApiConsent>> revoke(@PathVariable String consentId) {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.revokeConsent(consentId)));
    }

    @GetMapping("/consents/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ApiConsent>>> getCustomerConsents(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.getCustomerConsents(customerId)));
    }

    @PostMapping("/clients/{clientId}/deactivate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ApiClient>> deactivateClient(@PathVariable String clientId) {
        return ResponseEntity.ok(ApiResponse.ok(openBankingService.deactivateClient(clientId)));
    }
}
