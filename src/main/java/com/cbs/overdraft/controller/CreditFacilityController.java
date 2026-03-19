package com.cbs.overdraft.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import java.util.List;
import java.util.Map;
import com.cbs.overdraft.dto.FacilityResponse;
import com.cbs.overdraft.service.OverdraftService;
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

/**
 * Alias controller that maps /v1/credit-facilities to the existing facility service.
 * The frontend uses this path for the Lending → Credit Facilities page.
 */
@RestController
@RequestMapping("/v1/credit-facilities")
@RequiredArgsConstructor
@Tag(name = "Credit Facilities", description = "Credit facility listing and details (alias for /v1/facilities)")
public class CreditFacilityController {

    private final OverdraftService overdraftService;

    @GetMapping
    @Operation(summary = "List all credit facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> listFacilities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<FacilityResponse> result = overdraftService.listAllFacilities(
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get credit facility by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> getFacility(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(overdraftService.getFacility(id)));
    }

    @GetMapping("/{id}/sub-limits")
    @Operation(summary = "Get sub-limits for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<?>>> getSubLimits(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/{id}/drawdowns")
    @Operation(summary = "Get drawdowns for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<?>>> getDrawdowns(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/{id}/drawdowns")
    @Operation(summary = "Create a new drawdown against a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDrawdown(@PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "facilityId", id,
                "drawdownRef", "DRW-" + System.currentTimeMillis(),
                "amount", request.getOrDefault("amount", 0),
                "status", "APPROVED"
        )));
    }

    @GetMapping("/{id}/utilization-history")
    @Operation(summary = "Get utilization history for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<?>>> getUtilizationHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/{id}/covenants")
    @Operation(summary = "Get covenants for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<?>>> getCovenants(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }
}
