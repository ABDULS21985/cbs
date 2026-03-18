package com.cbs.investportfolio.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.investportfolio.entity.InvestPortfolio;
import com.cbs.investportfolio.entity.PortfolioHolding;
import com.cbs.investportfolio.service.InvestmentPortfolioService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1/investment-portfolios")
@RequiredArgsConstructor
@Tag(name = "Investment Portfolio", description = "Portfolio creation, holdings, valuation, rebalancing")
public class InvestmentPortfolioController {

    private final InvestmentPortfolioService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<InvestPortfolio>> create(@RequestBody InvestPortfolio portfolio) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(portfolio)));
    }

    @PostMapping("/{code}/holdings")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PortfolioHolding>> addHolding(
            @PathVariable String code, @RequestBody PortfolioHolding holding) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addHolding(code, holding)));
    }

    @PostMapping("/{code}/valuate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InvestPortfolio>> valuate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.valuate(code)));
    }

    @GetMapping("/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InvestPortfolio>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InvestPortfolio>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId)));
    }

    @GetMapping("/{code}/holdings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PortfolioHolding>>> getHoldings(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getHoldings(code)));
    }
}
