package com.cbs.counterparty.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.service.CounterpartyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/counterparties")
@RequiredArgsConstructor
@Tag(name = "Counterparty Admin", description = "Exposure limits, KYC, ISDA/CSA agreements, netting")
public class CounterpartyController {

    private final CounterpartyService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Counterparty>> create(@RequestBody Counterparty cp) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(cp)));
    }

    @PatchMapping("/{code}/exposure")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Counterparty>> updateExposure(
            @PathVariable String code, @RequestParam BigDecimal exposure) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateExposure(code, exposure)));
    }

    @PostMapping("/{code}/verify-kyc")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Counterparty>> verifyKyc(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.verifyKyc(code)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Counterparty>>> byType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/pending-kyc")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Counterparty>>> pendingKyc() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingKyc()));
    }
}
