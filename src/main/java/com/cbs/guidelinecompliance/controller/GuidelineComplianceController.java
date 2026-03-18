package com.cbs.guidelinecompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.guidelinecompliance.entity.GuidelineAssessment;
import com.cbs.guidelinecompliance.service.GuidelineComplianceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/guideline-assessments")
@RequiredArgsConstructor
@Tag(name = "Guideline Compliance", description = "Regulatory guideline assessment and compliance scoring")
public class GuidelineComplianceController {

    private final GuidelineComplianceService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<GuidelineAssessment>> create(@RequestBody GuidelineAssessment assessment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(assessment)));
    }

    @PostMapping("/{code}/complete")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<GuidelineAssessment>> complete(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.complete(code)));
    }

    @GetMapping("/source/{source}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GuidelineAssessment>>> getBySource(@PathVariable String source) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBySource(source)));
    }

    @GetMapping("/rating/{rating}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GuidelineAssessment>>> getByRating(@PathVariable String rating) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByRating(rating)));
    }
}
