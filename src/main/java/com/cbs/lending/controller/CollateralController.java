package com.cbs.lending.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.lending.dto.*;
import com.cbs.lending.entity.LoanRestructureLog;
import com.cbs.lending.service.CollateralService;
import com.cbs.lending.service.LoanRestructuringService;
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

@RestController
@RequestMapping("/v1/collaterals")
@RequiredArgsConstructor
@Tag(name = "Collateral Management", description = "Registration, valuation, lien management, loan linking")
public class CollateralController {

    private final CollateralService collateralService;
    private final LoanRestructuringService restructuringService;
    private final CurrentActorProvider currentActorProvider;

    @GetMapping
    @Operation(summary = "List all collaterals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CollateralDto>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CollateralDto> result = collateralService.getAllCollaterals(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping
    @Operation(summary = "Register a new collateral")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CollateralDto>> register(@Valid @RequestBody CollateralDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(collateralService.registerCollateral(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get collateral details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CollateralDto>> getCollateral(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(collateralService.getCollateral(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer's collaterals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CollateralDto>>> getCustomerCollaterals(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CollateralDto> result = collateralService.getCustomerCollaterals(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/valuations")
    @Operation(summary = "Add a valuation to collateral")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CollateralValuationDto>> addValuation(
            @PathVariable Long id, @Valid @RequestBody CollateralValuationDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(collateralService.addValuation(id, dto)));
    }

    @GetMapping("/{id}/valuations")
    @Operation(summary = "Get valuation history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CollateralValuationDto>>> getValuations(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(collateralService.getValuationHistory(id)));
    }

    @PostMapping("/{collateralId}/link/{loanAccountId}")
    @Operation(summary = "Link collateral to a loan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> linkToLoan(
            @PathVariable Long collateralId, @PathVariable Long loanAccountId,
            @RequestParam BigDecimal allocatedValue) {
        collateralService.linkToLoan(collateralId, loanAccountId, allocatedValue);
        return ResponseEntity.ok(ApiResponse.ok(null, "Collateral linked to loan"));
    }

    @DeleteMapping("/{collateralId}/lien/{loanAccountId}")
    @Operation(summary = "Release lien on collateral")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> releaseLien(@PathVariable Long collateralId, @PathVariable Long loanAccountId) {
        collateralService.releaseLien(collateralId, loanAccountId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Lien released"));
    }

    // Restructuring endpoints (Capabilities 22-23)
    @PostMapping("/loans/{loanId}/restructure")
    @Operation(summary = "Restructure a loan")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> restructureLoan(
            @PathVariable Long loanId, @Valid @RequestBody LoanRestructureRequest request) {
        restructuringService.restructureLoan(loanId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Loan restructured"));
    }

    @GetMapping("/loans/{loanId}/restructure-history")
    @Operation(summary = "Get loan restructure history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanRestructureLog>>> getRestructureHistory(@PathVariable Long loanId) {
        return ResponseEntity.ok(ApiResponse.ok(restructuringService.getRestructureHistory(loanId)));
    }
}
