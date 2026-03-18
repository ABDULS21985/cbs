package com.cbs.tdframework.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tdframework.entity.TdFrameworkSummary;
import com.cbs.tdframework.service.TdFrameworkSummaryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/td-framework-summary") @RequiredArgsConstructor
@Tag(name = "TD Framework Summary", description = "Term deposit framework agreement summaries, maturity ladder, rollover forecast")
public class TdFrameworkSummaryController {

    private final TdFrameworkSummaryService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TdFrameworkSummary>> generate(@RequestBody TdFrameworkSummary summary) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.generateSummary(summary)));
    }

    @GetMapping("/{agreementId}/maturity-ladder") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> maturityLadder(@PathVariable Long agreementId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMaturityLadder(agreementId)));
    }

    @GetMapping("/{agreementId}/rollover-forecast") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rolloverForecast(@PathVariable Long agreementId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRolloverForecast(agreementId)));
    }

    @GetMapping("/large-deposits") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TdFrameworkSummary>>> largeDeposits(@RequestParam BigDecimal threshold) {
        return ResponseEntity.ok(ApiResponse.ok(service.getLargeDepositReport(threshold)));
    }

    @GetMapping("/{agreementId}/history") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TdFrameworkSummary>>> history(@PathVariable Long agreementId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getHistory(agreementId)));
    }
}
