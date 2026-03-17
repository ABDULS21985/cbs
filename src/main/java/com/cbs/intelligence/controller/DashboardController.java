package com.cbs.intelligence.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/intelligence/dashboards") @RequiredArgsConstructor
@Tag(name = "Real-Time Dashboards", description = "Configurable BI dashboards with 13 widget types, role-based access")
public class DashboardController {
    private final DashboardService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DashboardDefinition>> create(@RequestBody DashboardDefinition dashboard) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createDashboard(dashboard)));
    }

    @PostMapping("/{id}/widgets")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DashboardWidget>> addWidget(@PathVariable Long id, @RequestBody DashboardWidget widget) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addWidget(id, widget)));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWithWidgets(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboardWithWidgets(code)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DashboardDefinition>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboardsByType(type)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DashboardDefinition>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllDashboards()));
    }
}
