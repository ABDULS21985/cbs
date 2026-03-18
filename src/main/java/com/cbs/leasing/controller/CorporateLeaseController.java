package com.cbs.leasing.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.leasing.entity.CorporateLeasePortfolio;
import com.cbs.leasing.service.CorporateLeaseService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/v1/corporate-leases") @RequiredArgsConstructor
@Tag(name = "Corporate Lease", description = "Corporate lease portfolio management, IFRS 16 disclosure, maturity profiling")
public class CorporateLeaseController {

    private final CorporateLeaseService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateLeasePortfolio>> create(@RequestBody CorporateLeasePortfolio portfolio) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPortfolio(portfolio)));
    }

    @PutMapping("/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateLeasePortfolio>> update(
            @PathVariable Long id, @RequestBody CorporateLeasePortfolio updates) {
        return ResponseEntity.ok(ApiResponse.ok(service.updatePortfolio(id, updates)));
    }

    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CorporateLeasePortfolio>> summary(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPortfolioSummary(customerId)));
    }

    @GetMapping("/customer/{customerId}/maturity") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CorporateLeasePortfolio>>> maturity(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMaturityProfile(customerId)));
    }

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CorporateLeasePortfolio>>> all() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPortfolios()));
    }
}
