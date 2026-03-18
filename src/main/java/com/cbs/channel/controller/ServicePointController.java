package com.cbs.channel.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.channel.entity.ServicePoint;
import com.cbs.channel.entity.ServicePointInteraction;
import com.cbs.channel.service.ServicePointService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/service-points")
@RequiredArgsConstructor
@Tag(name = "Service Points", description = "Physical and virtual service delivery point management")
public class ServicePointController {

    private final ServicePointService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServicePoint>> register(@RequestBody ServicePoint servicePoint) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerServicePoint(servicePoint)));
    }

    @PostMapping("/{id}/interaction/start")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ServicePointInteraction>> startInteraction(@PathVariable Long id, @RequestBody ServicePointInteraction interaction) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.startInteraction(id, interaction)));
    }

    @PostMapping("/{id}/interaction/end")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ServicePointInteraction>> endInteraction(@PathVariable Long id, @RequestParam String outcome, @RequestParam(required = false) Integer satisfactionScore) {
        return ResponseEntity.ok(ApiResponse.ok(service.endInteraction(id, outcome, satisfactionScore)));
    }

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getServicePointStatus() {
        return ResponseEntity.ok(ApiResponse.ok(service.getServicePointStatus()));
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServicePointMetrics(@RequestParam Long servicePointId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getServicePointMetrics(servicePointId)));
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ServicePoint>>> getAvailableServicePoints(@RequestParam String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAvailableServicePoints(type)));
    }
}
