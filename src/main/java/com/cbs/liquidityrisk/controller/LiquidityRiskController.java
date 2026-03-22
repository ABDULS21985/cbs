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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController @RequestMapping("/v1/liquidity-risk") @RequiredArgsConstructor
@Tag(name = "Liquidity Risk", description = "LCR/NSFR calculation (Basel III), HQLA composition, stress testing, breach monitoring")
public class LiquidityRiskController {
    private final LiquidityRiskService service;
    private final LiquidityMetricRepository liquidityMetricRepository;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LiquidityMetric>> calc(@RequestBody LiquidityMetric metric) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculateMetrics(metric)));
    }

    @GetMapping("/{currency}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> history(@PathVariable String currency) {
        return ResponseEntity.ok(ApiResponse.ok(service.getHistory(currency)));
    }

    @GetMapping("/breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> breaches() {
        return ResponseEntity.ok(ApiResponse.ok(service.getBreaches()));
    }

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
    @Operation(summary = "Get liquidity risk statistics — returns current ratios, 30-day trends, HQLA composition, and breach count")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        // Fetch the last 30 data points ordered newest-first for trend; use NGN as default if mixed
        List<LiquidityMetric> recent = liquidityMetricRepository.findAll(
                PageRequest.of(0, 30, Sort.by(Sort.Direction.DESC, "metricDate"))).getContent();

        // Current LCR / NSFR — from the most recent record
        double currentLcr = recent.isEmpty() ? 0d
                : recent.get(0).getLcrRatio() != null ? recent.get(0).getLcrRatio().doubleValue() : 0d;
        double currentNsfr = recent.isEmpty() ? 0d
                : recent.get(0).getNsfrRatio() != null ? recent.get(0).getNsfrRatio().doubleValue() : 0d;

        // Breach count
        List<LiquidityMetric> breached = liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc();
        int breachCount = breached.size();

        // Trend arrays — reverse to chronological order for charting
        List<LiquidityMetric> chronological = new ArrayList<>(recent);
        java.util.Collections.reverse(chronological);

        List<Map<String, Object>> lcrTrend = chronological.stream()
                .map(m -> {
                    Map<String, Object> point = new LinkedHashMap<>();
                    point.put("date", m.getMetricDate() != null ? m.getMetricDate().toString() : "");
                    point.put("value", m.getLcrRatio() != null ? m.getLcrRatio().doubleValue() : 0d);
                    return point;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> nsfrTrend = chronological.stream()
                .map(m -> {
                    Map<String, Object> point = new LinkedHashMap<>();
                    point.put("date", m.getMetricDate() != null ? m.getMetricDate().toString() : "");
                    point.put("value", m.getNsfrRatio() != null ? m.getNsfrRatio().doubleValue() : 0d);
                    return point;
                })
                .collect(Collectors.toList());

        // HQLA composition — aggregate across all recent records by level
        BigDecimal level1 = recent.stream().map(LiquidityMetric::getHqlaLevel1)
                .filter(v -> v != null).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal level2a = recent.stream().map(LiquidityMetric::getHqlaLevel2a)
                .filter(v -> v != null).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal level2b = recent.stream().map(LiquidityMetric::getHqlaLevel2b)
                .filter(v -> v != null).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Use most recent record's HQLA breakdown for composition pie (more meaningful than a sum)
        if (!recent.isEmpty()) {
            LiquidityMetric latest = recent.get(0);
            level1 = latest.getHqlaLevel1() != null ? latest.getHqlaLevel1() : BigDecimal.ZERO;
            level2a = latest.getHqlaLevel2a() != null ? latest.getHqlaLevel2a() : BigDecimal.ZERO;
            level2b = latest.getHqlaLevel2b() != null ? latest.getHqlaLevel2b() : BigDecimal.ZERO;
        }

        List<Map<String, Object>> hqlaComposition = new ArrayList<>();
        if (level1.compareTo(BigDecimal.ZERO) > 0) {
            hqlaComposition.add(Map.of("level", "Level 1", "amount", level1.doubleValue()));
        }
        if (level2a.compareTo(BigDecimal.ZERO) > 0) {
            hqlaComposition.add(Map.of("level", "Level 2A", "amount", level2a.doubleValue()));
        }
        if (level2b.compareTo(BigDecimal.ZERO) > 0) {
            hqlaComposition.add(Map.of("level", "Level 2B", "amount", level2b.doubleValue()));
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("currentLcr", currentLcr);
        stats.put("currentNsfr", currentNsfr);
        stats.put("lcrTrend", lcrTrend);
        stats.put("nsfrTrend", nsfrTrend);
        stats.put("hqlaComposition", hqlaComposition);
        stats.put("breachCount", breachCount);

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
