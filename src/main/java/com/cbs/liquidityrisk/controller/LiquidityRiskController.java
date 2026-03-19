package com.cbs.liquidityrisk.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import com.cbs.liquidityrisk.service.LiquidityRiskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/liquidity-risk") @RequiredArgsConstructor
@Tag(name = "Liquidity Risk", description = "LCR/NSFR calculation (Basel III), HQLA composition, stress testing, breach monitoring")
public class LiquidityRiskController {
    private final LiquidityRiskService service;
    private final LiquidityMetricRepository liquidityMetricRepository;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<LiquidityMetric>> calc(@RequestBody LiquidityMetric metric) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculateMetrics(metric))); }
    @GetMapping("/{currency}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<LiquidityMetric>>> history(@PathVariable String currency) { return ResponseEntity.ok(ApiResponse.ok(service.getHistory(currency))); }
    @GetMapping("/breaches") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<LiquidityMetric>>> breaches() { return ResponseEntity.ok(ApiResponse.ok(service.getBreaches())); }

    @GetMapping
    @Operation(summary = "List all liquidity risk metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LiquidityMetric> result = liquidityMetricRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "metricDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get liquidity risk statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalMetrics", liquidityMetricRepository.count(),
                "breaches", liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc().size()
        )));
    }
}
