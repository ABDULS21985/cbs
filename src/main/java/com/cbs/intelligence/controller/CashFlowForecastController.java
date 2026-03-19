package com.cbs.intelligence.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.intelligence.entity.CashflowForecast;
import com.cbs.intelligence.service.CashFlowForecastService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/intelligence/cashflow") @RequiredArgsConstructor
@Tag(name = "Cash Flow Forecasting", description = "ML-powered cash flow projections with confidence intervals and breakdown")
public class CashFlowForecastController {
    private final CashFlowForecastService service;

    @GetMapping("/forecast")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CashflowForecast>>> listForecasts() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllForecasts()));
    }

    @PostMapping("/forecast")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CashflowForecast>> generate(
            @RequestParam String entityType, @RequestParam String entityId,
            @RequestParam(defaultValue = "USD") String currency,
            @RequestParam(defaultValue = "30") int horizonDays,
            @RequestParam(defaultValue = "ARIMA") String modelType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                service.generateForecast(entityType, entityId, currency, horizonDays, modelType)));
    }

    @GetMapping("/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CashflowForecast>>> get(
            @PathVariable String entityType, @PathVariable String entityId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getForecasts(entityType, entityId)));
    }

    @PostMapping("/{forecastId}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CashflowForecast>> approve(@PathVariable String forecastId) {
        return ResponseEntity.ok(ApiResponse.ok(service.approveForecast(forecastId)));
    }
}
