package com.cbs.finstrument.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.finstrument.entity.FinancialInstrument;
import com.cbs.finstrument.service.FinancialInstrumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/financial-instruments")
@RequiredArgsConstructor
@Tag(name = "Financial Instruments", description = "Reference data — securities, bonds, FX, derivatives (ISIN/CUSIP/SEDOL)")
public class FinancialInstrumentController {

    private final FinancialInstrumentService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FinancialInstrument>> create(@RequestBody FinancialInstrument i) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(i)));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<FinancialInstrument>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code)));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<List<FinancialInstrument>>> byType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/asset-class/{assetClass}")
    public ResponseEntity<ApiResponse<List<FinancialInstrument>>> byAssetClass(@PathVariable String assetClass) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByAssetClass(assetClass)));
    }
}
