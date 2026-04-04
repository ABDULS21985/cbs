package com.cbs.shariahcompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariahcompliance.dto.AuditFindingResponse;
import com.cbs.shariahcompliance.dto.ComplianceDashboard;
import com.cbs.shariahcompliance.dto.CreateAuditFindingRequest;
import com.cbs.shariahcompliance.dto.ManagementResponseRequest;
import com.cbs.shariahcompliance.dto.PlanShariahAuditRequest;
import com.cbs.shariahcompliance.dto.ReviewSampleRequest;
import com.cbs.shariahcompliance.dto.SamplingRequest;
import com.cbs.shariahcompliance.dto.ShariahAuditResponse;
import com.cbs.shariahcompliance.entity.ShariahAuditSample;
import com.cbs.shariahcompliance.entity.ShariahAuditStatus;
import com.cbs.shariahcompliance.service.ComplianceDashboardService;
import com.cbs.shariahcompliance.service.ShariahAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/shariah-compliance/audit")
@RequiredArgsConstructor
@Slf4j
public class ShariahAuditController {

    private final ShariahAuditService shariahAuditService;
    private final ComplianceDashboardService complianceDashboardService;

    // ── Audit lifecycle ───────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> planAudit(
            @Valid @RequestBody PlanShariahAuditRequest request) {
        log.info("Planning Shariah audit");
        ShariahAuditResponse audit = shariahAuditService.planAudit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(audit, "Audit planned"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> getAudit(@PathVariable Long id) {
        ShariahAuditResponse audit = shariahAuditService.getAudit(id);
        return ResponseEntity.ok(ApiResponse.ok(audit));
    }

    @GetMapping("/ref/{ref}")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> getAuditByRef(@PathVariable String ref) {
        ShariahAuditResponse audit = shariahAuditService.getAuditByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(audit));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<ShariahAuditResponse>>> getAuditsByStatus(
            @PathVariable ShariahAuditStatus status) {
        List<ShariahAuditResponse> audits = shariahAuditService.getAuditsByStatus(status);
        return ResponseEntity.ok(ApiResponse.ok(audits));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> startAudit(@PathVariable Long id) {
        log.info("Starting audit id={}", id);
        ShariahAuditResponse audit = shariahAuditService.startAudit(id);
        return ResponseEntity.ok(ApiResponse.ok(audit, "Audit started"));
    }

    @PostMapping("/{id}/complete-fieldwork")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> completeFieldwork(@PathVariable Long id) {
        log.info("Completing fieldwork for audit id={}", id);
        ShariahAuditResponse audit = shariahAuditService.completeFieldwork(id);
        return ResponseEntity.ok(ApiResponse.ok(audit, "Fieldwork completed"));
    }

    // ── Sampling ──────────────────────────────────────────────────────────────

    @PostMapping("/{id}/generate-sample")
    public ResponseEntity<ApiResponse<List<ShariahAuditSample>>> generateSample(
            @PathVariable Long id,
            @Valid @RequestBody SamplingRequest request) {
        log.info("Generating sample for audit id={}", id);
        List<ShariahAuditSample> samples = shariahAuditService.generateSample(id, request);
        return ResponseEntity.ok(ApiResponse.ok(samples, "Audit sample generated"));
    }

    @GetMapping("/{id}/samples")
    public ResponseEntity<ApiResponse<List<ShariahAuditSample>>> getAuditSamples(@PathVariable Long id) {
        List<ShariahAuditSample> samples = shariahAuditService.getAuditSamples(id);
        return ResponseEntity.ok(ApiResponse.ok(samples));
    }

    @PostMapping("/samples/{sampleId}/review")
    public ResponseEntity<ApiResponse<Void>> reviewSample(
            @PathVariable Long sampleId,
            @Valid @RequestBody ReviewSampleRequest request) {
        log.info("Reviewing sample id={}", sampleId);
        shariahAuditService.reviewSample(sampleId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Sample reviewed"));
    }

    // ── Findings ──────────────────────────────────────────────────────────────

    @PostMapping("/{id}/findings")
    public ResponseEntity<ApiResponse<AuditFindingResponse>> createFinding(
            @Valid @RequestBody CreateAuditFindingRequest request) {
        log.info("Creating finding for audit id={}", request.getAuditId());
        AuditFindingResponse finding = shariahAuditService.createFinding(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(finding, "Audit finding created"));
    }

    @GetMapping("/{id}/findings")
    public ResponseEntity<ApiResponse<List<AuditFindingResponse>>> getAuditFindings(@PathVariable Long id) {
        List<AuditFindingResponse> findings = shariahAuditService.getAuditFindings(id);
        return ResponseEntity.ok(ApiResponse.ok(findings));
    }

    @PutMapping("/findings/{findingId}")
    public ResponseEntity<ApiResponse<Void>> updateFinding(
            @PathVariable Long findingId,
            @Valid @RequestBody CreateAuditFindingRequest request) {
        log.info("Updating finding id={}", findingId);
        shariahAuditService.updateFinding(findingId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Audit finding updated"));
    }

    @PostMapping("/findings/{findingId}/management-response")
    public ResponseEntity<ApiResponse<Void>> recordManagementResponse(
            @PathVariable Long findingId,
            @Valid @RequestBody ManagementResponseRequest request) {
        log.info("Recording management response for finding id={}", findingId);
        shariahAuditService.recordManagementResponse(findingId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Management response recorded"));
    }

    @PostMapping("/findings/{findingId}/verify-remediation")
    public ResponseEntity<ApiResponse<Void>> verifyRemediation(
            @PathVariable Long findingId,
            @RequestParam String verifiedBy) {
        log.info("Verifying remediation for finding id={} by {}", findingId, verifiedBy);
        shariahAuditService.verifyRemediation(findingId, verifiedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Remediation verified"));
    }

    @GetMapping("/findings/open")
    public ResponseEntity<ApiResponse<List<AuditFindingResponse>>> getOpenFindings() {
        List<AuditFindingResponse> findings = shariahAuditService.getOpenFindings();
        return ResponseEntity.ok(ApiResponse.ok(findings));
    }

    @GetMapping("/findings/overdue-remediation")
    public ResponseEntity<ApiResponse<List<AuditFindingResponse>>> getOverdueRemediations() {
        List<AuditFindingResponse> findings = shariahAuditService.getOverdueRemediations();
        return ResponseEntity.ok(ApiResponse.ok(findings));
    }

    // ── Reporting ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/generate-report")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> generateDraftReport(@PathVariable Long id) {
        log.info("Generating draft report for audit id={}", id);
        ShariahAuditResponse audit = shariahAuditService.generateDraftReport(id);
        return ResponseEntity.ok(ApiResponse.ok(audit, "Draft report generated"));
    }

    @PostMapping("/{id}/submit-ssb")
    public ResponseEntity<ApiResponse<Void>> submitReportToSsb(@PathVariable Long id) {
        log.info("Submitting audit report id={} to SSB", id);
        shariahAuditService.submitReportToSsb(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Report submitted to SSB"));
    }

    @PostMapping("/{id}/issue-final-report")
    public ResponseEntity<ApiResponse<Void>> issueFinalReport(
            @PathVariable Long id,
            @RequestParam String opinion) {
        log.info("Issuing final report for audit id={} with opinion: {}", id, opinion);
        shariahAuditService.issueFinalReport(id, opinion);
        return ResponseEntity.ok(ApiResponse.ok(null, "Final report issued"));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ApiResponse<ShariahAuditResponse>> closeAudit(@PathVariable Long id) {
        log.info("Closing audit id={}", id);
        ShariahAuditResponse audit = shariahAuditService.closeAudit(id);
        return ResponseEntity.ok(ApiResponse.ok(audit, "Audit closed"));
    }

    @GetMapping("/{id}/compliance-score")
    public ResponseEntity<ApiResponse<BigDecimal>> calculateComplianceScore(@PathVariable Long id) {
        BigDecimal score = shariahAuditService.calculateComplianceScore(id);
        return ResponseEntity.ok(ApiResponse.ok(score));
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<ComplianceDashboard>> getDashboard() {
        ComplianceDashboard dashboard = complianceDashboardService.getDashboard();
        return ResponseEntity.ok(ApiResponse.ok(dashboard));
    }
}
