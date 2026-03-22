package com.cbs.casemgmt.controller;

import com.cbs.casemgmt.entity.CasePatternInsight;
import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import com.cbs.casemgmt.service.RootCauseAnalysisService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseRootCauseAnalysis>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code)));
    }

    @GetMapping("/case/{caseId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CaseRootCauseAnalysis>>> getByCaseId(@PathVariable Long caseId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCaseId(caseId)));
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
            @RequestBody(required = false) Map<String, String> body) {
        LocalDate from = null;
        LocalDate to = null;
        if (body != null) {
            if (body.containsKey("from") && body.get("from") != null) {
                from = LocalDate.parse(body.get("from"));
            }
            if (body.containsKey("to") && body.get("to") != null) {
                to = LocalDate.parse(body.get("to"));
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(service.generatePatternInsights(from, to)));
    }

    @GetMapping("/recurring") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> recurring() {
        return ResponseEntity.ok(ApiResponse.ok(service.getRecurringRootCauses()));
    }

    @GetMapping("/dashboard") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getRcaDashboard()));
    }
}
