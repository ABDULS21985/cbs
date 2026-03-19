package com.cbs.overdraft.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.overdraft.dto.FacilityResponse;
import com.cbs.overdraft.entity.FacilityCovenant;
import com.cbs.overdraft.entity.FacilityUtilizationLog;
import com.cbs.overdraft.repository.FacilityCovenantRepository;
import com.cbs.overdraft.repository.FacilityUtilizationLogRepository;
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

import java.math.BigDecimal;
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
    private final FacilityUtilizationLogRepository utilizationLogRepository;
    private final FacilityCovenantRepository covenantRepository;

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
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> getSubLimits(@PathVariable Long id) {
        // Sub-limits are child facilities of the same account — query by customer from parent
        FacilityResponse parent = overdraftService.getFacility(id);
        Page<FacilityResponse> children = overdraftService.getCustomerFacilities(
                parent.getCustomerId(), PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<FacilityResponse> subLimits = children.getContent().stream()
                .filter(f -> !f.getId().equals(id))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(subLimits));
    }

    @GetMapping("/{id}/drawdowns")
    @Operation(summary = "Get drawdowns for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FacilityUtilizationLog>>> getDrawdowns(@PathVariable Long id) {
        Page<FacilityUtilizationLog> logs = utilizationLogRepository.findByFacilityIdOrderByCreatedAtDesc(
                id, PageRequest.of(0, 100));
        return ResponseEntity.ok(ApiResponse.ok(logs.getContent()));
    }

    @PostMapping("/{id}/drawdowns")
    @Operation(summary = "Create a new drawdown against a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> createDrawdown(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String narration) {
        FacilityResponse result = overdraftService.drawdown(id, amount, narration);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(result, "Drawdown processed"));
    }

    @GetMapping("/{id}/utilization-history")
    @Operation(summary = "Get utilization history for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FacilityUtilizationLog>>> getUtilizationHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<FacilityUtilizationLog> logs = overdraftService.getUtilizationHistory(
                id, PageRequest.of(page, Math.min(size, 100)));
        return ResponseEntity.ok(ApiResponse.ok(logs.getContent(), PageMeta.from(logs)));
    }

    @GetMapping("/{id}/covenants")
    @Operation(summary = "Get covenants for a credit facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FacilityCovenant>>> getCovenants(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(covenantRepository.findByFacilityIdOrderByNextTestDateAsc(id)));
    }
}
