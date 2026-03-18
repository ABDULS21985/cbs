package com.cbs.finstatement.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.finstatement.entity.FinancialStatement;
import com.cbs.finstatement.entity.StatementRatio;
import com.cbs.finstatement.service.FinancialStatementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/financial-statements")
@RequiredArgsConstructor
@Tag(name = "Financial Statement Assessment", description = "Financial statement ingestion, ratio calculation, and credit assessment")
public class FinancialStatementController {

    private final FinancialStatementService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FinancialStatement>> submit(@RequestBody FinancialStatement statement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submit(statement)));
    }

    @PostMapping("/{code}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FinancialStatement>> approve(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(code)));
    }

    @PostMapping("/{code}/calculate-ratios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<StatementRatio>>> calculateRatios(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.calculateRatios(code)));
    }

    @GetMapping("/customer/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FinancialStatement>>> getByCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(id)));
    }

    @GetMapping("/{code}/ratios")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<StatementRatio>>> getRatios(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRatios(code)));
    }
}
