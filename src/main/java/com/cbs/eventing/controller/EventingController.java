package com.cbs.eventing.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.eventing.entity.*;
import com.cbs.eventing.service.EventingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/events") @RequiredArgsConstructor
@Tag(name = "Event Streaming", description = "Domain event publishing, subscription management, outbox relay, event replay")
public class EventingController {

    private final EventingService eventingService;

    @PostMapping("/publish")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DomainEvent>> publish(
            @RequestParam String eventType, @RequestParam String aggregateType,
            @RequestParam Long aggregateId, @RequestBody Map<String, Object> payload,
            @RequestParam(required = false) String topic) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                eventingService.publishEvent(eventType, aggregateType, aggregateId, payload, topic)));
    }

    @PostMapping("/outbox/process")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processOutbox() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("delivered", eventingService.processOutbox())));
    }

    @GetMapping("/replay/{aggregateType}/{aggregateId}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<DomainEvent>>> replay(@PathVariable String aggregateType, @PathVariable Long aggregateId) {
        return ResponseEntity.ok(ApiResponse.ok(eventingService.replayEvents(aggregateType, aggregateId)));
    }

    @PostMapping("/subscriptions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EventSubscription>> createSubscription(@RequestBody EventSubscription sub) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(eventingService.createSubscription(sub)));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<EventSubscription>>> getSubscriptions() {
        return ResponseEntity.ok(ApiResponse.ok(eventingService.getActiveSubscriptions()));
    }
}
