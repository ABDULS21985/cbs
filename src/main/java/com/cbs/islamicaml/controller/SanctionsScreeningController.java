package com.cbs.islamicaml.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.SanctionsListConfiguration;
import com.cbs.islamicaml.service.IslamicSanctionsScreeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-aml/sanctions")
@RequiredArgsConstructor
@Slf4j
public class SanctionsScreeningController {

    private final IslamicSanctionsScreeningService screeningService;

    // ===================== SCREENING ENDPOINTS =====================

    @PostMapping("/screen-customer/{customerId}")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> screenCustomer(
            @PathVariable Long customerId) {
        log.info("Screening customer {}", customerId);
        SanctionsScreeningResultResponse result = screeningService.screenCustomer(customerId);
        return ResponseEntity.ok(ApiResponse.ok(result, "Customer screening completed"));
    }

    @PostMapping("/screen-counterparty")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> screenCounterparty(
            @Valid @RequestBody TransactionCounterpartyRequest request) {
        log.info("Screening counterparty: {}", request.getEntityName());
        SanctionsScreeningResultResponse result = screeningService.screenTransactionCounterparty(request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Counterparty screening completed"));
    }

    @PostMapping("/screen-broker")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> screenBroker(
            @RequestParam String brokerName,
            @RequestParam(required = false) String brokerCountry,
            @RequestParam(required = false) String brokerId) {
        log.info("Screening commodity broker: {}", brokerName);
        SanctionsScreeningResultResponse result = screeningService.screenCommodityBroker(
                brokerName, brokerCountry, brokerId);
        return ResponseEntity.ok(ApiResponse.ok(result, "Broker screening completed"));
    }

    @PostMapping("/screen-takaful")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> screenTakaful(
            @RequestParam String providerName,
            @RequestParam(required = false) String country) {
        log.info("Screening Takaful provider: {}", providerName);
        SanctionsScreeningResultResponse result = screeningService.screenTakafulProvider(providerName, country);
        return ResponseEntity.ok(ApiResponse.ok(result, "Takaful provider screening completed"));
    }

    @PostMapping("/screen-sukuk-issuer")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> screenSukukIssuer(
            @RequestParam String issuerName,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String isin) {
        log.info("Screening Sukuk issuer: {}", issuerName);
        SanctionsScreeningResultResponse result = screeningService.screenSukukIssuer(issuerName, country, isin);
        return ResponseEntity.ok(ApiResponse.ok(result, "Sukuk issuer screening completed"));
    }

    // ===================== BATCH RE-SCREENING =====================

    @PostMapping("/batch-rescreen")
    public ResponseEntity<ApiResponse<BatchScreeningResult>> batchRescreen() {
        log.info("Initiating batch re-screening of all customers");
        BatchScreeningResult result = screeningService.reScreenAllCustomers();
        return ResponseEntity.ok(ApiResponse.ok(result, "Batch re-screening completed"));
    }

    @PostMapping("/batch-rescreen/islamic-counterparties")
    public ResponseEntity<ApiResponse<BatchScreeningResult>> batchRescreenIslamicCounterparties() {
        log.info("Initiating batch re-screening of Islamic counterparties");
        BatchScreeningResult result = screeningService.reScreenIslamicCounterparties();
        return ResponseEntity.ok(ApiResponse.ok(result, "Islamic counterparty re-screening completed"));
    }

    // ===================== RESULT QUERIES =====================

    @GetMapping("/results/{id}")
    public ResponseEntity<ApiResponse<SanctionsScreeningResultResponse>> getResult(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.getResult(id)));
    }

    @GetMapping("/results/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<SanctionsScreeningResultResponse>>> getResultsByCustomer(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.getResultsByCustomer(customerId)));
    }

    @GetMapping("/pending-review")
    public ResponseEntity<ApiResponse<List<SanctionsScreeningResultResponse>>> getPendingReview() {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.getPendingReview()));
    }

    // ===================== DISPOSITION =====================

    @PostMapping("/results/{id}/review")
    public ResponseEntity<ApiResponse<Void>> reviewDisposition(
            @PathVariable Long id, @Valid @RequestBody ReviewDispositionRequest request) {
        screeningService.reviewDisposition(id, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Disposition recorded"));
    }

    // ===================== LIST MANAGEMENT =====================

    @GetMapping("/lists")
    public ResponseEntity<ApiResponse<List<SanctionsListConfiguration>>> getActiveLists() {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.getActiveLists()));
    }

    @PostMapping("/lists/{code}/update")
    public ResponseEntity<ApiResponse<SanctionsListConfiguration>> updateList(
            @PathVariable String code,
            @RequestBody ListUpdateRequest request) {
        SanctionsListConfiguration updated = screeningService.updateSanctionsList(code, request);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Sanctions list updated"));
    }

    // ===================== SUMMARY =====================

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SanctionsScreeningSummary>> getScreeningSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.getScreeningSummary(from, to)));
    }
}
