package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.regulatory.service.RegulatoryDataExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/regulatory/data")
@RequiredArgsConstructor
public class RegulatoryDataExtractionController {

    private final RegulatoryDataExtractionService extractionService;

    @GetMapping("/gl-balance")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> glBalance(@RequestParam List<String> glAccountCodes,
                                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
                                                             @RequestParam(defaultValue = "CLOSING") String balanceType) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractGlBalance(glAccountCodes, asOfDate, balanceType)));
    }

    @GetMapping("/financing-total")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> financingTotal(@RequestParam String contractType,
                                                                  @RequestParam(required = false) String status,
                                                                  @RequestParam(defaultValue = "OUTSTANDING") String field,
                                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractFinancingTotal(contractType, status, field, asOfDate)));
    }

    @GetMapping("/financing-by-sector")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> financingBySector(@RequestParam String contractType,
                                                                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractFinancingBySector(contractType, asOfDate)));
    }

    @GetMapping("/financing-by-maturity")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> financingByMaturity(@RequestParam String contractType,
                                                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractFinancingByMaturity(contractType, asOfDate)));
    }

    @GetMapping("/financing-by-stage")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> financingByStage(@RequestParam String contractType,
                                                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractFinancingByStage(contractType, asOfDate)));
    }

    @GetMapping("/pool-balance")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> poolBalance(@RequestParam String poolType,
                                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractPoolBalance(poolType, asOfDate)));
    }

    @GetMapping("/ecl-summary")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> eclSummary(@RequestParam String contractType,
                                                              @RequestParam(required = false) String stage,
                                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        BigDecimal value = stage == null
                ? extractionService.extractTotalEcl(contractType, asOfDate)
                : extractionService.extractEclByStage(contractType, stage, asOfDate);
        return ResponseEntity.ok(ApiResponse.ok(value));
    }

    @GetMapping("/capital-adequacy")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.CapitalAdequacyData>> capitalAdequacy(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractCapitalAdequacyData(asOfDate)));
    }

    @GetMapping("/shariah-compliance")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.ShariahComplianceData>> shariahCompliance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        return ResponseEntity.ok(ApiResponse.ok(extractionService.extractShariahComplianceData(periodFrom, periodTo)));
    }
}
