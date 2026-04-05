package com.cbs.payments.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.service.InstantPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1/islamic-payments/instant")
@RequiredArgsConstructor
public class InstantPaymentController {

    private final InstantPaymentService instantPaymentService;

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.InstantPaymentResult>> process(
            @Valid @RequestBody IslamicPaymentRequests.InstantPaymentProcessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(instantPaymentService.processInstantPayment(request.getPaymentId())));
    }

    @PostMapping("/resolve-proxy")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.ProxyResolutionResult>> resolveProxy(
            @Valid @RequestBody IslamicPaymentRequests.ProxyResolutionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                instantPaymentService.resolveProxy(request.getProxyType(), request.getProxyValue())
        ));
    }

    @GetMapping("/{paymentId}/details")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<InstantPaymentExtension>> details(@PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.ok(instantPaymentService.getDetails(paymentId)));
    }

    @GetMapping("/deferred-screening")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<InstantPaymentExtension>>> pendingDeferred() {
        return ResponseEntity.ok(ApiResponse.ok(instantPaymentService.getPendingDeferredScreenings()));
    }

    @PostMapping("/deferred-screening/batch")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<String>> deferredBatch() {
        instantPaymentService.processDeferredScreeningBatch();
        return ResponseEntity.ok(ApiResponse.ok("Deferred screening batch processed"));
    }

    @GetMapping("/performance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.InstantPaymentPerformanceMetrics>> performance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(instantPaymentService.getPerformanceMetrics(date)));
    }
}
