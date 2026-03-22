package com.cbs.promotion.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.promotion.entity.PromotionalEvent;
import com.cbs.promotion.service.PromotionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/promotion-campaigns")
@RequiredArgsConstructor
@Tag(name = "Promotions", description = "Promotional event management and redemption")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping("/active")
    @Operation(summary = "Get all currently active promotions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PromotionalEvent>>> getActivePromotions() {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.getActivePromotions()));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get promotions by event type")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PromotionalEvent>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.getByEventType(type)));
    }

    @PostMapping("/{code}/activate")
    @Operation(summary = "Activate a promotion by promo code")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PromotionalEvent>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.activate(code), "Promotion activated"));
    }

    @PostMapping("/{code}/redeem")
    @Operation(summary = "Redeem a promotion by promo code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PromotionalEvent>> redeem(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.redeem(code), "Promotion redeemed"));
    }
}
