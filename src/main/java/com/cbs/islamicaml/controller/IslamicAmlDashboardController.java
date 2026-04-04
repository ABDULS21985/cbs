package com.cbs.islamicaml.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.service.CombinedEntityScreeningService;
import com.cbs.islamicaml.service.IslamicAmlDashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-aml/dashboard")
@RequiredArgsConstructor
@Slf4j
public class IslamicAmlDashboardController {

    private final IslamicAmlDashboardService dashboardService;
    private final CombinedEntityScreeningService combinedScreeningService;

    // ===================== DASHBOARD =====================

    @GetMapping
    public ResponseEntity<ApiResponse<IslamicAmlDashboard>> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Fetching Islamic AML dashboard for period {} to {}", from, to);
        IslamicAmlDashboard dashboard = dashboardService.getDashboard(from, to);
        return ResponseEntity.ok(ApiResponse.ok(dashboard));
    }

    // ===================== COMBINED ENTITY SCREENING =====================

    @PostMapping("/combined-screening/screen")
    public ResponseEntity<ApiResponse<CombinedScreeningResult>> screenEntity(
            @Valid @RequestBody EntityScreeningRequest request) {
        log.info("Combined screening for entity: {}", request.getEntityName());
        CombinedScreeningResult result = combinedScreeningService.screenEntity(request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Combined screening completed"));
    }

    @GetMapping("/combined-screening/overlapping-entities")
    public ResponseEntity<ApiResponse<List<OverlappingEntity>>> getOverlappingEntities() {
        List<OverlappingEntity> entities = combinedScreeningService.findOverlappingEntities();
        return ResponseEntity.ok(ApiResponse.ok(entities));
    }
}
