package com.cbs.liquidityrisk.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.liquidityrisk.entity.LiquidityMetric; import com.cbs.liquidityrisk.service.LiquidityRiskService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/liquidity-risk") @RequiredArgsConstructor
@Tag(name = "Liquidity Risk", description = "LCR/NSFR calculation (Basel III), HQLA composition, stress testing, breach monitoring")
public class LiquidityRiskController {
    private final LiquidityRiskService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<LiquidityMetric>> calc(@RequestBody LiquidityMetric metric) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculateMetrics(metric))); }
    @GetMapping("/{currency}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<LiquidityMetric>>> history(@PathVariable String currency) { return ResponseEntity.ok(ApiResponse.ok(service.getHistory(currency))); }
    @GetMapping("/breaches") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<LiquidityMetric>>> breaches() { return ResponseEntity.ok(ApiResponse.ok(service.getBreaches())); }
}
