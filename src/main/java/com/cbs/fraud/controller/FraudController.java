package com.cbs.fraud.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.fraud.entity.*;
import com.cbs.fraud.repository.FraudAlertRepository;
import com.cbs.fraud.service.FraudDetectionService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/fraud") @RequiredArgsConstructor
@Tag(name = "Fraud Detection", description = "Rule-based scoring, alert management, investigation workflow")
public class FraudController {

    private final FraudDetectionService fraudService;
    private final FraudAlertRepository fraudAlertRepository;

    @PostMapping("/score")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FraudAlert>> score(
            @RequestParam Long customerId, @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) String transactionRef, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String channel, @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String ipAddress, @RequestParam(required = false) String geoLocation,
            @RequestBody(required = false) Map<String, Object> context) {
        FraudAlert alert = fraudService.scoreTransaction(customerId, accountId, transactionRef, amount,
                channel, deviceId, ipAddress, geoLocation, context != null ? context : Map.of());
        return ResponseEntity.ok(ApiResponse.ok(alert));
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FraudRule>> createRule(@RequestBody FraudRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(fraudService.createRule(rule)));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FraudRule>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(fraudService.getAllActiveRules()));
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FraudAlert>>> getAlerts(@RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (status == null) {
            Page<FraudAlert> result = fraudAlertRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
            return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
        }
        Page<FraudAlert> result = fraudService.getAlertsByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/alerts/{id}/assign")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FraudAlert>> assign(@PathVariable Long id, @RequestParam String assignedTo) {
        return ResponseEntity.ok(ApiResponse.ok(fraudService.assignAlert(id, assignedTo)));
    }

    @PostMapping("/alerts/{id}/resolve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FraudAlert>> resolve(@PathVariable Long id,
            @RequestParam String resolution, @RequestParam String resolvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(fraudService.resolveAlert(id, resolution, resolvedBy)));
    }

    // List all fraud alerts
    @GetMapping
    @Operation(summary = "List all fraud alerts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FraudAlert>>> listAlerts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FraudAlert> result = fraudAlertRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get fraud alert statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", fraudAlertRepository.count(),
                "new", fraudAlertRepository.countByStatus("NEW"),
                "investigating", fraudAlertRepository.countByStatus("INVESTIGATING"),
                "resolved", fraudAlertRepository.countByStatus("RESOLVED")
        )));
    }

    @GetMapping("/trend")
    @Operation(summary = "Get fraud alert trend data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrend(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<FraudAlert> result = fraudAlertRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", fraudAlertRepository.count(),
                "recentAlerts", result.getContent()
        )));
    }

    @GetMapping("/model-performance")
    @Operation(summary = "Get fraud model performance metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getModelPerformance() {
        long total = fraudAlertRepository.count();
        long resolved = fraudAlertRepository.countByStatus("RESOLVED");
        long falsePositives = fraudAlertRepository.countByStatus("FALSE_POSITIVE");
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalAlerts", total,
                "resolvedAlerts", resolved,
                "falsePositives", falsePositives,
                "detectionRate", total > 0 ? (double) resolved / total : 0.0,
                "falsePositiveRate", total > 0 ? (double) falsePositives / total : 0.0
        )));
    }
}
