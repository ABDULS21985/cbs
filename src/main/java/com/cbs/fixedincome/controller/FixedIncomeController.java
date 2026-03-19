package com.cbs.fixedincome.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.fixedincome.entity.*;
import com.cbs.fixedincome.service.FixedIncomeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/v1/fixed-income") @RequiredArgsConstructor
@Tag(name = "Fixed Income & Securities", description = "Portfolio management, accrual, coupon, MTM, maturity")
public class FixedIncomeController {

    private final FixedIncomeService fixedIncomeService;

    @GetMapping("/holdings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecurityHolding>>> listHoldings() {
        return ResponseEntity.ok(ApiResponse.ok(fixedIncomeService.getAllHoldings()));
    }

    @PostMapping("/holdings")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityHolding>> addHolding(@RequestBody SecurityHolding holding) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(fixedIncomeService.addHolding(holding)));
    }

    @GetMapping("/holdings/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecurityHolding>> getHolding(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fixedIncomeService.getHolding(id)));
    }

    @GetMapping("/portfolio/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecurityHolding>>> getPortfolio(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(fixedIncomeService.getPortfolioHoldings(code)));
    }

    @GetMapping("/portfolio/{code}/face-value")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getFaceValue(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("totalFaceValue", fixedIncomeService.getPortfolioFaceValue(code))));
    }

    @GetMapping("/batch/accrual") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAccrualStatus() { return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE"))); }
    @GetMapping("/batch/coupons") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCouponsStatus() { return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE"))); }
    @GetMapping("/batch/maturity") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getMaturityStatus() { return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE"))); }
    @GetMapping("/batch/mtm") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getMtmStatus() { return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE"))); }

    @PostMapping("/batch/accrual")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchAccrual() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", fixedIncomeService.batchDailyAccrual())));
    }

    @PostMapping("/batch/mtm")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchMtm(@RequestBody Map<String, BigDecimal> prices) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("updated", fixedIncomeService.batchMarkToMarket(prices))));
    }

    @PostMapping("/batch/maturity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchMaturity() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("matured", fixedIncomeService.processMaturedHoldings())));
    }

    @PostMapping("/batch/coupons")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchCoupons() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", fixedIncomeService.processDueCoupons())));
    }
}
