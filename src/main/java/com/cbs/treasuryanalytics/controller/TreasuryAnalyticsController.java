package com.cbs.treasuryanalytics.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.treasuryanalytics.entity.TreasuryAnalyticsSnapshot; import com.cbs.treasuryanalytics.service.TreasuryAnalyticsService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/treasury-analytics") @RequiredArgsConstructor
@Tag(name = "Treasury Analytics", description = "NIM, cost of funds, yield, CAR, Tier 1, ROA, ROE, loan-to-deposit")
public class TreasuryAnalyticsController {
    private final TreasuryAnalyticsService service;
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<TreasuryAnalyticsSnapshot>>> listAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAllSnapshots())); }
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<TreasuryAnalyticsSnapshot>> record(@RequestBody TreasuryAnalyticsSnapshot s) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.record(s))); }
    @GetMapping("/{currency}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<TreasuryAnalyticsSnapshot>>> history(@PathVariable String currency) { return ResponseEntity.ok(ApiResponse.ok(service.getHistory(currency))); }
}
