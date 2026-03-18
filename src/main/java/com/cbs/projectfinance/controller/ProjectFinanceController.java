package com.cbs.projectfinance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.projectfinance.entity.ProjectFinanceFacility;
import com.cbs.projectfinance.entity.ProjectMilestone;
import com.cbs.projectfinance.service.ProjectFinanceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/project-finance")
@RequiredArgsConstructor
@Tag(name = "Project Finance", description = "Infrastructure and capital project financing with milestone-based disbursement")
public class ProjectFinanceController {

    private final ProjectFinanceService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProjectFinanceFacility>> createFacility(@RequestBody ProjectFinanceFacility facility) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createFacility(facility)));
    }

    @PostMapping("/{code}/milestones")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProjectMilestone>> addMilestone(@PathVariable String code, @RequestBody ProjectMilestone milestone) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addMilestone(code, milestone)));
    }

    @PostMapping("/milestones/{milestoneCode}/complete")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProjectMilestone>> completeMilestone(@PathVariable String milestoneCode) {
        return ResponseEntity.ok(ApiResponse.ok(service.completeMilestone(milestoneCode)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProjectFinanceFacility>>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByStatus(status)));
    }

    @GetMapping("/{code}/milestones")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProjectMilestone>>> getMilestones(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMilestones(code)));
    }
}
