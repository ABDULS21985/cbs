package com.cbs.tradingmodel.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tradingmodel.entity.TradingModel;
import com.cbs.tradingmodel.service.TradingModelService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/trading-models")
@RequiredArgsConstructor
@Tag(name = "Trading Model", description = "Trading model lifecycle and inventory management")
public class TradingModelController {

    private final TradingModelService tradingModelService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingModel>> registerModel(@RequestBody TradingModel model) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tradingModelService.registerModel(model)));
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingModel>> submitForValidation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.submitForValidation(id)));
    }

    @PostMapping("/{id}/deploy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingModel>> deployToProduction(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.deployToProduction(id)));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingModel>> retireModel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.retireModel(id)));
    }

    @PostMapping("/{id}/calibrate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingModel>> calibrateModel(@PathVariable Long id, @RequestParam String quality) {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.calibrateModel(id, quality)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradingModel>>> getModelInventory() {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.getModelInventory()));
    }

    @GetMapping("/due-for-review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradingModel>>> getModelsForReview() {
        return ResponseEntity.ok(ApiResponse.ok(tradingModelService.getModelsForReview()));
    }
}
