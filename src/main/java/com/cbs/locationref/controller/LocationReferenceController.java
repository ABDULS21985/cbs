package com.cbs.locationref.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.locationref.entity.LocationReference;
import com.cbs.locationref.service.LocationReferenceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/locations")
@RequiredArgsConstructor
@Tag(name = "Location Reference", description = "Hierarchical location data — country/state/city, GPS, timezone, regulatory zones")
public class LocationReferenceController {

    private final LocationReferenceService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LocationReference>> create(@RequestBody LocationReference loc) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(loc)));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<List<LocationReference>>> byType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/{parentId}/children")
    public ResponseEntity<ApiResponse<List<LocationReference>>> children(@PathVariable Long parentId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getChildren(parentId)));
    }
}
