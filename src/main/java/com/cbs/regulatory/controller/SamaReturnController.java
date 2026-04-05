package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.service.SamaReturnService;
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
@RequestMapping("/api/v1/regulatory/sama")
@RequiredArgsConstructor
public class SamaReturnController {

    private final SamaReturnService samaReturnService;

    @PostMapping("/balance-sheet")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> balanceSheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaBalanceSheet(reportingDate)));
    }

    @PostMapping("/financing-portfolio")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> financingPortfolio(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaFinancingPortfolio(reportingDate)));
    }

    @PostMapping("/capital-adequacy")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> capitalAdequacy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaCapitalAdequacy(reportingDate)));
    }

    @PostMapping("/investment-accounts")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> investmentAccounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaInvestmentAccounts(reportingDate)));
    }

    @PostMapping("/profit-distribution")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> profitDistribution(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaProfitDistribution(reportingDate)));
    }

    @PostMapping("/shariah-compliance")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> shariahCompliance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportingDate) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateSamaShariahCompliance(reportingDate)));
    }

    @PostMapping("/generate-all")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> generateAll(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        return ResponseEntity.ok(ApiResponse.ok(samaReturnService.generateAllSamaReturns(periodFrom, periodTo)));
    }
}
