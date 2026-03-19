package com.cbs.payments.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/fx")
@RequiredArgsConstructor
@Tag(name = "FX Rates", description = "Foreign exchange rate queries")
public class FxRateController {

    private final FxRateRepository fxRateRepository;

    @GetMapping("/rate")
    @Operation(summary = "Get current FX rates, optionally filtered by currency pair")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FxRate>>> getCurrentRates(
            @RequestParam(required = false) String sourceCurrency,
            @RequestParam(required = false) String targetCurrency) {
        if (sourceCurrency != null && targetCurrency != null) {
            List<FxRate> rates = fxRateRepository.findLatestRate(sourceCurrency, targetCurrency);
            return ResponseEntity.ok(ApiResponse.ok(rates));
        }
        List<FxRate> rates = fxRateRepository.findByRateDateAndIsActiveTrue(LocalDate.now());
        if (rates.isEmpty()) {
            // Fallback: return all active rates
            rates = fxRateRepository.findAll().stream()
                    .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(rates));
    }
}
