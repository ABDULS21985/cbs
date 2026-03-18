package com.cbs.guidelinecompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.guidelinecompliance.entity.ComplianceGapAnalysis;
import com.cbs.guidelinecompliance.service.GapAnalysisService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/gap-analysis") @RequiredArgsConstructor
@Tag(name = "Gap Analysis", description = "Compliance gap identification, remediation tracking, verification")
public class GapAnalysisController {

    private final GapAnalysisService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> identify(@RequestBody ComplianceGapAnalysis gap) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.identifyGap(gap)));
    }

    @PostMapping("/{code}/plan") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> plan(
            @PathVariable String code, @RequestParam String owner,
            @RequestParam String description,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {
        ComplianceGapAnalysis gap = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.planRemediation(gap.getId(), owner, description, targetDate)));
    }

    @PostMapping("/{code}/progress") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> progress(@PathVariable String code) {
        ComplianceGapAnalysis gap = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.updateProgress(gap.getId())));
    }

    @PostMapping("/{code}/close") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> close(@PathVariable String code) {
        ComplianceGapAnalysis gap = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.closeGap(gap.getId())));
    }

    @PostMapping("/{code}/verify") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> verify(
            @PathVariable String code, @RequestParam String verifiedBy) {
        ComplianceGapAnalysis gap = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.verifyGap(gap.getId(), verifiedBy)));
    }

    @PostMapping("/{code}/accept-risk") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> acceptRisk(@PathVariable String code) {
        ComplianceGapAnalysis gap = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.acceptRisk(gap.getId())));
    }

    @GetMapping("/dashboard") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getGapDashboard()));
    }

    @GetMapping("/overdue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceGapAnalysis>>> overdue() {
        return ResponseEntity.ok(ApiResponse.ok(service.getOverdueRemediations()));
    }
}
