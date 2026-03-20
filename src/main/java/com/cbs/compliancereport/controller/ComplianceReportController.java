package com.cbs.compliancereport.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.repository.ComplianceReportRepository;
import com.cbs.compliancereport.service.ComplianceReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/compliance-reports")
@RequiredArgsConstructor
@Tag(name = "Compliance Reporting", description = "Regulatory compliance report management and submission tracking")
public class ComplianceReportController {

    private final ComplianceReportService service;
    private final ComplianceReportRepository complianceReportRepository;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReport>> create(@RequestBody ComplianceReport report) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(report)));
    }

    @PostMapping("/{code}/review")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReport>> review(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.review(code, currentActorProvider.getCurrentActor())));
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

    @GetMapping
    @Operation(summary = "List all compliance reports")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ComplianceReport> result = complianceReportRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/returns")
    @Operation(summary = "List submitted compliance returns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceReport>>> listReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ComplianceReport> result = complianceReportRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dueDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get compliance report statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long total = complianceReportRepository.count();
        long overdue = service.getOverdue().size();
        long draft = complianceReportRepository.findByStatusOrderByDueDateAsc("DRAFT").size();
        long submitted = complianceReportRepository.findByStatusOrderByDueDateAsc("SUBMITTED").size();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", total,
                "overdue", overdue,
                "draft", draft,
                "submitted", submitted
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
