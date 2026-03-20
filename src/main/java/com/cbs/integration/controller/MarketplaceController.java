package com.cbs.integration.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.integration.entity.*;
import com.cbs.integration.service.MarketplaceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/marketplace") @RequiredArgsConstructor
@Tag(name = "API Marketplace", description = "API product catalog, subscription management, usage tracking, developer portal analytics")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping("/products")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketplaceApiProduct>> createProduct(@RequestBody MarketplaceApiProduct product) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(marketplaceService.createProduct(product)));
    }

    @PostMapping("/products/{id}/publish")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketplaceApiProduct>> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.publishProduct(id)));
    }

    @PostMapping("/products/{id}/deprecate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketplaceApiProduct>> deprecate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.deprecateProduct(id)));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<MarketplaceApiProduct>>> getPublished() {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getPublishedProducts()));
    }

    @GetMapping("/products/category/{category}")
    public ResponseEntity<ApiResponse<List<MarketplaceApiProduct>>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getByCategory(category)));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketplaceSubscription>>> listSubscriptions() {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getAllSubscriptions()));
    }

    @PostMapping("/subscriptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<MarketplaceSubscription>> subscribe(
            @RequestParam Long productId, @RequestParam String subscriberName,
            @RequestParam(required = false) String subscriberEmail,
            @RequestParam(defaultValue = "STANDARD") String planTier) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                marketplaceService.subscribe(productId, subscriberName, subscriberEmail, planTier)));
    }

    @PostMapping("/subscriptions/{subscriptionId}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketplaceSubscription>> approve(
            @PathVariable String subscriptionId) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.approveSubscription(subscriptionId, currentActorProvider.getCurrentActor())));
    }

    @GetMapping("/usage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketplaceUsageLog>>> listUsage() {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getAllUsageLogs()));
    }

    @PostMapping("/usage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MarketplaceUsageLog>> recordUsage(
            @RequestParam Long subscriptionId, @RequestParam String endpointPath,
            @RequestParam String httpMethod, @RequestParam int responseCode,
            @RequestParam int responseTimeMs, @RequestParam(required = false) String ipAddress) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                marketplaceService.recordUsage(subscriptionId, endpointPath, httpMethod, responseCode, responseTimeMs, ipAddress)));
    }

    @GetMapping("/products/{id}/analytics")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getProductAnalytics(id)));
    }
}
