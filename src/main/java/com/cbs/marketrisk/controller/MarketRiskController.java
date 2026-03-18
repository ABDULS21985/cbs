package com.cbs.marketrisk.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.marketrisk.entity.MarketRiskPosition; import com.cbs.marketrisk.service.MarketRiskService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/market-risk") @RequiredArgsConstructor
@Tag(name = "Market Risk", description = "VaR (historical/parametric/MC), stress testing, Greeks, P&L attribution, limit monitoring")
public class MarketRiskController {
    private final MarketRiskService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketRiskPosition>> record(@RequestBody MarketRiskPosition pos) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordPosition(pos))); }
    @GetMapping("/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> byDate(@PathVariable LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByDate(date))); }
    @GetMapping("/breaches") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> breaches() { return ResponseEntity.ok(ApiResponse.ok(service.getBreaches())); }
}
