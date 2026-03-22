package com.cbs.intelligence.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.service.BehaviourAnalyticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/intelligence/behaviour") @RequiredArgsConstructor
@Tag(name = "Behaviour Analytics", description = "Customer event tracking, product recommendations, churn scoring")
public class BehaviourAnalyticsController {
    private final BehaviourAnalyticsService service;

    @GetMapping("/events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerBehaviourEvent>>> listEvents() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllEvents()));
    }

    @PostMapping("/events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerBehaviourEvent>> track(@RequestBody CustomerBehaviourEvent event) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.trackEvent(event)));
    }

    @PostMapping("/recommendations/{customerId}/generate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductRecommendation>>> generate(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.generateRecommendations(customerId)));
    }

    /** Returns all recommendations for a customer (all statuses). Used by the frontend for both the active panel and history table. */
    @GetMapping("/recommendations/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductRecommendation>>> getAll(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllRecommendations(customerId)));
    }

    /** Returns only PENDING recommendations (used for quick-action widgets). */
    @GetMapping("/recommendations/{customerId}/pending")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductRecommendation>>> getPending(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingRecommendations(customerId)));
    }

    @PostMapping("/recommendations/{id}/respond")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ProductRecommendation>> respond(@PathVariable Long id, @RequestParam boolean accepted) {
        return ResponseEntity.ok(ApiResponse.ok(service.respondToRecommendation(id, accepted)));
    }

    @GetMapping("/churn-score/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> churnScore(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getChurnScore(customerId)));
    }
}
