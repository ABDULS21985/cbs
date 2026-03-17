package com.cbs.overdraft.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.overdraft.dto.*;
import com.cbs.overdraft.service.OverdraftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/facilities")
@RequiredArgsConstructor
@Tag(name = "Overdraft & Line of Credit", description = "Revolving credit facilities with utilization tracking")
public class OverdraftController {

    private final OverdraftService overdraftService;

    @PostMapping
    @Operation(summary = "Create a credit facility (overdraft/LOC)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FacilityResponse>> createFacility(@Valid @RequestBody CreateFacilityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(overdraftService.createFacility(request), "Facility created"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get facility details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> getFacility(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(overdraftService.getFacility(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer's credit facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> getCustomerFacilities(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<FacilityResponse> result = overdraftService.getCustomerFacilities(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/drawdown")
    @Operation(summary = "Draw down from facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> drawdown(
            @PathVariable Long id, @RequestParam BigDecimal amount, @RequestParam(required = false) String narration) {
        return ResponseEntity.ok(ApiResponse.ok(overdraftService.drawdown(id, amount, narration)));
    }

    @PostMapping("/{id}/repay")
    @Operation(summary = "Repay facility utilization")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> repay(
            @PathVariable Long id, @RequestParam BigDecimal amount, @RequestParam(required = false) String narration) {
        return ResponseEntity.ok(ApiResponse.ok(overdraftService.repay(id, amount, narration)));
    }

    @PostMapping("/{id}/interest/post")
    @Operation(summary = "Post accrued interest on facility")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FacilityResponse>> postInterest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(overdraftService.postInterest(id)));
    }

    @PostMapping("/batch/accrue-interest")
    @Operation(summary = "Batch accrue interest on all utilized facilities")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchAccrue() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", overdraftService.batchAccrueInterest())));
    }

    @PostMapping("/batch/process-expiry")
    @Operation(summary = "Process expired facilities (auto-renew or expire)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processExpiry() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", overdraftService.processExpiredFacilities())));
    }
}
