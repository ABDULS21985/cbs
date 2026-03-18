package com.cbs.tradingbook.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tradingbook.entity.TradingBook;
import com.cbs.tradingbook.entity.TradingBookSnapshot;
import com.cbs.tradingbook.service.TradingBookService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/trading-books")
@RequiredArgsConstructor
@Tag(name = "Trading Book", description = "Trading book oversight and snapshot management")
public class TradingBookController {

    private final TradingBookService tradingBookService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingBook>> createBook(@RequestBody TradingBook book) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tradingBookService.createBook(book)));
    }

    @PostMapping("/{id}/snapshot")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingBookSnapshot>> takeSnapshot(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tradingBookService.takeEodSnapshot(id)));
    }

    @GetMapping("/{id}/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBookDashboard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradingBookService.getBookDashboard(id)));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradingBookSnapshot>>> getBookHistory(
            @PathVariable Long id, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(tradingBookService.getBookHistory(id, from, to)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradingBook>>> getAllBooks() {
        return ResponseEntity.ok(ApiResponse.ok(tradingBookService.getAllBooks()));
    }

    @GetMapping("/{id}/capital")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getCapitalRequirement(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradingBookService.getCapitalRequirement(id)));
    }
}
