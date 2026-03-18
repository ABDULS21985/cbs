package com.cbs.corpfinance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.corpfinance.entity.CorporateFinanceEngagement;
import com.cbs.corpfinance.service.CorporateFinanceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/corporate-finance") @RequiredArgsConstructor
@Tag(name = "Corporate Finance", description = "Corporate finance advisory — restructuring, valuation, feasibility, fee tracking")
public class CorporateFinanceController {

    private final CorporateFinanceService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> create(@RequestBody CorporateFinanceEngagement engagement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createEngagement(engagement)));
    }

    @PostMapping("/{code}/draft") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> deliverDraft(@PathVariable String code) {
        CorporateFinanceEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.deliverDraft(engagement.getId())));
    }

    @PostMapping("/{code}/finalize") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> finalizeDelivery(@PathVariable String code) {
        CorporateFinanceEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.finalizeDelivery(engagement.getId())));
    }

    @PostMapping("/{code}/invoice") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> recordInvoice(
            @PathVariable String code, @RequestParam BigDecimal amount) {
        CorporateFinanceEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.recordFeeInvoice(engagement.getId(), amount)));
    }

    @PostMapping("/{code}/payment") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> recordPayment(
            @PathVariable String code, @RequestParam BigDecimal amount) {
        CorporateFinanceEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.recordFeePayment(engagement.getId(), amount)));
    }

    @PostMapping("/{code}/close") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateFinanceEngagement>> close(@PathVariable String code) {
        CorporateFinanceEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.closeEngagement(engagement.getId())));
    }

    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CorporateFinanceEngagement>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveMandates()));
    }

    @GetMapping("/pipeline") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> pipeline() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPipelineByType()));
    }

    @GetMapping("/revenue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(service.getFeeRevenue(from, to)));
    }

    @GetMapping("/capacity") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> capacity() {
        return ResponseEntity.ok(ApiResponse.ok(service.getTeamCapacity()));
    }
}
