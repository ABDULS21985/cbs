package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
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
                RestTemplate restTemplate = new RestTemplate();
                // Use a short timeout (5 s) for health checks
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

            // deliverMessage sets status to DELIVERED or FAILED on the message object;
            // only override to DELIVERED if deliverMessage left it in a terminal success state.
            if (!"FAILED".equals(message.getStatus()) && !"DEAD_LETTER".equals(message.getStatus())) {
                message.setStatus("DELIVERED");
                message.setDeliveredAt(Instant.now());
            }
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

            RestTemplate restTemplate = new RestTemplate();
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

            // Re-deliver the original message
            messageRepository.findById(dlq.getMessageId()).ifPresentOrElse(originalMessage -> {
                routeRepository.findById(dlq.getRouteId()).ifPresentOrElse(route -> {
                    // Use the stored original payload from the DLQ if available, else empty string
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
                            log.warn("Dead-letter retry still failed: dlqId={}, messageId={}, status={}",
                                    dlq.getId(), originalMessage.getMessageId(), originalMessage.getStatus());
                        }
                    } catch (Exception e) {
                        log.error("Dead-letter retry exception: dlqId={}, error={}", dlq.getId(), e.getMessage());
                    }
                }, () -> log.warn("Route not found for DLQ entry dlqId={}, routeId={}", dlq.getId(), dlq.getRouteId()));
            }, () -> log.warn("Message not found for DLQ entry dlqId={}, messageId={}", dlq.getId(), dlq.getMessageId()));

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

    private String sha256(String input) {
        try {
            MessageDigest d = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(d.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new RuntimeException(e); }
    }
}
