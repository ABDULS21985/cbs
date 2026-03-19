package com.cbs.casemgmt.controller;

import com.cbs.casemgmt.entity.CasePatternInsight;
import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import com.cbs.casemgmt.service.RootCauseAnalysisService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/root-cause-analysis") @RequiredArgsConstructor
@Tag(name = "Root Cause Analysis", description = "Case root cause analysis, pattern insights, corrective/preventive actions")
public class RootCauseAnalysisController {

    private final RootCauseAnalysisService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseRootCauseAnalysis>> create(@RequestBody CaseRootCauseAnalysis rca) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createRca(rca)));
    }

    @PostMapping("/{code}/corrective-action") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseRootCauseAnalysis>> addCorrectiveAction(
            @PathVariable String code, @RequestBody Map<String, Object> action) {
        CaseRootCauseAnalysis rca = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.addCorrectiveAction(rca.getId(), action)));
    }

    @PostMapping("/{code}/complete") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseRootCauseAnalysis>> complete(@PathVariable String code) {
        CaseRootCauseAnalysis rca = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.completeRca(rca.getId())));
    }

    @PostMapping("/{code}/validate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseRootCauseAnalysis>> validate(@PathVariable String code) {
        CaseRootCauseAnalysis rca = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.validateRca(rca.getId())));
    }

    @GetMapping("/patterns") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CasePatternInsight>>> listPatterns() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllPatterns()));
    }

    @PostMapping("/patterns") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CasePatternInsight>>> generatePatterns(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(service.generatePatternInsights(from, to)));
    }

    @GetMapping("/recurring") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> recurring() {
        return ResponseEntity.ok(ApiResponse.ok(service.getRecurringRootCauses()));
    }

    @GetMapping("/dashboard") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getRcaDashboard()));
    }
}
