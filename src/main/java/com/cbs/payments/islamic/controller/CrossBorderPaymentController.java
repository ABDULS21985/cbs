package com.cbs.payments.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payments.entity.BankDirectory;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.CrossBorderPaymentExtension;
import com.cbs.payments.islamic.service.CrossBorderPaymentService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-payments/cross-border")
@RequiredArgsConstructor
public class CrossBorderPaymentController {

    private final CrossBorderPaymentService crossBorderPaymentService;

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.CrossBorderPaymentResult>> process(
            @Valid @RequestBody IslamicPaymentRequests.CrossBorderProcessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(crossBorderPaymentService.processCrossBorderPayment(request.getPaymentId(), request)));
    }

    @GetMapping("/fx-quote")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.FxQuote>> fxQuote(
            @RequestParam String sourceCurrency,
            @RequestParam String destinationCurrency,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getFxQuote(sourceCurrency, destinationCurrency, amount)));
    }

    @GetMapping("/{paymentId}/track")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.SwiftTrackingStatus>> track(@PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.trackPayment(paymentId)));
    }

    @GetMapping("/{paymentId}/details")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CrossBorderPaymentExtension>> details(@PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getDetails(paymentId)));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<CrossBorderPaymentExtension>>> pending() {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getPendingSwiftPayments()));
    }

    @GetMapping("/rejected")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<CrossBorderPaymentExtension>>> rejected(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getRejectedSwiftPayments(from, to)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.CrossBorderPaymentSummary>> summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getCrossBorderSummary(from, to)));
    }

    @GetMapping("/correspondents")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<BankDirectory>>> correspondents(@RequestParam(required = false) String currency) {
        return ResponseEntity.ok(ApiResponse.ok(crossBorderPaymentService.getCorrespondentBanks(currency)));
    }
}
