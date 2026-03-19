package com.cbs.risk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.fraud.entity.FraudAlert;
import com.cbs.fraud.repository.FraudAlertRepository;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import com.cbs.oprisk.entity.OpRiskKri;
import com.cbs.oprisk.repository.OpRiskKriRepository;
import com.cbs.oprisk.entity.OpRiskLossEvent;
import com.cbs.oprisk.repository.OpRiskLossEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/risk")
@RequiredArgsConstructor
@Tag(name = "Risk Overview", description = "Aggregated risk dashboard: alerts, KRIs, limits across all risk modules")
public class RiskOverviewController {

    private final AmlAlertRepository amlAlertRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final OpRiskLossEventRepository opRiskLossEventRepository;
    private final OpRiskKriRepository opRiskKriRepository;
    private final MarketRiskPositionRepository marketRiskPositionRepository;
    private final LiquidityMetricRepository liquidityMetricRepository;

    @GetMapping("/alerts")
    @Operation(summary = "List combined risk alerts from AML, Fraud, and OpRisk")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRiskAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AmlAlert> amlAlerts = amlAlertRepository.findAll(pageRequest);
        Page<FraudAlert> fraudAlerts = fraudAlertRepository.findAll(pageRequest);
        Page<OpRiskLossEvent> opRiskEvents = opRiskLossEventRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate")));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "amlAlerts", amlAlerts.getContent(),
                "fraudAlerts", fraudAlerts.getContent(),
                "opRiskEvents", opRiskEvents.getContent(),
                "totalAml", amlAlerts.getTotalElements(),
                "totalFraud", fraudAlerts.getTotalElements(),
                "totalOpRisk", opRiskEvents.getTotalElements()
        )));
    }

    @GetMapping("/kris")
    @Operation(summary = "List all active Key Risk Indicators")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskKri>>> getKris() {
        return ResponseEntity.ok(ApiResponse.ok(opRiskKriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc()));
    }

    @GetMapping("/limits")
    @Operation(summary = "List risk limit breaches across all modules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLimits() {
        List<MarketRiskPosition> marketBreaches = marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc();
        List<LiquidityMetric> lcrBreaches = liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "marketRiskBreaches", marketBreaches,
                "liquidityBreaches", lcrBreaches,
                "totalMarketBreaches", marketBreaches.size(),
                "totalLiquidityBreaches", lcrBreaches.size()
        )));
    }

    @GetMapping("/market")
    @Operation(summary = "List market risk positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> getMarketRisk(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MarketRiskPosition> result = marketRiskPositionRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "positionDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/market/breaches")
    @Operation(summary = "List market risk limit breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketRiskPosition>>> getMarketBreaches() {
        return ResponseEntity.ok(ApiResponse.ok(marketRiskPositionRepository.findByLimitBreachTrueOrderByPositionDateDesc()));
    }

    @GetMapping("/liquidity")
    @Operation(summary = "List liquidity risk metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> getLiquidityRisk(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LiquidityMetric> result = liquidityMetricRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "metricDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/liquidity/breaches")
    @Operation(summary = "List liquidity risk breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LiquidityMetric>>> getLiquidityBreaches() {
        return ResponseEntity.ok(ApiResponse.ok(liquidityMetricRepository.findByLcrBreachTrueOrderByMetricDateDesc()));
    }
}
