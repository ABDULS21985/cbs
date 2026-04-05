package com.cbs.payments.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.DomesticPaymentConfig;
import com.cbs.payments.islamic.entity.DomesticPaymentMessage;
import com.cbs.payments.islamic.service.DomesticPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-payments/domestic")
@RequiredArgsConstructor
public class DomesticPaymentController {

    private final DomesticPaymentService domesticPaymentService;

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.DomesticPaymentResult>> process(
            @Valid @RequestBody IslamicPaymentRequests.DomesticPaymentProcessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                domesticPaymentService.processDomesticPayment(
                        request.getPaymentId(), request.getCountryCode(), request.getRailName(), request.getRailType())
        ));
    }

    @GetMapping("/rail-status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<Boolean>> railStatus(@RequestParam String countryCode, @RequestParam String railType) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.isRailAvailable(countryCode, railType)));
    }

    @GetMapping("/messages/{paymentId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DomesticPaymentMessage>> getMessage(@PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.getPaymentMessage(paymentId)));
    }

    @GetMapping("/pending/{countryCode}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<DomesticPaymentMessage>>> pending(@PathVariable String countryCode) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.getPendingMessages(countryCode)));
    }

    @GetMapping("/rejected")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<DomesticPaymentMessage>>> rejected(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.getRejectedMessages(from, to)));
    }

    @GetMapping("/summary/{countryCode}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicPaymentResponses.DomesticPaymentSummary>> summary(
            @PathVariable String countryCode,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.getDailySummary(countryCode, date)));
    }

    @PostMapping("/ach-batch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<String>> achBatch(@Valid @RequestBody IslamicPaymentRequests.AchBatchRequest request) {
        domesticPaymentService.submitAchBatch(request.getCountryCode(), request.getValueDate());
        return ResponseEntity.ok(ApiResponse.ok("ACH batch submitted"));
    }

    @GetMapping("/configs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<List<DomesticPaymentConfig>>> configs() {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.getConfigurations()));
    }

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<DomesticPaymentConfig>> updateConfig(@PathVariable Long id, @RequestBody DomesticPaymentConfig update) {
        return ResponseEntity.ok(ApiResponse.ok(domesticPaymentService.updateConfig(id, update)));
    }
}
