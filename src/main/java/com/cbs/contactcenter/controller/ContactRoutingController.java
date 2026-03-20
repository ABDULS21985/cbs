package com.cbs.contactcenter.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.service.ContactRoutingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/contact-routing") @RequiredArgsConstructor
@Tag(name = "Contact Routing", description = "Routing rules, agent state management, callback requests, queue dashboard")
public class ContactRoutingController {

    private final ContactRoutingService service;

    @PostMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<RoutingRule>> createRule(@RequestBody RoutingRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createRule(rule)));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<RoutingRule>>> listActiveRules() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveRules()));
    }

    @GetMapping("/route")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getRouteInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping("/route")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> routeContact(
            @RequestParam Long customerId,
            @RequestParam String reason,
            @RequestParam String channel) {
        return ResponseEntity.ok(ApiResponse.ok(service.routeContact(customerId, reason, channel)));
    }

    @PutMapping("/agents/{agentId}/state")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AgentState>> updateAgentState(
            @PathVariable String agentId,
            @RequestParam String newState) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateAgentState(agentId, newState)));
    }

    @GetMapping("/agents/{agentId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AgentState>> getAgentProfile(@PathVariable String agentId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAgentProfile(agentId)));
    }

    @GetMapping("/agents/center/{centerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AgentState>>> getAgentPerformance(@PathVariable Long centerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAgentPerformance(centerId)));
    }

    @GetMapping("/callbacks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CallbackRequest>>> listCallbacks() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllCallbacks()));
    }

    @PostMapping("/callbacks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CallbackRequest>> requestCallback(@RequestBody CallbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.requestCallback(request)));
    }

    @PostMapping("/callbacks/{id}/attempt")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CallbackRequest>> attemptCallback(
            @PathVariable Long id,
            @RequestParam String outcome) {
        return ResponseEntity.ok(ApiResponse.ok(service.attemptCallback(id, outcome)));
    }

    @GetMapping("/queues/center/{centerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ContactQueue>>> getQueueDashboard(@PathVariable Long centerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getQueueDashboard(centerId)));
    }
}
