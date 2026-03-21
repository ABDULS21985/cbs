package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.WebhookDelivery;
import com.cbs.integration.entity.WebhookRegistration;
import com.cbs.integration.repository.WebhookDeliveryRepository;
import com.cbs.integration.repository.WebhookRegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class WebhookService {

    private final WebhookRegistrationRepository registrationRepository;
    private final WebhookDeliveryRepository deliveryRepository;

    // ── Registration CRUD ──────────────────────────────────────

    @Transactional
    public WebhookRegistration createWebhook(WebhookRegistration webhook) {
        if (webhook.getUrl() == null || webhook.getUrl().isBlank()) {
            throw new BusinessException("Webhook URL is required");
        }
        webhook.setWebhookId("WHK-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        if (webhook.getSecretHash() != null && !webhook.getSecretHash().isBlank()) {
            webhook.setSecretHash(hashSecret(webhook.getSecretHash()));
        }
        webhook.setStatus("ACTIVE");
        WebhookRegistration saved = registrationRepository.save(webhook);
        log.info("Webhook registered: id={}, url={}, events={}", saved.getWebhookId(), saved.getUrl(), saved.getEvents());
        return saved;
    }

    @Transactional
    public WebhookRegistration updateWebhook(Long id, String url, List<String> events, String authType, String status) {
        WebhookRegistration wh = registrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", "id", id));
        if (url != null) wh.setUrl(url);
        if (events != null) wh.setEvents(events);
        if (authType != null) wh.setAuthType(authType);
        if (status != null) wh.setStatus(status);
        wh.setUpdatedAt(Instant.now());
        return registrationRepository.save(wh);
    }

    @Transactional
    public void deleteWebhook(Long id) {
        WebhookRegistration wh = registrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", "id", id));
        registrationRepository.delete(wh);
        log.info("Webhook deleted: id={}", wh.getWebhookId());
    }

    public List<WebhookRegistration> listWebhooks(Long tppClientId) {
        if (tppClientId != null) {
            return registrationRepository.findByTppClientIdOrderByCreatedAtDesc(tppClientId);
        }
        return registrationRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── Deliveries ─────────────────────────────────────────────

    public List<WebhookDelivery> listDeliveries(Long webhookId, String statusFilter) {
        registrationRepository.findById(webhookId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", "id", webhookId));
        if (statusFilter != null && !statusFilter.isBlank()) {
            return deliveryRepository.findByWebhookIdAndStatusOrderByDeliveredAtDesc(webhookId, statusFilter);
        }
        return deliveryRepository.findByWebhookIdOrderByDeliveredAtDesc(webhookId);
    }

    @Transactional
    public WebhookDelivery retryDelivery(Long webhookId, Long deliveryId) {
        WebhookRegistration wh = registrationRepository.findById(webhookId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", "id", webhookId));
        WebhookDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookDelivery", "id", deliveryId));

        if (!delivery.getWebhookId().equals(webhookId)) {
            throw new BusinessException("Delivery does not belong to this webhook");
        }

        // Re-attempt delivery
        DeliveryResult result = attemptDelivery(wh, delivery.getEvent(), delivery.getRequestBody());
        delivery.setHttpStatus(result.httpStatus());
        delivery.setDurationMs(result.durationMs());
        delivery.setResponseBody(result.responseBody());
        delivery.setStatus(result.success() ? "SUCCESS" : "FAILED");
        delivery.setAttemptCount(delivery.getAttemptCount() + 1);
        delivery.setDeliveredAt(Instant.now());

        updateWebhookStats(wh, result.success());
        return deliveryRepository.save(delivery);
    }

    // ── Test Webhook ───────────────────────────────────────────

    @Transactional
    public Map<String, Object> testWebhook(Long webhookId, String event) {
        WebhookRegistration wh = registrationRepository.findById(webhookId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", "id", webhookId));

        String testPayload = buildTestPayload(event);
        DeliveryResult result = attemptDelivery(wh, event, testPayload);

        // Record the delivery
        WebhookDelivery delivery = WebhookDelivery.builder()
                .webhookId(webhookId).event(event)
                .requestBody(testPayload).responseBody(result.responseBody())
                .httpStatus(result.httpStatus()).durationMs(result.durationMs())
                .status(result.success() ? "SUCCESS" : "FAILED")
                .build();
        deliveryRepository.save(delivery);
        updateWebhookStats(wh, result.success());

        return Map.of(
                "success", result.success(),
                "statusCode", result.httpStatus(),
                "responseTimeMs", result.durationMs(),
                "message", result.success() ? "Webhook test successful" : "Webhook test failed: " + result.responseBody()
        );
    }

    // ── Internal Helpers ───────────────────────────────────────

    private record DeliveryResult(boolean success, int httpStatus, int durationMs, String responseBody) {}

    private DeliveryResult attemptDelivery(WebhookRegistration wh, String event, String payload) {
        long start = System.currentTimeMillis();
        try {
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(wh.getUrl()))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("X-Webhook-Event", event)
                    .header("X-Webhook-Id", wh.getWebhookId())
                    .POST(HttpRequest.BodyPublishers.ofString(payload != null ? payload : "{}"));

            if ("BEARER".equals(wh.getAuthType()) && wh.getSecretHash() != null) {
                reqBuilder.header("Authorization", "Bearer " + wh.getSecretHash());
            }

            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            HttpResponse<String> response = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int duration = (int) (System.currentTimeMillis() - start);
            boolean success = response.statusCode() >= 200 && response.statusCode() < 300;
            return new DeliveryResult(success, response.statusCode(), duration, response.body());
        } catch (java.net.http.HttpTimeoutException e) {
            int duration = (int) (System.currentTimeMillis() - start);
            return new DeliveryResult(false, 0, duration, "Timeout: " + e.getMessage());
        } catch (Exception e) {
            int duration = (int) (System.currentTimeMillis() - start);
            log.warn("Webhook delivery failed to {}: {}", wh.getUrl(), e.getMessage());
            return new DeliveryResult(false, 0, duration, "Error: " + e.getMessage());
        }
    }

    @Transactional
    private void updateWebhookStats(WebhookRegistration wh, boolean success) {
        wh.setTotalDeliveries((wh.getTotalDeliveries() != null ? wh.getTotalDeliveries() : 0) + 1);
        if (!success) {
            wh.setFailedDeliveries((wh.getFailedDeliveries() != null ? wh.getFailedDeliveries() : 0) + 1);
        }
        wh.recalculateSuccessRate();
        wh.setLastDeliveredAt(Instant.now());
        wh.setUpdatedAt(Instant.now());
        registrationRepository.save(wh);
    }

    private String buildTestPayload(String event) {
        return """
                {"event":"%s","timestamp":"%s","data":{"test":true,"message":"Test webhook delivery from CBS"}}
                """.formatted(event, Instant.now().toString()).trim();
    }

    private String hashSecret(String secret) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash secret", e);
        }
    }
}
