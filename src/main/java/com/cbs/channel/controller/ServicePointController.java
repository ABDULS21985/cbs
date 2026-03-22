package com.cbs.channel.controller;

import com.cbs.channel.dto.*;
import com.cbs.channel.entity.ServicePoint;
import com.cbs.channel.entity.ServicePointInteraction;
import com.cbs.channel.mapper.ChannelMapper;
import com.cbs.channel.service.ServicePointService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
    private final ChannelMapper channelMapper;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ServicePointResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toServicePointResponseList(service.getAllServicePoints())));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServicePointResponse>> register(@Valid @RequestBody RegisterServicePointRequest request) {
        ServicePoint entity = channelMapper.toEntity(request);
        ServicePoint saved = service.registerServicePoint(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(channelMapper.toServicePointResponse(saved)));
    }

    @PostMapping("/{id}/interaction/start")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InteractionResponse>> startInteraction(
            @PathVariable Long id, @Valid @RequestBody StartInteractionRequest request) {
        ServicePointInteraction entity = channelMapper.toEntity(request);
        ServicePointInteraction saved = service.startInteraction(id, entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(channelMapper.toInteractionResponse(saved)));
    }

    @PostMapping("/{id}/interaction/end")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InteractionResponse>> endInteraction(
            @PathVariable Long id, @RequestParam String outcome,
            @RequestParam(required = false) Integer satisfactionScore) {
        ServicePointInteraction result = service.endInteraction(id, outcome, satisfactionScore);
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toInteractionResponse(result)));
    }

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getServicePointStatus() {
        return ResponseEntity.ok(ApiResponse.ok(service.getServicePointStatus()));
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServicePointMetrics(
            @RequestParam(required = false) Long servicePointId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getServicePointMetrics(servicePointId)));
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ServicePointResponse>>> getAvailableServicePoints(
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.ok(
                channelMapper.toServicePointResponseList(service.getAvailableServicePoints(type))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ServicePointResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toServicePointResponse(service.getServicePointById(id))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServicePointResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateServicePointRequest request) {
        ServicePoint existing = service.getServicePointById(id);
        channelMapper.updateServicePointFromRequest(request, existing);
        ServicePoint saved = service.saveServicePoint(existing);
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toServicePointResponse(saved)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.deleteServicePoint(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
