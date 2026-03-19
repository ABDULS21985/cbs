package com.cbs.tradeops.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tradeops.entity.ClearingSubmission;
import com.cbs.tradeops.entity.OrderAllocation;
import com.cbs.tradeops.entity.TradeConfirmation;
import com.cbs.tradeops.entity.TradeReport;
import com.cbs.tradeops.service.TradeOpsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/trade-ops")
@RequiredArgsConstructor
@Tag(name = "Trade Operations", description = "Trade confirmation, allocation, reporting, and clearing")
public class TradeOpsController {

    private final TradeOpsService service;

    @GetMapping("/confirmations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradeConfirmation>>> listConfirmations() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllConfirmations()));
    }

    @GetMapping("/confirmations/match")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradeConfirmation>>> getMatchInfo() {
        return ResponseEntity.ok(ApiResponse.ok(service.getUnmatched()));
    }

    @GetMapping("/allocations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OrderAllocation>>> listAllocations() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllAllocations()));
    }

    @GetMapping("/clearing")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ClearingSubmission>>> listClearing() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllClearingSubmissions()));
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradeReport>>> listReports() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllReports()));
    }

    @PostMapping("/confirmations")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradeConfirmation>> submitConfirmation(@RequestBody TradeConfirmation confirmation) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitConfirmation(confirmation)));
    }

    @PostMapping("/confirmations/match")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<TradeConfirmation>>> matchConfirmation(@RequestParam String refA, @RequestParam String refB) {
        return ResponseEntity.ok(ApiResponse.ok(service.matchConfirmation(refA, refB)));
    }

    @PostMapping("/allocations")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OrderAllocation>> allocateOrder(@RequestBody OrderAllocation allocation) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.allocateOrder(allocation)));
    }

    @PostMapping("/reports")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradeReport>> submitTradeReport(@RequestBody TradeReport report) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitTradeReport(report)));
    }

    @PostMapping("/clearing")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ClearingSubmission>> submitForClearing(@RequestBody ClearingSubmission submission) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitForClearing(submission)));
    }

    @GetMapping("/confirmations/unmatched")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradeConfirmation>>> getUnmatched() {
        return ResponseEntity.ok(ApiResponse.ok(service.getUnmatched()));
    }

    @GetMapping("/clearing/pending")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ClearingSubmission>>> getPendingClearing() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingClearing()));
    }
}
