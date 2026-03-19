package com.cbs.compliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.repository.ComplianceReportRepository;
import com.cbs.compliancereport.service.ComplianceReportService;
import com.cbs.regulatory.repository.RegulatoryReportRunRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/compliance")
@RequiredArgsConstructor
@Tag(name = "Compliance", description = "Compliance returns, assessments, and regulatory submission tracking")
public class ComplianceController {

    private final ComplianceReportRepository complianceReportRepository;
    private final ComplianceReportService complianceReportService;
    private final RegulatoryReportRunRepository regulatoryReportRunRepository;

    @GetMapping("/returns")
    @Operation(summary = "List all compliance returns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> listReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ComplianceReport> result = complianceReportRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dueDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get compliance statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long total = complianceReportRepository.count();
        long overdue = complianceReportService.getOverdue().size();
        long draft = complianceReportRepository.findByStatusOrderByDueDateAsc("DRAFT").size();
        long submitted = complianceReportRepository.findByStatusOrderByDueDateAsc("SUBMITTED").size();
        long regulatoryRuns = regulatoryReportRunRepository.count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", total,
                "overdue", overdue,
                "draft", draft,
                "submitted", submitted,
                "regulatoryRuns", regulatoryRuns
        )));
    }

    @GetMapping("/assessments")
    @Operation(summary = "List compliance assessments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> listAssessments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ComplianceReport> result = complianceReportRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
