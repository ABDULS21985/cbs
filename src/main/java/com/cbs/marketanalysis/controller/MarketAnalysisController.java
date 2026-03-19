package com.cbs.marketanalysis.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.marketanalysis.entity.MarketAnalysisReport;
import com.cbs.marketanalysis.service.MarketAnalysisService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/market-analysis")
@RequiredArgsConstructor
@Tag(name = "Market Analysis", description = "Market research, trend analysis, and economic outlook reports")
public class MarketAnalysisController {

    private final MarketAnalysisService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketAnalysisReport>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllReports()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketAnalysisReport>> create(@RequestBody MarketAnalysisReport report) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(report)));
    }

    @PostMapping("/{code}/publish")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketAnalysisReport>> publish(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.publish(code)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketAnalysisReport>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/published")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketAnalysisReport>>> getPublished() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPublished()));
    }
}
