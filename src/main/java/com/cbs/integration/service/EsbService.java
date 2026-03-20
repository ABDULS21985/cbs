package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

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

    /**
     * Perform a real health check against the route's endpoint.
     * For HTTP/HTTPS routes an actual GET request is made; the route is only
     * marked HEALTHY on a 2xx response within the configured timeout.
     * Non-HTTP routes are marked UNKNOWN (not HEALTHY) until their health
     * check mechanisms are implemented.
     */
    @Transactional
    public IntegrationRoute healthCheck(String routeCode) {
        IntegrationRoute route = routeRepository.findByRouteCode(routeCode)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationRoute", "routeCode", routeCode));

        route.setLastHealthCheck(Instant.now());

        String protocol = route.getProtocol();
        if (("HTTP".equalsIgnoreCase(protocol) || "HTTPS".equalsIgnoreCase(protocol))
                && route.getEndpointUrl() != null && !route.getEndpointUrl().isBlank()) {
            try {
                RestTemplate restTemplate = buildRestTemplate(Math.min(resolveTimeoutMs(route, 5000), 5000));
                ResponseEntity<String> response = restTemplate.getForEntity(route.getEndpointUrl(), String.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    route.setHealthStatus("HEALTHY");
                    log.info("Health check HEALTHY: route={}, endpoint={}, status={}",
                            route.getRouteCode(), route.getEndpointUrl(), response.getStatusCode());
                } else {
                    route.setHealthStatus("DOWN");
                    log.warn("Health check DOWN: route={}, endpoint={}, status={}",
                            route.getRouteCode(), route.getEndpointUrl(), response.getStatusCode());
                }
            } catch (Exception e) {
                route.setHealthStatus("DOWN");
                log.warn("Health check failed: route={}, endpoint={}, error={}",
                        route.getRouteCode(), route.getEndpointUrl(), e.getMessage());
            }
        } else {
            // Non-HTTP protocols (JMS, Kafka, SFTP, etc.) — health check not implemented
            route.setHealthStatus("UNKNOWN");
            log.warn("Health check not implemented for protocol={} on route={}",
                    protocol, route.getRouteCode());
        }

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
        message = messageRepository.save(message);

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
            deliverMessage(message, route, payload);

            if ("FAILED".equals(message.getStatus()) || "DEAD_LETTER".equals(message.getStatus())) {
                sendToDeadLetter(
                        message,
                        route,
                        Optional.ofNullable(message.getErrorMessage()).orElse("Message delivery failed"),
                        payload
                );
            } else {
                message.setStatus("DELIVERED");
                message.setDeliveredAt(Instant.now());
            }
            message.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

            log.info("Message delivered: id={}, route={}, time={}ms", messageId, route.getRouteCode(), message.getProcessingTimeMs());
        } catch (Exception e) {
            message.setStatus("FAILED");
            message.setErrorMessage(e.getMessage());
            message.setProcessingTimeMs((int)(System.currentTimeMillis() - startTime));

            sendToDeadLetter(message, route, e.getMessage(), payload);
            log.error("Message failed: id={}, route={}, error={}", messageId, route.getRouteCode(), e.getMessage());
        }

        return messageRepository.save(message);
    }

    private void validateMessage(IntegrationMessage message, IntegrationRoute route) {
        if (route.getRateLimitPerSec() != null) {
            // Rate limiting requires a shared counter (e.g. Redis). Not yet implemented.
            log.debug("Rate limit check (not enforced): route={}, limit={}/sec", route.getRouteCode(), route.getRateLimitPerSec());
        }
    }

    private void applyTransformation(IntegrationMessage message, Map<String, Object> transformSpec) {
        // XSLT / JSONata transformation not yet implemented.
        log.debug("Transform spec present but not applied: messageId={}, spec keys={}", message.getMessageId(), transformSpec.keySet());
    }

    /**
     * Deliver a message to the target endpoint.
     *
     * HTTP/HTTPS: performs a real POST to route.endpointUrl and reflects the
     *             response status in the message status.
     * Other protocols (JMS, Kafka, SFTP, etc.): not yet implemented — message
     *             is moved to DEAD_LETTER so operators can inspect and re-route.
     */
    private void deliverMessage(IntegrationMessage message, IntegrationRoute route, String payload) {
        String protocol = route.getProtocol();

        if ("HTTP".equalsIgnoreCase(protocol) || "HTTPS".equalsIgnoreCase(protocol)) {
            if (route.getEndpointUrl() == null || route.getEndpointUrl().isBlank()) {
                message.setStatus("FAILED");
                message.setErrorMessage("Route " + route.getRouteCode() + " has no endpoint URL configured");
                log.error("No endpoint URL for HTTP route: {}", route.getRouteCode());
                return;
            }

            RestTemplate restTemplate = buildRestTemplate(resolveTimeoutMs(route, 30000));
            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_JSON);

            // Forward any message-level headers that are simple string values
            if (message.getHeaders() != null) {
                message.getHeaders().forEach((k, v) -> {
                    if (v instanceof String s && !"correlationId".equals(k)) {
                        httpHeaders.set(k, s);
                    }
                });
            }

            try {
                ResponseEntity<String> response = restTemplate.exchange(
                        route.getEndpointUrl(),
                        HttpMethod.POST,
                        new HttpEntity<>(payload, httpHeaders),
                        String.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    message.setStatus("DELIVERED");
                    log.info("HTTP delivery succeeded: messageId={}, route={}, httpStatus={}",
                            message.getMessageId(), route.getRouteCode(), response.getStatusCode());
                } else {
                    message.setStatus("FAILED");
                    message.setErrorMessage("HTTP " + response.getStatusCode() + ": " + response.getBody());
                    log.warn("HTTP delivery non-2xx: messageId={}, route={}, httpStatus={}",
                            message.getMessageId(), route.getRouteCode(), response.getStatusCode());
                }
            } catch (Exception e) {
                message.setStatus("FAILED");
                message.setErrorMessage(e.getMessage());
                log.error("HTTP delivery exception: messageId={}, route={}, error={}",
                        message.getMessageId(), route.getRouteCode(), e.getMessage());
            }

        } else {
            // JMS, Kafka, SFTP, AMQP, etc. — not implemented
            log.warn("Protocol {} not implemented for route {} — message {} moved to DEAD_LETTER",
                    protocol, route.getRouteCode(), message.getMessageId());
            message.setStatus("DEAD_LETTER");
            message.setErrorMessage("Protocol not implemented: " + protocol);
        }
    }

    // ── Dead Letter Queue ────────────────────────────────────

    @Transactional
    void sendToDeadLetter(IntegrationMessage message, IntegrationRoute route, String reason, String originalPayload) {
        Map<String, Object> retryPolicy = route.getRetryPolicy();
        int maxRetries = intValue(retryPolicy, "max_retries", 3);
        DeadLetterQueue dlq = DeadLetterQueue.builder()
                .messageId(message.getId()).routeId(route.getId())
                .failureReason(defaultFailureReason(reason))
                .originalPayload(originalPayload)
                .retryCount(0)
                .maxRetries(maxRetries)
                .nextRetryAt(calculateNextRetryAt(retryPolicy, 1))
                .build();
        dlqRepository.save(dlq);
    }

    /**
     * Retry pending dead-letter messages by re-loading the original message
     * and re-submitting it through the routing pipeline.
     */
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

            IntegrationMessage originalMessage = messageRepository.findById(dlq.getMessageId()).orElse(null);
            if (originalMessage == null) {
                dlq.setStatus("ABANDONED");
                dlq.setFailureReason("Original message not found");
                dlqRepository.save(dlq);
                log.warn("Message not found for DLQ entry dlqId={}, messageId={}", dlq.getId(), dlq.getMessageId());
                retried++;
                continue;
            }

            IntegrationRoute route = routeRepository.findById(dlq.getRouteId()).orElse(null);
            if (route == null) {
                dlq.setStatus("ABANDONED");
                dlq.setFailureReason("Route not found");
                dlqRepository.save(dlq);
                log.warn("Route not found for DLQ entry dlqId={}, routeId={}", dlq.getId(), dlq.getRouteId());
                retried++;
                continue;
            }

            String payload = dlq.getOriginalPayload() != null ? dlq.getOriginalPayload() : "";
            try {
                deliverMessage(originalMessage, route, payload);
                if ("DELIVERED".equals(originalMessage.getStatus())) {
                    originalMessage.setDeliveredAt(Instant.now());
                    messageRepository.save(originalMessage);
                    dlq.setStatus("RESOLVED");
                    dlq.setResolvedAt(Instant.now());
                    dlqRepository.save(dlq);
                    log.info("Dead-letter retry succeeded: dlqId={}, messageId={}", dlq.getId(), originalMessage.getMessageId());
                } else {
                    messageRepository.save(originalMessage);
                    rescheduleDeadLetter(dlq, route, originalMessage.getErrorMessage());
                    log.warn("Dead-letter retry still failed: dlqId={}, messageId={}, status={}",
                            dlq.getId(), originalMessage.getMessageId(), originalMessage.getStatus());
                }
            } catch (Exception e) {
                originalMessage.setStatus("FAILED");
                originalMessage.setErrorMessage(e.getMessage());
                messageRepository.save(originalMessage);
                rescheduleDeadLetter(dlq, route, e.getMessage());
                log.error("Dead-letter retry exception: dlqId={}, error={}", dlq.getId(), e.getMessage());
            }

            retried++;
        }
        if (retried > 0) log.info("Processed {} dead-letter retries", retried);
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
    public List<IntegrationMessage> getAllMessages() { return messageRepository.findAll(); }

    private String sha256(String input) {
        try {
            MessageDigest d = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(d.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private RestTemplate buildRestTemplate(int timeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);
        return new RestTemplate(requestFactory);
    }

    private int resolveTimeoutMs(IntegrationRoute route, int fallbackTimeoutMs) {
        Integer timeoutMs = route.getTimeoutMs();
        if (timeoutMs == null || timeoutMs <= 0) {
            return fallbackTimeoutMs;
        }
        return timeoutMs;
    }

    private void rescheduleDeadLetter(DeadLetterQueue dlq, IntegrationRoute route, String reason) {
        dlq.setFailureReason(defaultFailureReason(reason));
        if (dlq.getRetryCount() >= dlq.getMaxRetries()) {
            dlq.setStatus("ABANDONED");
            dlq.setNextRetryAt(null);
        } else {
            dlq.setStatus("PENDING");
            dlq.setNextRetryAt(calculateNextRetryAt(route.getRetryPolicy(), dlq.getRetryCount() + 1));
        }
        dlqRepository.save(dlq);
    }

    private Instant calculateNextRetryAt(Map<String, Object> retryPolicy, int attemptNumber) {
        int baseBackoffMs = intValue(retryPolicy, "backoff_ms", 1000);
        double multiplier = doubleValue(retryPolicy, "backoff_multiplier", 2.0d);
        double safeMultiplier = multiplier < 1.0d ? 1.0d : multiplier;
        long delayMs = Math.round(baseBackoffMs * Math.pow(safeMultiplier, Math.max(attemptNumber - 1, 0)));
        long boundedDelayMs = Math.max(1_000L, Math.min(delayMs, Integer.MAX_VALUE));
        return Instant.now().plus(boundedDelayMs, ChronoUnit.MILLIS);
    }

    private int intValue(Map<String, Object> values, String key, int fallback) {
        if (values == null) {
            return fallback;
        }
        Object value = values.get(key);
        return value instanceof Number number ? number.intValue() : fallback;
    }

    private double doubleValue(Map<String, Object> values, String key, double fallback) {
        if (values == null) {
            return fallback;
        }
        Object value = values.get(key);
        return value instanceof Number number ? number.doubleValue() : fallback;
    }

    private String defaultFailureReason(String reason) {
        return reason != null && !reason.isBlank() ? reason : "Message delivery failed";
    }
}
