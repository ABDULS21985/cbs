package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.regulatory.entity.*;
import com.cbs.regulatory.service.RegulatoryReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/regulatory")
@RequiredArgsConstructor
@Tag(name = "Regulatory Reporting", description = "Report definitions, generation, submission tracking")
public class RegulatoryReportController {

    private final RegulatoryReportingService reportingService;

    @PostMapping("/definitions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryReportDefinition>> createDefinition(@RequestBody RegulatoryReportDefinition def) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(reportingService.createDefinition(def)));
    }

    @GetMapping("/definitions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<RegulatoryReportDefinition>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(reportingService.getAllDefinitions()));
    }

    @GetMapping("/definitions/regulator/{regulator}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<RegulatoryReportDefinition>>> getByRegulator(@PathVariable String regulator) {
        return ResponseEntity.ok(ApiResponse.ok(reportingService.getByRegulator(regulator)));
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate a regulatory report")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryReportRun>> generate(
            @RequestParam String reportCode, @RequestParam LocalDate periodStart,
            @RequestParam LocalDate periodEnd, @RequestParam String generatedBy) {
        return ResponseEntity.ok(ApiResponse.ok(reportingService.generateReport(reportCode, periodStart, periodEnd, generatedBy)));
    }

    @PostMapping("/runs/{runId}/submit")
    @Operation(summary = "Submit a generated report to the regulator")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryReportRun>> submit(@PathVariable Long runId, @RequestParam String submittedBy) {
        return ResponseEntity.ok(ApiResponse.ok(reportingService.submitReport(runId, submittedBy)));
    }

    @GetMapping("/runs/{reportCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<RegulatoryReportRun>>> getRuns(@PathVariable String reportCode,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<RegulatoryReportRun> result = reportingService.getReportRuns(reportCode, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
