package com.cbs.mudarabah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mudarabah.dto.*;
import com.cbs.mudarabah.service.PsrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/mudarabah/psr")
@RequiredArgsConstructor
public class PsrController {

    private final PsrService psrService;

    @PostMapping("/resolve")
    public ResponseEntity<ApiResponse<PsrResolution>> resolvePsr(
            @Valid @RequestBody ResolvePsrRequest request) {
        log.info("Resolving PSR for product template: {}", request.getProductTemplateId());
        PsrResolution resolution = psrService.resolvePsr(request.getProductTemplateId(), request.getContext());
        return ResponseEntity.ok(ApiResponse.ok(resolution));
    }

    @GetMapping("/schedules")
    public ResponseEntity<ApiResponse<List<PsrScheduleResponse>>> getSchedules() {
        log.info("Fetching all PSR schedules");
        List<PsrScheduleResponse> schedules = psrService.getSchedules();
        return ResponseEntity.ok(ApiResponse.ok(schedules));
    }

    @GetMapping("/schedules/product/{productId}")
    public ResponseEntity<ApiResponse<List<PsrScheduleResponse>>> getSchedulesByProduct(
            @PathVariable Long productId) {
        log.info("Fetching PSR schedules for product: {}", productId);
        List<PsrScheduleResponse> schedules = psrService.getSchedulesByProduct(productId);
        return ResponseEntity.ok(ApiResponse.ok(schedules));
    }

    @PostMapping("/schedules")
    public ResponseEntity<ApiResponse<PsrScheduleResponse>> createSchedule(
            @Valid @RequestBody CreatePsrScheduleRequest request) {
        log.info("Creating PSR schedule");
        PsrScheduleResponse response = psrService.createSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "PSR schedule created successfully"));
    }

    @PostMapping("/change-requests")
    public ResponseEntity<ApiResponse<PsrChangeRequestResponse>> initiateChangeRequest(
            @Valid @RequestBody InitiatePsrChangeRequest request) {
        log.info("Initiating PSR change request");
        PsrChangeRequestResponse response = psrService.initiateChangeRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "PSR change request initiated successfully"));
    }

    @PostMapping("/change-requests/{id}/consent")
    public ResponseEntity<ApiResponse<Void>> recordCustomerConsent(
            @PathVariable Long id,
            @Valid @RequestBody CustomerConsentDetails consent) {
        log.info("Recording customer consent for change request: {}", id);
        psrService.recordCustomerConsent(id, consent);
        return ResponseEntity.ok(ApiResponse.ok(null, "Customer consent recorded successfully"));
    }

    @PostMapping("/change-requests/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approvePsrChange(
            @PathVariable Long id,
            @RequestParam String approvedBy) {
        log.info("Approving PSR change request: {} by: {}", id, approvedBy);
        psrService.approvePsrChange(id, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "PSR change request approved successfully"));
    }

    @PostMapping("/change-requests/{id}/apply")
    public ResponseEntity<ApiResponse<Void>> applyPsrChange(
            @PathVariable Long id) {
        log.info("Applying PSR change request: {}", id);
        psrService.applyPsrChange(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "PSR change applied successfully"));
    }

    @GetMapping("/change-requests/pending-consent")
    public ResponseEntity<ApiResponse<List<PsrChangeRequestResponse>>> getPendingConsentRequests() {
        log.info("Fetching pending consent requests");
        List<PsrChangeRequestResponse> requests = psrService.getPendingConsentRequests();
        return ResponseEntity.ok(ApiResponse.ok(requests));
    }

    @GetMapping("/account/{accountId}/history")
    public ResponseEntity<ApiResponse<List<PsrChangeRequestResponse>>> getChangeHistory(
            @PathVariable Long accountId) {
        log.info("Fetching PSR change history for account: {}", accountId);
        List<PsrChangeRequestResponse> history = psrService.getChangeHistory(accountId);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/distribution-summary")
    public ResponseEntity<ApiResponse<PsrDistributionSummary>> getPsrDistributionSummary() {
        log.info("Fetching PSR distribution summary");
        PsrDistributionSummary summary = psrService.getPsrDistributionSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }
}
