package com.cbs.compliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.repository.ComplianceReportRepository;
import com.cbs.compliancereport.service.ComplianceReportService;
import com.cbs.guidelinecompliance.entity.ComplianceGapAnalysis;
import com.cbs.guidelinecompliance.entity.GuidelineAssessment;
import com.cbs.guidelinecompliance.repository.ComplianceGapAnalysisRepository;
import com.cbs.guidelinecompliance.repository.GuidelineAssessmentRepository;
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

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/compliance")
@RequiredArgsConstructor
@Tag(name = "Compliance", description = "Compliance returns, assessments, and regulatory submission tracking")
public class ComplianceController {

    private final ComplianceReportRepository complianceReportRepository;
    private final ComplianceReportService complianceReportService;
    private final RegulatoryReportRunRepository regulatoryReportRunRepository;
    private final ComplianceGapAnalysisRepository complianceGapAnalysisRepository;
    private final GuidelineAssessmentRepository guidelineAssessmentRepository;

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

    // ========================================================================
    // COMPLIANCE EXTENDED ENDPOINTS
    // ========================================================================

    @GetMapping("/policies")
    @Operation(summary = "List compliance policies from guideline assessments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GuidelineAssessment>>> listPolicies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<GuidelineAssessment> result = guidelineAssessmentRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "assessmentDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/gaps")
    @Operation(summary = "List compliance gaps from gap analysis")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceGapAnalysis>>> listGaps(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {
        List<ComplianceGapAnalysis> gaps;
        if (status != null) {
            gaps = complianceGapAnalysisRepository.findByStatus(status);
        } else if (severity != null) {
            gaps = complianceGapAnalysisRepository.findByGapSeverity(severity);
        } else {
            gaps = complianceGapAnalysisRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(gaps));
    }

    @GetMapping("/assessments/{id}")
    @Operation(summary = "Get compliance assessment detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<GuidelineAssessment>> getAssessmentDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(guidelineAssessmentRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Assessment not found: " + id))));
    }

    @PostMapping("/gaps/{id}/status")
    @Operation(summary = "Update compliance gap remediation status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ComplianceGapAnalysis>> updateGapStatus(
            @PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        ComplianceGapAnalysis gap = complianceGapAnalysisRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Gap not found: " + id));
        String newStatus = body.getOrDefault("status", gap.getStatus());
        gap.setStatus(newStatus);
        return ResponseEntity.ok(ApiResponse.ok(complianceGapAnalysisRepository.save(gap)));
    }

    @GetMapping("/audit-findings")
    @Operation(summary = "List audit findings from guideline assessments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GuidelineAssessment>>> listAuditFindings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<GuidelineAssessment> result = guidelineAssessmentRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "assessmentDate")));
        // Filter assessments that have findings
        List<GuidelineAssessment> withFindings = result.getContent().stream()
                .filter(a -> a.getFindings() != null && !a.getFindings().isEmpty())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(withFindings, PageMeta.from(result)));
    }

    @GetMapping("/returns/calendar")
    @Operation(summary = "Regulatory return calendar")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReturnsCalendar() {
        List<ComplianceReport> reports = complianceReportRepository.findAll();
        List<Map<String, Object>> calendar = reports.stream()
                .map(r -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("reportCode", r.getReportCode());
                    entry.put("reportName", r.getReportName());
                    entry.put("regulator", r.getRegulator());
                    entry.put("reportingPeriod", r.getReportingPeriod());
                    entry.put("periodStartDate", r.getPeriodStartDate());
                    entry.put("periodEndDate", r.getPeriodEndDate());
                    entry.put("dueDate", r.getDueDate());
                    entry.put("status", r.getStatus());
                    entry.put("overdue", "SUBMITTED".equals(r.getStatus()) ? false :
                            r.getDueDate() != null && r.getDueDate().isBefore(LocalDate.now()));
                    return entry;
                })
                .sorted((a, b) -> {
                    LocalDate da = (LocalDate) a.get("dueDate");
                    LocalDate db = (LocalDate) b.get("dueDate");
                    if (da == null && db == null) return 0;
                    if (da == null) return 1;
                    if (db == null) return -1;
                    return da.compareTo(db);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(calendar));
    }

    @GetMapping("/returns/stats")
    @Operation(summary = "Regulatory return submission status summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReturnsStats() {
        List<ComplianceReport> reports = complianceReportRepository.findAll();
        long total = reports.size();
        long submitted = reports.stream().filter(r -> "SUBMITTED".equals(r.getStatus())).count();
        long draft = reports.stream().filter(r -> "DRAFT".equals(r.getStatus())).count();
        long overdue = reports.stream()
                .filter(r -> !"SUBMITTED".equals(r.getStatus()) && r.getDueDate() != null && r.getDueDate().isBefore(LocalDate.now()))
                .count();
        long pending = reports.stream().filter(r -> "PENDING".equals(r.getStatus()) || "IN_REVIEW".equals(r.getStatus())).count();

        Map<String, Long> byRegulator = reports.stream()
                .collect(Collectors.groupingBy(ComplianceReport::getRegulator, Collectors.counting()));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalReturns", total,
                "submitted", submitted,
                "draft", draft,
                "overdue", overdue,
                "pending", pending,
                "byRegulator", byRegulator
        )));
    }
}
