package com.cbs.eventing.service;

import com.cbs.eventing.entity.*;
import com.cbs.eventing.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.*;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

/**
 * Event-driven architecture service (Caps 76/79).
 * Implements the transactional outbox pattern:
 * 1. Business service writes DomainEvent in the same transaction as the business change
 * 2. EventPublisher polls unpublished events and delivers to subscribers
 * 3. Guaranteed at-least-once delivery with idempotent event IDs
 */
@Service @Slf4j @Transactional(readOnly = true)
public class EventingService {

    private final DomainEventRepository eventRepository;
    private final EventSubscriptionRepository subscriptionRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    /** Optional Kafka template - injected only when spring-kafka is on the classpath. */
    @Nullable
    @Autowired(required = false)
    private Object kafkaTemplate;

    /** Maximum number of events to process per outbox poll to bound transaction size. */
    private static final int OUTBOX_BATCH_SIZE = 100;
    /** Maximum consecutive failures before a subscription is deactivated. */
    private static final int MAX_FAILURE_THRESHOLD = 10;

    public EventingService(DomainEventRepository eventRepository,
                           EventSubscriptionRepository subscriptionRepository,
                           ApplicationEventPublisher applicationEventPublisher,
                           ObjectMapper objectMapper) {
        this.eventRepository = eventRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Publishes a domain event (stores in outbox table).
     * Called within the same transaction as the business operation.
     */
    @Transactional
    public DomainEvent publishEvent(String eventType, String aggregateType, Long aggregateId,
                                      Map<String, Object> payload, String topic) {
        Long seq = eventRepository.getNextSequence();
        String eventId = String.format("EVT-%s-%013d", aggregateType.substring(0, Math.min(3, aggregateType.length())), seq);

        DomainEvent event = DomainEvent.builder()
                .eventId(eventId).eventType(eventType).aggregateType(aggregateType)
                .aggregateId(aggregateId).payload(payload)
                .sequenceNumber(seq).topic(topic != null ? topic : "cbs." + aggregateType.toLowerCase())
                .published(false).build();

        DomainEvent saved = eventRepository.save(event);
        log.debug("Event stored: id={}, type={}, aggregate={}/{}", eventId, eventType, aggregateType, aggregateId);
        return saved;
    }

    /**
     * Polls and delivers unpublished events to matching subscribers.
     * Called by a scheduled job (outbox relay).
     * Uses batch-limited query to bound transaction size in multi-instance deployments.
     */
    @Transactional
    public int processOutbox() {
        List<DomainEvent> unpublished = eventRepository.findUnpublishedBatch(OUTBOX_BATCH_SIZE);
        if (unpublished.isEmpty()) return 0;

        List<EventSubscription> subs = subscriptionRepository.findByIsActiveTrueOrderBySubscriptionNameAsc();

        int delivered = 0;
        for (DomainEvent event : unpublished) {
            boolean allDelivered = true;
            for (EventSubscription sub : subs) {
                if (sub.matchesEventType(event.getEventType())) {
                    boolean success = deliverEvent(event, sub);
                    if (success) {
                        delivered++;
                    } else {
                        allDelivered = false;
                    }
                }
            }
            if (allDelivered) {
                event.setPublished(true);
                event.setPublishedAt(Instant.now());
                eventRepository.save(event);
            }
        }

        if (delivered > 0) log.info("Outbox processed: {} events, {} deliveries", unpublished.size(), delivered);
        return delivered;
    }

    /**
     * Delivers a single event to a subscription endpoint.
     * Package-private so Spring's proxy-based @Async can intercept the call
     * (private methods bypass Spring AOP proxies).
     */
    @Async
    boolean deliverEvent(DomainEvent event, EventSubscription sub) {
        try {
            switch (sub.getDeliveryType()) {
                case "WEBHOOK" -> deliverViaWebhook(event, sub);
                case "KAFKA" -> deliverViaKafka(event, sub);
                case "INTERNAL" -> deliverViaApplicationEvent(event, sub);
                case "LOG" -> log.info("Log delivery: event={}, type={}, aggregate={}/{}, payload={}",
                        event.getEventId(), event.getEventType(),
                        event.getAggregateType(), event.getAggregateId(), event.getPayload());
                default -> {
                    log.warn("Unknown delivery type '{}' for subscription '{}'", sub.getDeliveryType(), sub.getSubscriptionName());
                    return false;
                }
            }
            sub.setLastDeliveredEventId(event.getId());
            sub.setFailureCount(0);
            subscriptionRepository.save(sub);
            return true;
        } catch (Exception e) {
            int failures = sub.getFailureCount() + 1;
            sub.setFailureCount(failures);
            if (failures >= MAX_FAILURE_THRESHOLD) {
                sub.setIsActive(false);
                log.error("Subscription '{}' deactivated after {} consecutive failures. Last error: {}",
                        sub.getSubscriptionName(), failures, e.getMessage());
            } else {
                log.warn("Event delivery failed (attempt {}/{}): event={}, sub={}, error={}",
                        failures, sub.getMaxRetries(), event.getEventId(), sub.getSubscriptionName(), e.getMessage());
            }
            subscriptionRepository.save(sub);
            return false;
        }
    }

    private void deliverViaWebhook(DomainEvent event, EventSubscription sub) {
        String url = sub.getDeliveryUrl();
        if (url == null || url.isBlank()) {
            throw new IllegalStateException("WEBHOOK subscription '" + sub.getSubscriptionName() + "' has no delivery URL");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("eventId", event.getEventId());
        body.put("eventType", event.getEventType());
        body.put("aggregateType", event.getAggregateType());
        body.put("aggregateId", event.getAggregateId());
        body.put("payload", event.getPayload());
        body.put("topic", event.getTopic());
        body.put("timestamp", event.getCreatedAt().toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Include custom headers from delivery config if present
        Map<String, Object> config = sub.getDeliveryConfig();
        if (config != null && config.containsKey("headers")) {
            Object headerMap = config.get("headers");
            if (headerMap instanceof Map<?, ?> hm) {
                hm.forEach((k, v) -> headers.set(String.valueOf(k), String.valueOf(v)));
            }
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Webhook returned HTTP " + response.getStatusCode() + " for " + url);
        }
        log.debug("Webhook delivered: {} -> {} (HTTP {})", event.getEventId(), url, response.getStatusCode().value());
    }

    private void deliverViaKafka(DomainEvent event, EventSubscription sub) {
        String topic = event.getTopic() != null ? event.getTopic() : "cbs.events";
        try {
            String payload = objectMapper.writeValueAsString(event.getPayload());
            if (kafkaTemplate != null) {
                // Use reflection to call KafkaTemplate.send(topic, key, data) since
                // spring-kafka may not be on the classpath at compile time
                var sendMethod = kafkaTemplate.getClass().getMethod("send", String.class, Object.class, Object.class);
                sendMethod.invoke(kafkaTemplate, topic, event.getEventId(), payload);
                log.debug("Kafka delivered: {} -> topic={}", event.getEventId(), topic);
            } else {
                // Fallback to Spring ApplicationEvent when Kafka is not available
                log.debug("Kafka unavailable, falling back to ApplicationEventPublisher for event {}", event.getEventId());
                applicationEventPublisher.publishEvent(event);
            }
        } catch (Exception e) {
            throw new RuntimeException("Kafka delivery failed for event " + event.getEventId(), e);
        }
    }

    private void deliverViaApplicationEvent(DomainEvent event, EventSubscription sub) {
        applicationEventPublisher.publishEvent(event);
        log.debug("Internal event published: {} -> {}", event.getEventId(), sub.getSubscriptionName());
    }

    /** Replay events for an aggregate (event sourcing) */
    public List<DomainEvent> replayEvents(String aggregateType, Long aggregateId) {
        return eventRepository.findByAggregateTypeAndAggregateIdOrderBySequenceNumberAsc(aggregateType, aggregateId);
    }

    @Transactional
    public EventSubscription createSubscription(EventSubscription sub) { return subscriptionRepository.save(sub); }
    public List<EventSubscription> getActiveSubscriptions() { return subscriptionRepository.findByIsActiveTrueOrderBySubscriptionNameAsc(); }

    public List<DomainEvent> getRecentEvents() { return eventRepository.findAll(); }
    public int getOutboxPendingCount() { return eventRepository.findUnpublished().size(); }
}
