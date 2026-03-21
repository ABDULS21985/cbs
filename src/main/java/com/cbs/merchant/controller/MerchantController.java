package com.cbs.merchant.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.merchant.dto.MerchantResponse;
import com.cbs.merchant.dto.OnboardMerchantRequest;
import com.cbs.merchant.dto.SuspendMerchantRequest;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.mapper.MerchantMapper;
import com.cbs.merchant.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/merchants")
@RequiredArgsConstructor
@Tag(name = "Merchant Acquiring", description = "Merchant onboarding, MDR rates, risk management, chargeback monitoring")
public class MerchantController {

    private final MerchantService service;
    private final MerchantMapper mapper;

    @GetMapping
    @Operation(summary = "List all merchants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MerchantResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponseList(service.getAllMerchants())));
    }

    @PostMapping
    @Operation(summary = "Onboard a new merchant")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MerchantResponse>> onboard(
            @Valid @RequestBody OnboardMerchantRequest request) {
        MerchantProfile entity = mapper.toEntity(request);
        MerchantProfile saved = service.onboard(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toResponse(saved)));
    }

    @PostMapping("/{merchantId}/activate")
    @Operation(summary = "Activate a merchant by merchantId")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MerchantResponse>> activate(@PathVariable String merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponse(service.activate(merchantId))));
    }

    @PostMapping("/{merchantId}/suspend")
    @Operation(summary = "Suspend a merchant with reason")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MerchantResponse>> suspend(
            @PathVariable String merchantId,
            @Valid @RequestBody SuspendMerchantRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponse(service.suspend(merchantId, request.getReason()))));
    }

    @GetMapping("/active")
    @Operation(summary = "List active merchants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MerchantResponse>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponseList(service.getActive())));
    }

    @GetMapping("/high-risk")
    @Operation(summary = "List high-risk merchants")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MerchantResponse>>> highRisk() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponseList(service.getHighRisk())));
    }
}
