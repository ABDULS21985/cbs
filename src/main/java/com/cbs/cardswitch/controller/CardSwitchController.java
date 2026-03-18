package com.cbs.cardswitch.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.service.CardSwitchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/card-switch") @RequiredArgsConstructor
@Tag(name = "Card Transaction Switch", description = "Authorization, clearing, settlement message routing")
public class CardSwitchController {
    private final CardSwitchService service;

    @PostMapping("/process") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CardSwitchTransaction>> process(@RequestBody CardSwitchTransaction txn) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.processTransaction(txn)));
    }
    @GetMapping("/scheme/{scheme}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CardSwitchTransaction>>> getByScheme(@PathVariable String scheme, @RequestParam Instant from, @RequestParam Instant to) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByScheme(scheme, from, to)));
    }
    @GetMapping("/merchant/{merchantId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CardSwitchTransaction>>> getByMerchant(@PathVariable String merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByMerchant(merchantId)));
    }
    @GetMapping("/declines") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CardSwitchTransaction>>> getDeclines() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDeclines()));
    }
    @GetMapping("/scheme/{scheme}/stats/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats(@PathVariable String scheme, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(service.getStatsByScheme(scheme, date)));
    }
}
