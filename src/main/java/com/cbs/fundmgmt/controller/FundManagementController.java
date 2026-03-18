package com.cbs.fundmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.fundmgmt.entity.ManagedFund;
import com.cbs.fundmgmt.service.FundManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/funds")
@RequiredArgsConstructor
@Tag(name = "Fund Management", description = "NAV updates, AUM tracking, Sharia compliance, risk metrics")
public class FundManagementController {

    private final FundManagementService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ManagedFund>> create(@RequestBody ManagedFund fund) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(fund)));
    }

    @PostMapping("/{code}/nav")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ManagedFund>> updateNav(
            @PathVariable String code, @RequestParam BigDecimal navPerUnit) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateNav(code, navPerUnit)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ManagedFund>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/sharia-compliant")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ManagedFund>>> getShariaCompliant() {
        return ResponseEntity.ok(ApiResponse.ok(service.getShariaCompliant()));
    }

    @GetMapping("/by-aum")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ManagedFund>>> getByAum() {
        return ResponseEntity.ok(ApiResponse.ok(service.getByAum()));
    }
}
