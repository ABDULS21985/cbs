package com.cbs.wadiah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.wadiah.dto.*;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.service.WadiahOnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/wadiah/onboarding")
@RequiredArgsConstructor
public class WadiahOnboardingController {

    private final WadiahOnboardingService wadiahOnboardingService;

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> initiate(
            @Valid @RequestBody InitiateWadiahApplicationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(wadiahOnboardingService.initiateApplication(request)));
    }

    @PostMapping("/{id}/kyc-verify")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> advanceKyc(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.advanceToKycVerification(id)));
    }

    @PostMapping("/{id}/select-product")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> selectProduct(
            @PathVariable Long id,
            @RequestParam String productCode,
            @RequestParam(required = false) String currencyCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.selectProduct(id, productCode, currencyCode)));
    }

    @GetMapping("/{id}/shariah-disclosure")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> presentDisclosure(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.presentShariahDisclosure(id)));
    }

    @PostMapping("/{id}/accept-disclosure")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> acceptDisclosure(
            @PathVariable Long id,
            @Valid @RequestBody AcceptShariahDisclosureRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.acceptShariahDisclosure(id, request)));
    }

    @PostMapping("/{id}/configure")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> configure(
            @PathVariable Long id,
            @RequestBody WadiahAccountConfigRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.configureAccount(id, request)));
    }

    @PostMapping("/{id}/compliance-check")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> runCompliance(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.runComplianceChecks(id)));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> submit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.submitForApproval(id)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> approve(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                wadiahOnboardingService.approveApplication(id, authentication.getName())
        ));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> reject(
            @PathVariable Long id,
            @RequestParam String reason,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                wadiahOnboardingService.rejectApplication(id, reason, authentication.getName())
        ));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> cancel(
            @PathVariable Long id,
            @RequestParam String reason
    ) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.cancelApplication(id, reason)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WadiahOnboardingResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(wadiahOnboardingService.getApplication(id)));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahOnboardingResponse>>> pending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<WadiahOnboardingResponse> result = wadiahOnboardingService.getPendingApplications(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/officer/{officerId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahOnboardingResponse>>> byOfficer(
            @PathVariable String officerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<WadiahOnboardingResponse> result = wadiahOnboardingService.getApplicationsByOfficer(
                officerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<WadiahOnboardingResponse>>> byStatus(
            @PathVariable WadiahDomainEnums.ApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<WadiahOnboardingResponse> result = wadiahOnboardingService.getApplicationsByStatus(
                status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/expire-stale")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> expireStale() {
        wadiahOnboardingService.expireStaleApplications();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", true)));
    }
}
