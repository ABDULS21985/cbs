package com.cbs.marketrisk.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import com.cbs.marketrisk.service.MarketRiskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/market-risk") @RequiredArgsConstructor
@Tag(name = "Market Risk", description = "VaR (historical/parametric/MC), stress testing, Greeks, P&L attribution, limit monitoring")
public class MarketRiskController {
    private final MarketRiskService service;
    private final MarketRiskPositionRepository marketRiskPositionRepository;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketRiskPosition>> record(@RequestBody MarketRiskPosition pos) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordPosition(pos))); }
    @GetMapping("/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> byDate(@PathVariable LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByDate(date))); }
    @GetMapping("/breaches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> breaches() { return ResponseEntity.ok(ApiResponse.ok(service.getBreaches())); }

    @GetMapping
    @Operation(summary = "List all market risk positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MarketRiskPosition> result = marketRiskPositionRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "positionDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get market risk statistics — totalVar, avgLimitUtilization, breachCount, portfolioStressLoss")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        List<MarketRiskPosition> recent = marketRiskPositionRepository.findAll(
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "positionDate"))).getContent();

        double totalVar = recent.stream()
                .mapToDouble(p -> p.getVar1d95() != null ? p.getVar1d95().doubleValue() : 0d)
                .sum();

        double avgUtil = recent.isEmpty() ? 0d : recent.stream()
                .mapToDouble(p -> p.getVarUtilizationPct() != null ? p.getVarUtilizationPct().doubleValue() : 0d)
                .average().orElse(0d);

        List<MarketRiskPosition> breached = marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc();

        double stressLoss = recent.stream()
                .mapToDouble(p -> p.getStressLossSevere() != null ? p.getStressLossSevere().doubleValue() : 0d)
                .sum();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalVar", totalVar);
        stats.put("avgLimitUtilization", avgUtil);
        stats.put("breachCount", breached.size());
        stats.put("portfolioStressLoss", stressLoss);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
