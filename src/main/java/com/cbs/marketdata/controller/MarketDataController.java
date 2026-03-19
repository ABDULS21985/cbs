package com.cbs.marketdata.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.marketdata.entity.*; import com.cbs.marketdata.service.MarketDataService;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List; import java.util.Map;
@RestController @RequestMapping("/v1/market-data") @RequiredArgsConstructor
@Tag(name = "Market Data", description = "Feeds, prices, signals, research publications")
public class MarketDataController {
    private final MarketDataService service;
    private final FxRateRepository fxRateRepository;

    @GetMapping("/feeds") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketDataFeed>>> listFeeds() { return ResponseEntity.ok(ApiResponse.ok(service.getFeedStatus())); }
    @PostMapping("/feeds") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketDataFeed>> registerFeed(@RequestBody MarketDataFeed feed) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerFeed(feed))); }
    @GetMapping("/prices") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketPrice>>> listPrices() { return ResponseEntity.ok(ApiResponse.ok(service.getAllPrices())); }
    @PostMapping("/prices") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarketPrice>> recordPrice(@RequestBody MarketPrice price) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordPrice(price))); }
    @PostMapping("/signals") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketSignal>> recordSignal(@RequestBody MarketSignal signal) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordSignal(signal))); }
    @GetMapping("/research") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ResearchPublication>>> listResearch() { return ResponseEntity.ok(ApiResponse.ok(service.getPublishedResearch())); }
    @PostMapping("/research") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ResearchPublication>> publishResearch(@RequestBody ResearchPublication pub) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.publishResearch(pub))); }
    @GetMapping("/prices/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketPrice>>> getLatestPrice(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getLatestPrice(instrumentCode))); }
    @GetMapping("/signals/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketSignal>>> getSignals(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getSignals(instrumentCode))); }
    @GetMapping("/research/published") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ResearchPublication>>> getPublished() { return ResponseEntity.ok(ApiResponse.ok(service.getPublishedResearch())); }
    @GetMapping("/feeds/status") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketDataFeed>>> getFeedStatus() { return ResponseEntity.ok(ApiResponse.ok(service.getFeedStatus())); }

    @GetMapping("/fx-rates")
    @Operation(summary = "Get live FX rate board data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<FxRate>>> getFxRates() {
        List<FxRate> rates = fxRateRepository.findByRateDateAndIsActiveTrue(LocalDate.now());
        if (rates.isEmpty()) {
            rates = fxRateRepository.findAll().stream()
                    .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(rates));
    }

    @GetMapping("/money-market")
    @Operation(summary = "Get money market rates (OBB, O/N, call, etc.)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<MarketPrice>>> getMoneyMarketRates() {
        List<MarketPrice> allPrices = service.getAllPrices();
        List<MarketPrice> moneyMarket = allPrices.stream()
                .filter(p -> {
                    String code = p.getInstrumentCode().toUpperCase();
                    return code.contains("OBB") || code.contains("CALL") || code.contains("O/N")
                            || code.contains("OVERNIGHT") || code.contains("NIBOR")
                            || code.contains("LIBOR") || code.contains("SOFR")
                            || code.contains("MONEY_MARKET") || code.contains("MM_")
                            || "MONEY_MARKET".equalsIgnoreCase(p.getPriceType());
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(moneyMarket));
    }
}
