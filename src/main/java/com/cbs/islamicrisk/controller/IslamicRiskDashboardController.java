package com.cbs.islamicrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.service.IslamicCreditRiskDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/islamic-risk/dashboard")
@RequiredArgsConstructor
public class IslamicRiskDashboardController {

    private final IslamicCreditRiskDashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.IslamicCreditRiskDashboard>> dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getDashboard(asOfDate)));
    }

    @GetMapping("/portfolio")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.PortfolioOverview>> portfolio(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getPortfolioOverview(asOfDate)));
    }

    @GetMapping("/ecl-summary")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Map<String, IslamicRiskResponses.EclByType>>> eclSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getEclSummary(asOfDate)));
    }

    @GetMapping("/stage-distribution")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> stageDistribution(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStageDistribution(asOfDate)));
    }

    @GetMapping("/aaoifi-classification")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.AaoifiDistribution>> aaoifi(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getAaoifiClassification(asOfDate)));
    }

    @GetMapping("/collateral")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.CollateralSummaryWidget>> collateral(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getCollateralSummary(asOfDate)));
    }

    @GetMapping("/top-exposures")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicRiskResponses.TopExposure>>> topExposures(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getTopExposures(asOfDate)));
    }

    @GetMapping("/trend")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicRiskResponses.MonthlyRiskTrend>>> trend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getTrend(asOfDate)));
    }

    @GetMapping("/contract-type/{type}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN','FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Object>> byType(
            @PathVariable String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getContractTypeView(type, asOfDate)));
    }
}
