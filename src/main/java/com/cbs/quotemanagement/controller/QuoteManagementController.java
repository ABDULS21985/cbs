package com.cbs.quotemanagement.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.quotemanagement.entity.PriceQuote;
import com.cbs.quotemanagement.entity.QuoteRequest;
import com.cbs.quotemanagement.service.QuoteManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/quotes")
@RequiredArgsConstructor
@Tag(name = "Quote Management", description = "Price quote and quote request management")
public class QuoteManagementController {

    private final QuoteManagementService quoteManagementService;

    @PostMapping("/requests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<QuoteRequest>> submitRequest(@RequestBody QuoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(quoteManagementService.submitQuoteRequest(request)));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PriceQuote>> generateQuote(@RequestParam Long requestId, @RequestBody PriceQuote quote) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(quoteManagementService.generateQuote(requestId, quote)));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PriceQuote>> acceptQuote(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(quoteManagementService.acceptQuote(id)));
    }

    @PostMapping("/expire-stale")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> expireStaleQuotes() {
        return ResponseEntity.ok(ApiResponse.ok(quoteManagementService.expireQuotes()));
    }

    @GetMapping("/active/{deskId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PriceQuote>>> getActiveQuotes(@PathVariable Long deskId) {
        return ResponseEntity.ok(ApiResponse.ok(quoteManagementService.getActiveQuotes(deskId)));
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<QuoteRequest>>> getQuoteRequests(@RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(quoteManagementService.getQuoteRequests(status)));
    }
}
