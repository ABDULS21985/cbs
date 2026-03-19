package com.cbs.taxadvisory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import com.cbs.taxadvisory.service.TaxAdvisoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/tax-advisory") @RequiredArgsConstructor
@Tag(name = "Tax Advisory", description = "Corporate tax advisory engagement lifecycle, opinion delivery, jurisdiction tracking")
public class TaxAdvisoryController {

    private final TaxAdvisoryService service;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TaxAdvisoryEngagement>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllEngagements()));
    }

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TaxAdvisoryEngagement>> create(@RequestBody TaxAdvisoryEngagement engagement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createEngagement(engagement)));
    }

    @PostMapping("/{code}/opinion") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TaxAdvisoryEngagement>> deliverOpinion(
            @PathVariable String code, @RequestBody String opinion) {
        TaxAdvisoryEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.deliverOpinion(engagement.getId(), opinion)));
    }

    @PostMapping("/{code}/close") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TaxAdvisoryEngagement>> close(@PathVariable String code) {
        TaxAdvisoryEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.closeEngagement(engagement.getId())));
    }

    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TaxAdvisoryEngagement>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveEngagements()));
    }

    @GetMapping("/jurisdiction/{country}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TaxAdvisoryEngagement>>> byJurisdiction(@PathVariable String country) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByJurisdiction(country)));
    }

    @GetMapping("/revenue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = LocalDate.now().minusYears(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(service.getFeeRevenue(from, to)));
    }
}
