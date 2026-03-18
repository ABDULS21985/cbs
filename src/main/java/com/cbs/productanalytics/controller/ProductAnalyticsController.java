package com.cbs.productanalytics.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productanalytics.entity.ProductPerformanceSnapshot;
import com.cbs.productanalytics.service.ProductAnalyticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/product-analytics")
@RequiredArgsConstructor
@Tag(name = "Product Portfolio Analytics", description = "Product performance tracking, revenue analysis, and profitability metrics")
public class ProductAnalyticsController {

    private final ProductAnalyticsService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductPerformanceSnapshot>> record(@RequestBody ProductPerformanceSnapshot snapshot) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.record(snapshot)));
    }

    @GetMapping("/product/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductPerformanceSnapshot>>> getByProduct(
            @PathVariable String code, @RequestParam String periodType) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByProduct(code, periodType)));
    }

    @GetMapping("/family/{family}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductPerformanceSnapshot>>> getByFamily(
            @PathVariable String family,
            @RequestParam String periodType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByFamily(family, periodType, periodDate)));
    }
}
