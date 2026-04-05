package com.cbs.fees.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.fees.entity.DiscountScheme;
import com.cbs.fees.entity.SpecialPricingAgreement;
import com.cbs.fees.service.PricingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/pricing")
@RequiredArgsConstructor
@Tag(name = "Pricing — Discounts & Special Agreements", description = "Discount schemes, special pricing agreements, and evaluation")
public class PricingController {

    private final PricingService pricingService;

    @GetMapping("/discounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DiscountScheme>>> listDiscounts() {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getAllDiscountSchemes()));
    }

    @GetMapping("/discounts/evaluate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getEvaluateInfo() {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("status", "READY")));
    }

    @GetMapping("/special-pricing")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SpecialPricingAgreement>>> listSpecialPricing() {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getAllSpecialPricing()));
    }

    @PostMapping("/discounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DiscountScheme>> createDiscount(@RequestBody DiscountScheme scheme) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(pricingService.createDiscountScheme(scheme)));
    }

    @GetMapping("/discounts/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DiscountScheme>>> getActiveDiscounts() {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getActiveDiscountSchemes()));
    }

    @PostMapping("/discounts/evaluate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PricingService.DiscountResult>> evaluateDiscount(
            @RequestParam Long customerId, @RequestParam String feeCode, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.evaluateDiscounts(customerId, feeCode, amount)));
    }

    @PostMapping("/special-pricing")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SpecialPricingAgreement>> createSpecialPricing(
            @RequestBody SpecialPricingAgreement agreement) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(pricingService.createSpecialPricing(agreement)));
    }

    @GetMapping("/special-pricing/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SpecialPricingAgreement>>> getCustomerSpecialPricing(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getPricingComparison(customerId)));
    }

    @PutMapping("/special-pricing/{id}/review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SpecialPricingAgreement>> reviewSpecialPricing(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.reviewSpecialPricing(id)));
    }

    @GetMapping("/discounts/utilization")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DiscountScheme>>> getDiscountUtilization() {
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getDiscountUtilization()));
    }
}
