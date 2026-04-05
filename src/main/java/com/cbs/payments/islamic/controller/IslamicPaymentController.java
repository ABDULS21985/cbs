package com.cbs.payments.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.PaymentShariahAuditLog;
import com.cbs.payments.islamic.service.IslamicPaymentService;
import com.cbs.payments.islamic.service.PaymentShariahScreeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-payments")
@RequiredArgsConstructor
public class IslamicPaymentController {

    private final IslamicPaymentService islamicPaymentService;
    private final PaymentShariahScreeningService paymentShariahScreeningService;

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.PaymentResponse>> initiate(
            @Valid @RequestBody IslamicPaymentRequests.IslamicPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicPaymentService.initiatePayment(request)));
    }

    @PostMapping("/initiate-with-override")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','BRANCH_MANAGER','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.PaymentResponse>> initiateWithOverride(
            @Valid @RequestBody IslamicPaymentRequests.IslamicPaymentRequest request,
            @RequestParam String reason,
            @RequestParam String approvedBy,
            Authentication authentication) {
        boolean complianceUser = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(granted -> "ROLE_COMPLIANCE".equals(granted.getAuthority()));
        IslamicPaymentRequests.ManualOverrideRequest overrideRequest = IslamicPaymentRequests.ManualOverrideRequest.builder()
                .reason(reason)
                .approvedBy(approvedBy)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicPaymentService.initiatePaymentWithOverride(request, overrideRequest, complianceUser)));
    }

    @PostMapping({"/pre-screen", "/screen"})
    @PreAuthorize("hasAnyRole('CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.PaymentScreeningResult>> preScreen(
            @Valid @RequestBody IslamicPaymentRequests.IslamicPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                islamicPaymentService.previewPayment(request)
        ));
    }

    @GetMapping("/{paymentId}/screening-log")
    @PreAuthorize("hasAnyRole('COMPLIANCE','AUDIT','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PaymentShariahAuditLog>> getScreeningLog(@PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicPaymentService.getScreeningLog(paymentId)));
    }

    @GetMapping("/blocked")
    @PreAuthorize("hasAnyRole('COMPLIANCE','AUDIT','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentShariahAuditLog>>> getBlockedPayments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(islamicPaymentService.getBlockedPayments(from, to)));
    }

    @GetMapping("/overridden")
    @PreAuthorize("hasAnyRole('COMPLIANCE','AUDIT','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentShariahAuditLog>>> getOverriddenPayments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(islamicPaymentService.getOverriddenPayments(from, to)));
    }

    @GetMapping("/compliance-summary")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.PaymentComplianceSummary>> complianceSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(islamicPaymentService.getComplianceSummary(from, to)));
    }

    @PostMapping("/standing-orders/screen-batch")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicPaymentResponses.PaymentScreeningPreview>>> screenStandingOrders(
            @Valid @RequestBody IslamicPaymentRequests.StandingOrderBatchScreenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicPaymentService.screenStandingOrderBatch(request.getExecutionDate())));
    }

    @PostMapping("/screen-beneficiary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.BeneficiaryScreeningResult>> screenBeneficiary(
            @Valid @RequestBody IslamicPaymentRequests.ScreenBeneficiaryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(paymentShariahScreeningService.screenBeneficiary(request)));
    }

    @GetMapping("/screening-report")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.PaymentScreeningReport>> screeningReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(paymentShariahScreeningService.getScreeningReport(from, to)));
    }
}
