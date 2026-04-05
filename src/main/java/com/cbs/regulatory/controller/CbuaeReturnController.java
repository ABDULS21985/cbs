package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.service.CbuaeReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/regulatory/cbuae")
@RequiredArgsConstructor
public class CbuaeReturnController {

    private final CbuaeReturnService cbuaeReturnService;

    @PostMapping("/balance-sheet")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> balanceSheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateCbuaeBalanceSheet(reportingDate)));
    }

    @PostMapping("/asset-quality")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> assetQuality(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateCbuaeAssetQuality(reportingDate)));
    }

    @PostMapping("/liquidity")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> liquidity(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateCbuaeLiquidity(reportingDate)));
    }

    @PostMapping("/capital-adequacy")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> capitalAdequacy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateCbuaeCapitalAdequacy(reportingDate)));
    }

    @PostMapping("/concentration")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> concentration(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateCbuaeConcentration(reportingDate)));
    }

    @PostMapping("/generate-all")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> generateAll(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        return ResponseEntity.ok(ApiResponse.ok(cbuaeReturnService.generateAllCbuaeReturns(periodFrom, periodTo)));
    }
}
