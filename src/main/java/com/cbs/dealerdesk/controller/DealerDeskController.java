package com.cbs.dealerdesk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.dealerdesk.entity.DealingDesk;
import com.cbs.dealerdesk.entity.DeskDealer;
import com.cbs.dealerdesk.entity.DeskPnl;
import com.cbs.dealerdesk.service.DealerDeskService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/dealer-desks")
@RequiredArgsConstructor
@Tag(name = "Dealer Desk", description = "Dealing desk management and P&L tracking")
public class DealerDeskController {

    private final DealerDeskService dealerDeskService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DealingDesk>> createDesk(@RequestBody DealingDesk desk) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dealerDeskService.createDesk(desk)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DealingDesk>>> getActiveDesks() {
        return ResponseEntity.ok(ApiResponse.ok(dealerDeskService.getActiveDesks()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeskDashboard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(dealerDeskService.getDeskDashboard(id)));
    }

    @GetMapping("/{id}/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeskDashboardExplicit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(dealerDeskService.getDeskDashboard(id)));
    }

    @PostMapping("/{id}/dealers")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DeskDealer>> authorizeDealer(@PathVariable Long id, @RequestBody DeskDealer dealer) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dealerDeskService.authorizeDealer(id, dealer)));
    }

    @DeleteMapping("/{id}/dealers/{dealerId}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DeskDealer>> revokeDealer(@PathVariable Long id, @PathVariable Long dealerId) {
        return ResponseEntity.ok(ApiResponse.ok(dealerDeskService.revokeDealer(dealerId)));
    }

    @PostMapping("/{id}/pnl")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DeskPnl>> recordPnl(@PathVariable Long id, @RequestBody DeskPnl pnl) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dealerDeskService.recordDailyPnl(id, pnl)));
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DealingDesk>> suspendDesk(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(dealerDeskService.suspendDesk(id)));
    }
}
