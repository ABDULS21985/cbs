package com.cbs.compliancereport.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.service.ComplianceReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/compliance-reports")
@RequiredArgsConstructor
@Tag(name = "Compliance Reporting", description = "Regulatory compliance report management and submission tracking")
public class ComplianceReportController {

    private final ComplianceReportService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReport>> create(@RequestBody ComplianceReport report) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(report)));
    }

    @PostMapping("/{code}/review")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReport>> review(@PathVariable String code, @RequestParam String reviewedBy) {
        return ResponseEntity.ok(ApiResponse.ok(service.review(code, reviewedBy)));
    }

    @PostMapping("/{code}/submit")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReport>> submit(@PathVariable String code, @RequestParam String submissionReference) {
        return ResponseEntity.ok(ApiResponse.ok(service.submit(code, submissionReference)));
    }

    @GetMapping("/regulator/{regulator}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> getByRegulator(@PathVariable String regulator) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByRegulator(regulator)));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> getOverdue() {
        return ResponseEntity.ok(ApiResponse.ok(service.getOverdue()));
    }
}
