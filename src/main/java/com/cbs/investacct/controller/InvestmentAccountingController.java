package com.cbs.investacct.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.investacct.entity.*;
import com.cbs.investacct.service.InvestmentAccountingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/investment-accounting") @RequiredArgsConstructor
@Tag(name = "Investment Portfolio Accounting", description = "IFRS 9 classification, valuation (AC/FVOCI/FVTPL), ECL, OCI")
public class InvestmentAccountingController {

    private final InvestmentAccountingService investmentService;

    @PostMapping("/portfolios")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<InvestmentPortfolio>> createPortfolio(@RequestBody InvestmentPortfolio portfolio) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(investmentService.createPortfolio(portfolio)));
    }

    @GetMapping("/portfolios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InvestmentPortfolio>>> getPortfolios() {
        return ResponseEntity.ok(ApiResponse.ok(investmentService.getAllPortfolios()));
    }

    @PostMapping("/valuate/{holdingId}")
    @Operation(summary = "IFRS 9 valuation: AC → amortised cost, FVOCI → fair value + OCI, FVTPL → fair value to P&L")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<InvestmentValuation>> valuate(
            @PathVariable Long holdingId, @RequestParam BigDecimal fairValue,
            @RequestParam(required = false) LocalDate valuationDate) {
        return ResponseEntity.ok(ApiResponse.ok(investmentService.valuateHolding(
                holdingId, fairValue, valuationDate != null ? valuationDate : LocalDate.now())));
    }

    @GetMapping("/valuations/{portfolioCode}/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InvestmentValuation>>> getValuations(
            @PathVariable String portfolioCode, @PathVariable LocalDate date,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<InvestmentValuation> result = investmentService.getValuations(portfolioCode, date, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/summary/{portfolioCode}/{date}")
    @Operation(summary = "Portfolio summary: total carrying amount and ECL")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InvestmentAccountingService.PortfolioSummary>> getSummary(
            @PathVariable String portfolioCode, @PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(investmentService.getPortfolioSummary(portfolioCode, date)));
    }
}
