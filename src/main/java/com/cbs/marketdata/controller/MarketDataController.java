package com.cbs.marketdata.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.marketdata.entity.*; import com.cbs.marketdata.service.MarketDataService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/market-data") @RequiredArgsConstructor
@Tag(name = "Market Data", description = "Feeds, prices, signals, research publications")
public class MarketDataController {
    private final MarketDataService service;
    @PostMapping("/feeds") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketDataFeed>> registerFeed(@RequestBody MarketDataFeed feed) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerFeed(feed))); }
    @PostMapping("/prices") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarketPrice>> recordPrice(@RequestBody MarketPrice price) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordPrice(price))); }
    @PostMapping("/signals") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketSignal>> recordSignal(@RequestBody MarketSignal signal) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordSignal(signal))); }
    @PostMapping("/research") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ResearchPublication>> publishResearch(@RequestBody ResearchPublication pub) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.publishResearch(pub))); }
    @GetMapping("/prices/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketPrice>>> getLatestPrice(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getLatestPrice(instrumentCode))); }
    @GetMapping("/signals/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketSignal>>> getSignals(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getSignals(instrumentCode))); }
    @GetMapping("/research/published") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ResearchPublication>>> getPublished() { return ResponseEntity.ok(ApiResponse.ok(service.getPublishedResearch())); }
    @GetMapping("/feeds/status") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketDataFeed>>> getFeedStatus() { return ResponseEntity.ok(ApiResponse.ok(service.getFeedStatus())); }
}
