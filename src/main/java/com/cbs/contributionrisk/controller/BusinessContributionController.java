package com.cbs.contributionrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.contributionrisk.entity.BusinessContribution;
import com.cbs.contributionrisk.service.BusinessContributionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/business-contribution") @RequiredArgsConstructor
@Tag(name = "Business Contribution", description = "Business unit contribution analysis — revenue, cost, profitability, RAROC")
public class BusinessContributionController {

    private final BusinessContributionService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BusinessContribution>> calculate(@RequestBody BusinessContribution contribution) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculate(contribution)));
    }

    @GetMapping("/business-unit/{bu}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BusinessContribution>>> byBusinessUnit(@PathVariable String bu) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByBusinessUnit(bu)));
    }

    @GetMapping("/product/{family}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BusinessContribution>>> byProduct(@PathVariable String family) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByProduct(family)));
    }

    @GetMapping("/region/{region}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BusinessContribution>>> byRegion(@PathVariable String region) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByRegion(region)));
    }

    @GetMapping("/top") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BusinessContribution>>> topContributors(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate,
            @RequestParam(required = false, defaultValue = "MONTHLY") String periodType,
            @RequestParam(defaultValue = "10") int limit) {
        if (periodDate == null) periodDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(service.getTopContributors(periodDate, periodType, limit)));
    }

    @GetMapping("/underperformers") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BusinessContribution>>> underperformers(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate,
            @RequestParam(required = false, defaultValue = "MONTHLY") String periodType,
            @RequestParam(required = false) BigDecimal minRaroc) {
        if (periodDate == null) periodDate = LocalDate.now();
        if (minRaroc == null) minRaroc = BigDecimal.ZERO;
        return ResponseEntity.ok(ApiResponse.ok(service.getUnderperformers(periodDate, periodType, minRaroc)));
    }
}
