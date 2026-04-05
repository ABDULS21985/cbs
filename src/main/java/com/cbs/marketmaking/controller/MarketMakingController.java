package com.cbs.marketmaking.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.marketmaking.entity.MarketMakingActivity;
import com.cbs.marketmaking.entity.MarketMakingMandate;
import com.cbs.marketmaking.service.MarketMakingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/market-making")
@RequiredArgsConstructor
@Tag(name = "Market Making", description = "Market maker mandate management and activity tracking")
public class MarketMakingController {

    private final MarketMakingService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketMakingMandate>> createMandate(@RequestBody MarketMakingMandate mandate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createMandate(mandate)));
    }

    @PostMapping("/{code}/activity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketMakingActivity>> recordDailyActivity(@PathVariable String code, @RequestBody MarketMakingActivity activity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordDailyActivity(code, activity)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketMakingMandate>>> getActiveMandates() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveMandates()));
    }

    @GetMapping("/{code}/performance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketMakingActivity>>> getMandatePerformance(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMandatePerformance(code)));
    }

    @GetMapping("/obligation-compliance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketMakingActivity>>> getObligationComplianceReport() {
        return ResponseEntity.ok(ApiResponse.ok(service.getObligationComplianceReport()));
    }

    @PostMapping("/{code}/suspend")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketMakingMandate>> suspendMandate(@PathVariable String code, @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.suspendMandate(code, reason)));
    }
}
