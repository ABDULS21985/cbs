package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class EsbService {

    private final IntegrationRouteRepository routeRepository;
    private final IntegrationMessageRepository messageRepository;
    private final DeadLetterQueueRepository dlqRepository;

    // ── Route Management ─────────────────────────────────────

    @Transactional
    public IntegrationRoute createRoute(IntegrationRoute route) {
        routeRepository.findByRouteCode(route.getRouteCode()).ifPresent(r -> {
            throw new BusinessException("Route code already exists: " + route.getRouteCode());
        });
        if (route.getRetryPolicy() == null) {
            route.setRetryPolicy(Map.of("max_retries", 3, "backoff_ms", 1000, "backoff_multiplier", 2));
        }
        if (route.getCircuitBreaker() == null) {
            route.setCircuitBreaker(Map.of("failure_threshold", 5, "reset_timeout_ms", 30000));
        }
        IntegrationRoute saved = routeRepository.save(route);
        log.info("Integration route created: code={}, {}→{} via {}", saved.getRouteCode(),
                saved.getSourceSystem(), saved.getTargetSystem(), saved.getProtocol());
        return saved;
    }

    @Transactional
    public IntegrationRoute healthCheck(String routeCode) {
        IntegrationRoute route = routeRepository.findByRouteCode(routeCode)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationRoute", "routeCode", routeCode));
        // In production: actually ping the endpoint
        route.setLastHealthCheck(Instant.now());
        route.setHealthStatus("HEALTHY");
        return routeRepository.save(route);
    }

    public List<IntegrationRoute> getActiveRoutes() { return routeRepository.findByIsActiveTrueOrderByRouteNameAsc(); }
    public List<IntegrationRoute> getUnhealthyRoutes() { return routeRepository.findByHealthStatus("DOWN"); }

    // ── Message Processing Pipeline ──────────────────────────

    @Transactional
    public IntegrationMessage sendMessage(Long routeId, String messageType, String contentType,
                                          Map<String, Object> headers, String payload) {
        IntegrationRoute route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationRoute", "id", routeId));

        if (!"HEALTHY".equals(route.getHealthStatus()) && !"UNKNOWN".equals(route.getHealthStatus())) {
            // Circuit breaker: check if route is down
            throw new BusinessException("Route " + route.getRouteCode() + " is " + route.getHealthStatus() + " — circuit open");
        }

        // Idempotency check via payload hash
        String payloadHash = sha256(payload != null ? payload : "");
        Optional<IntegrationMessage> duplicate = messageRepository.findByPayloadHash(payloadHash);
        if (duplicate.isPresent() && "DELIVERED".equals(duplicate.get().getStatus())) {
            log.info("Duplicate message detected: hash={}, returning existing", payloadHash);
            return duplicate.get();
        }

        String messageId = "MSG-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        String correlationId = headers != null && headers.containsKey("correlationId")
                ? headers.get("correlationId").toString()
                : messageId;

        IntegrationMessage message = IntegrationMessage.builder()
                .messageId(messageId).routeId(routeId).correlationId(correlationId)
                .direction("OUTBOUND").messageType(messageType).contentType(contentType)
                .payloadHash(payloadHash).payloadSizeBytes(payload != null ? (long) payload.length() : 0)
                .headers(headers).status("RECEIVED").build();

        long startTime = System.currentTimeMillis();
        try {
            // Step 1: Validate
            message.setStatus("VALIDATING");
            validateMessage(message, route);

            // Step 2: Transform (if transform spec exists)
            message.setStatus("TRANSFORMING");
            if (route.getTransformSpec() != null && !route.getTransformSpec().isEmpty()) {
                applyTransformation(message, route.getTransformSpec());
            }

            // Step 3: Route/Deliver
            message.setStatus("ROUTING");
            deliverMessage(message, route);

            message.setStatus("DELIVERED");
            message.setDeliveredAt(Instant.now());
            message.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

            log.info("Message delivered: id={}, route={}, time={}ms", messageId, route.getRouteCode(), message.getProcessingTimeMs());
        } catch (Exception e) {
            message.setStatus("FAILED");
            message.setErrorMessage(e.getMessage());
            message.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

            // Send to dead letter queue
            sendToDeadLetter(message, route, e.getMessage());
            log.error("Message failed: id={}, route={}, error={}", messageId, route.getRouteCode(), e.getMessage());
        }

        return messageRepository.save(message);
    }

    private void validateMessage(IntegrationMessage message, IntegrationRoute route) {
        if (route.getRateLimitPerSec() != null) {
            // In production: check Redis rate counter
            log.debug("Rate limit check: route={}, limit={}/sec", route.getRouteCode(), route.getRateLimitPerSec());
        }
    }

    private void applyTransformation(IntegrationMessage message, Map<String, Object> transformSpec) {
        // In production: apply XSLT, JSONata, or field mapping based on transformSpec
        log.debug("Transform applied: messageId={}, spec keys={}", message.getMessageId(), transformSpec.keySet());
    }

    private void deliverMessage(IntegrationMessage message, IntegrationRoute route) {
        // In production: HTTP call, Kafka produce, JMS send, SFTP upload, etc. based on route.protocol
        log.debug("Delivering: messageId={}, protocol={}, endpoint={}", message.getMessageId(),
                route.getProtocol(), route.getEndpointUrl());
    }

    // ── Dead Letter Queue ────────────────────────────────────

    @Transactional
    void sendToDeadLetter(IntegrationMessage message, IntegrationRoute route, String reason) {
        @SuppressWarnings("unchecked")
        Map<String, Object> retryPolicy = route.getRetryPolicy();
        int maxRetries = retryPolicy != null ? ((Number) retryPolicy.getOrDefault("max_retries", 3)).intValue() : 3;
        int backoffMs = retryPolicy != null ? ((Number) retryPolicy.getOrDefault("backoff_ms", 1000)).intValue() : 1000;

        DeadLetterQueue dlq = DeadLetterQueue.builder()
                .messageId(message.getId()).routeId(route.getId())
                .failureReason(reason).retryCount(0).maxRetries(maxRetries)
                .nextRetryAt(Instant.now().plus(backoffMs, ChronoUnit.MILLIS)).build();
        dlqRepository.save(dlq);
    }

    @Transactional
    public int retryDeadLetters() {
        List<DeadLetterQueue> pending = dlqRepository.findByStatusOrderByCreatedAtAsc("PENDING");
        int retried = 0;
        for (DeadLetterQueue dlq : pending) {
            if (dlq.getNextRetryAt() != null && Instant.now().isBefore(dlq.getNextRetryAt())) continue;
            if (dlq.getRetryCount() >= dlq.getMaxRetries()) {
                dlq.setStatus("ABANDONED");
                dlqRepository.save(dlq);
                continue;
            }
            dlq.setRetryCount(dlq.getRetryCount() + 1);
            dlq.setStatus("RETRYING");
            dlqRepository.save(dlq);
            // In production: re-submit the original message
            retried++;
        }
        if (retried > 0) log.info("Retried {} dead-letter messages", retried);
        return retried;
    }

    @Transactional
    public DeadLetterQueue resolveDeadLetter(Long dlqId, String resolvedBy) {
        DeadLetterQueue dlq = dlqRepository.findById(dlqId)
                .orElseThrow(() -> new ResourceNotFoundException("DeadLetterQueue", "id", dlqId));
        dlq.setStatus("RESOLVED");
        dlq.setResolvedBy(resolvedBy);
        dlq.setResolvedAt(Instant.now());
        return dlqRepository.save(dlq);
    }

    public long getDeadLetterCount() { return dlqRepository.countByStatus("PENDING"); }

    private String sha256(String input) {
        try {
            MessageDigest d = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(d.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new RuntimeException(e); }
    }
}
