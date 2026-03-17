package com.cbs.integration.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.integration.entity.*;
import com.cbs.integration.service.EsbService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/integration/esb") @RequiredArgsConstructor
@Tag(name = "Enterprise Service Bus", description = "Integration route management, message processing pipeline, dead-letter queue, circuit breaker")
public class EsbController {

    private final EsbService esbService;

    @PostMapping("/routes")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IntegrationRoute>> createRoute(@RequestBody IntegrationRoute route) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(esbService.createRoute(route)));
    }

    @GetMapping("/routes")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IntegrationRoute>>> getRoutes() {
        return ResponseEntity.ok(ApiResponse.ok(esbService.getActiveRoutes()));
    }

    @PostMapping("/routes/{routeCode}/health-check")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IntegrationRoute>> healthCheck(@PathVariable String routeCode) {
        return ResponseEntity.ok(ApiResponse.ok(esbService.healthCheck(routeCode)));
    }

    @PostMapping("/messages")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IntegrationMessage>> sendMessage(
            @RequestParam Long routeId, @RequestParam String messageType,
            @RequestParam(defaultValue = "application/json") String contentType,
            @RequestBody String payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                esbService.sendMessage(routeId, messageType, contentType, null, payload)));
    }

    @PostMapping("/dlq/retry")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> retryDeadLetters() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("retried", esbService.retryDeadLetters())));
    }

    @PostMapping("/dlq/{id}/resolve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DeadLetterQueue>> resolve(@PathVariable Long id, @RequestParam String resolvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(esbService.resolveDeadLetter(id, resolvedBy)));
    }

    @GetMapping("/dlq/count")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> dlqCount() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("pending", esbService.getDeadLetterCount())));
    }
}
