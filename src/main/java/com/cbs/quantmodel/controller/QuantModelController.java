package com.cbs.quantmodel.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.quantmodel.entity.ModelBacktest;
import com.cbs.quantmodel.entity.QuantModel;
import com.cbs.quantmodel.service.QuantModelService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/quant-models")
@RequiredArgsConstructor
@Tag(name = "Quantitative Models", description = "Model registry, validation, governance, and backtesting")
public class QuantModelController {

    private final QuantModelService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QuantModel>> register(@RequestBody QuantModel model) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(model)));
    }

    @PostMapping("/{code}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QuantModel>> approve(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(code)));
    }

    @PostMapping("/{code}/promote")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QuantModel>> promote(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.promote(code)));
    }

    @PostMapping("/{code}/retire")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<QuantModel>> retire(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.retire(code)));
    }

    @PostMapping("/{code}/backtest")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ModelBacktest>> recordBacktest(@PathVariable String code, @RequestBody ModelBacktest backtest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordBacktest(backtest)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<QuantModel>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/due-for-review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<QuantModel>>> getDueForReview() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDueForReview()));
    }

    @GetMapping("/{code}/backtests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ModelBacktest>>> getBacktests(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBacktests(code)));
    }
}
