package com.cbs.integration.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.integration.entity.WebhookDelivery;
import com.cbs.integration.entity.WebhookRegistration;
import com.cbs.integration.service.WebhookService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/marketplace/webhooks") @RequiredArgsConstructor
@Tag(name = "Webhook Management", description = "Register, manage, and test webhook endpoints for real-time Open Banking event delivery")
public class WebhookController {

    private final WebhookService webhookService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WebhookRegistration>>> listWebhooks(
            @RequestParam(required = false) Long tppClientId) {
        return ResponseEntity.ok(ApiResponse.ok(webhookService.listWebhooks(tppClientId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WebhookRegistration>> createWebhook(@RequestBody WebhookRegistration webhook) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(webhookService.createWebhook(webhook)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WebhookRegistration>> updateWebhook(
            @PathVariable Long id,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) List<String> events,
            @RequestParam(required = false) String authType,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(webhookService.updateWebhook(id, url, events, authType, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteWebhook(@PathVariable Long id) {
        webhookService.deleteWebhook(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Webhook deleted"));
    }

    @GetMapping("/{webhookId}/deliveries")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WebhookDelivery>>> listDeliveries(
            @PathVariable Long webhookId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(webhookService.listDeliveries(webhookId, status)));
    }

    @PostMapping("/{webhookId}/deliveries/{deliveryId}/retry")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WebhookDelivery>> retryDelivery(
            @PathVariable Long webhookId, @PathVariable Long deliveryId) {
        return ResponseEntity.ok(ApiResponse.ok(webhookService.retryDelivery(webhookId, deliveryId)));
    }

    @PostMapping("/{webhookId}/test")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testWebhook(
            @PathVariable Long webhookId, @RequestBody Map<String, String> body) {
        String event = body.getOrDefault("event", "test.ping");
        return ResponseEntity.ok(ApiResponse.ok(webhookService.testWebhook(webhookId, event)));
    }
}
