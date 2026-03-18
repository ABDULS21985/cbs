package com.cbs.wealthmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.service.WealthManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1/wealth-management")
@RequiredArgsConstructor
@Tag(name = "Wealth Management", description = "Financial planning, goals, estate/tax strategy, advisor assignment")
public class WealthManagementController {

    private final WealthManagementService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> create(@RequestBody WealthManagementPlan plan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(plan)));
    }

    @PostMapping("/{code}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WealthManagementPlan>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(code)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthManagementPlan>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId)));
    }

    @GetMapping("/advisor/{advisorId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WealthManagementPlan>>> getByAdvisor(@PathVariable String advisorId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByAdvisor(advisorId)));
    }
}
