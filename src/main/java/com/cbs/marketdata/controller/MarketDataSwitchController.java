package com.cbs.marketdata.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.marketdata.dto.FeedQualityMetricDto;
import com.cbs.marketdata.dto.SwitchDashboardDto;
import com.cbs.marketdata.entity.MarketDataSubscription;
import com.cbs.marketdata.entity.MarketDataSwitch;
import com.cbs.marketdata.service.MarketDataSwitchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/market-data-switch")
@RequiredArgsConstructor
@Tag(name = "Market Data Switch", description = "Market data aggregation, distribution, and quality monitoring")
public class MarketDataSwitchController {

    private final MarketDataSwitchService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketDataSwitch>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSwitchDashboard()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketDataSwitch>> registerSwitch(@RequestBody MarketDataSwitch mds) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerSwitch(mds)));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketDataSwitch>> startSwitch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.startSwitch(id)));
    }

    @PostMapping("/{id}/stop")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketDataSwitch>> stopSwitch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.stopSwitch(id)));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketDataSubscription>>> listSubscriptions() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSubscriptionHealth()));
    }

    @PostMapping("/subscriptions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketDataSubscription>> addSubscription(@RequestBody MarketDataSubscription subscription) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addSubscription(subscription)));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SwitchDashboardDto>> getSwitchDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(SwitchDashboardDto.from(service.getSwitchDashboard())));
    }

    @GetMapping("/subscriptions/health")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketDataSubscription>>> getSubscriptionHealth() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSubscriptionHealth()));
    }

    @GetMapping("/feed-quality")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FeedQualityMetricDto>>> getFeedQualityReport(
            @RequestParam(required = false) Long feedId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = LocalDate.now().minusMonths(1);
        if (to == null) to = LocalDate.now();
        if (feedId == null) {
            // Return latest metric per feed across all feeds for the dashboard overview
            return ResponseEntity.ok(ApiResponse.ok(service.getAllFeedQualityMetrics(from, to).stream().map(FeedQualityMetricDto::from).toList()));
        }
        return ResponseEntity.ok(ApiResponse.ok(service.getFeedQualityReport(feedId, from, to).stream().map(FeedQualityMetricDto::from).toList()));
    }
}
