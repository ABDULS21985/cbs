package com.cbs.productanalytics.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productanalytics.entity.ProductQualityAssessment;
import com.cbs.productanalytics.service.ProductQualityService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/product-quality")
@RequiredArgsConstructor
@Tag(name = "Product Quality Assurance", description = "Product quality assessment, trend analysis, and benchmarking")
public class ProductQualityController {

    private final ProductQualityService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductQualityAssessment>> assess(@RequestBody ProductQualityAssessment assessment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createAssessment(assessment)));
    }

    @GetMapping("/trend/{productCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductQualityAssessment>>> getQualityTrend(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(service.getQualityTrend(productCode)));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductQualityAssessment>>> getQualityDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getQualityDashboard()));
    }

    @GetMapping("/compare")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductQualityAssessment>>> compareProducts(
            @RequestParam(required = false) String code1, @RequestParam(required = false) String code2) {
        if (code1 == null || code2 == null) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.ok(service.compareProducts(code1, code2)));
    }
}
