package com.cbs.marketdata.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.marketdata.dto.MarketDataFeedDto;
import com.cbs.marketdata.dto.MarketPriceDto;
import com.cbs.marketdata.dto.MarketSignalDto;
import com.cbs.marketdata.entity.*; import com.cbs.marketdata.service.MarketDataService;
import com.cbs.marketdata.repository.FeedOperationLogRepository;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List; import java.util.Map;
@RestController @RequestMapping("/v1/market-data") @RequiredArgsConstructor
@Tag(name = "Market Data", description = "Feeds, prices, signals, research publications")
@Transactional(readOnly = true)
public class MarketDataController {
    private final MarketDataService service;
    private final FxRateRepository fxRateRepository;
    private final FeedOperationLogRepository feedOperationLogRepository;

    @GetMapping("/feeds") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketDataFeedDto>>> listFeeds() { return ResponseEntity.ok(ApiResponse.ok(service.getFeedStatus().stream().map(MarketDataFeedDto::from).toList())); }
    @PostMapping("/feeds") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketDataFeedDto>> registerFeed(@RequestBody MarketDataFeed feed) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(MarketDataFeedDto.from(service.registerFeed(feed)))); }
    @GetMapping("/prices") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketPriceDto>>> listPrices() { return ResponseEntity.ok(ApiResponse.ok(service.getAllPrices().stream().map(MarketPriceDto::from).toList())); }
    @PostMapping("/prices") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarketPriceDto>> recordPrice(@RequestBody MarketPrice price) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(MarketPriceDto.from(service.recordPrice(price)))); }
    @GetMapping("/signals") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketSignalDto>>> listSignals() { return ResponseEntity.ok(ApiResponse.ok(service.getAllSignals().stream().map(MarketSignalDto::from).toList())); }
    @PostMapping("/signals") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketSignalDto>> recordSignal(@RequestBody MarketSignal signal) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(MarketSignalDto.from(service.recordSignal(signal)))); }
    @GetMapping("/research") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ResearchPublication>>> listResearch() { return ResponseEntity.ok(ApiResponse.ok(service.getPublishedResearch())); }
    @PostMapping("/research") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ResearchPublication>> publishResearch(@RequestBody ResearchPublication pub) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.publishResearch(pub))); }
    @GetMapping("/prices/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketPriceDto>>> getLatestPrice(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getLatestPrice(instrumentCode).stream().map(MarketPriceDto::from).toList())); }
    @GetMapping("/signals/{instrumentCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketSignalDto>>> getSignals(@PathVariable String instrumentCode) { return ResponseEntity.ok(ApiResponse.ok(service.getSignals(instrumentCode).stream().map(MarketSignalDto::from).toList())); }
    @GetMapping("/research/published") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ResearchPublication>>> getPublished() { return ResponseEntity.ok(ApiResponse.ok(service.getPublishedResearch())); }
    @GetMapping("/feeds/status") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketDataFeedDto>>> getFeedStatus() { return ResponseEntity.ok(ApiResponse.ok(service.getFeedStatus().stream().map(MarketDataFeedDto::from).toList())); }

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
    public ResponseEntity<ApiResponse<List<MarketPriceDto>>> getMoneyMarketRates() {
        List<MarketPrice> allPrices = service.getAllPrices();
        List<MarketPriceDto> moneyMarket = allPrices.stream()
                .filter(p -> {
                    String code = p.getInstrumentCode() != null ? p.getInstrumentCode().toUpperCase() : "";
                    String type = p.getPriceType() != null ? p.getPriceType() : "";
                    return code.contains("OBB") || code.contains("CALL") || code.contains("O/N")
                            || code.contains("OVERNIGHT") || code.contains("NIBOR")
                            || code.contains("LIBOR") || code.contains("SOFR")
                            || code.contains("MONEY_MARKET") || code.contains("MM_")
                            || "MONEY_MARKET".equalsIgnoreCase(type);
                })
                .map(MarketPriceDto::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(moneyMarket));
    }

    @GetMapping("/feeds/{feedId}/operations")
    @Operation(summary = "Get operation logs for a specific feed")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FeedOperationLog>>> getFeedOperationLogs(
            @PathVariable Long feedId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<FeedOperationLog> result = feedOperationLogRepository.findByFeedIdOrderByTimestampDesc(feedId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
