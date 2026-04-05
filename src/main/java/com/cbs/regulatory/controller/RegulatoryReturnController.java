package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.dto.RegulatoryRequests;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.ReturnAuditEvent;
import com.cbs.regulatory.service.RegulatoryReturnWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/regulatory/returns")
@RequiredArgsConstructor
public class RegulatoryReturnController {

    private final RegulatoryReturnWorkflowService workflowService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> getReturn(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getReturn(id)));
    }

    @GetMapping("/ref/{ref}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> getReturnByRef(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getReturnByRef(ref)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> searchReturns(@RequestParam String jurisdiction,
                                                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getReturnsByJurisdiction(jurisdiction, from, to)));
    }

    @PostMapping("/{id}/submit-for-review")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> submitForReview(@PathVariable Long id) {
        workflowService.submitForReview(id);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> review(@PathVariable Long id,
                                                      @RequestBody RegulatoryRequests.ReviewDetails request) {
        workflowService.reviewReturn(id, request);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CFO')")
    public ResponseEntity<ApiResponse<String>> approve(@PathVariable Long id, @RequestParam(required = false) String approvedBy) {
        workflowService.approveReturn(id, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/submit-to-regulator")
    @PreAuthorize("hasRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> submitToRegulator(@PathVariable Long id,
                                                                 @RequestBody RegulatoryRequests.SubmissionDetails request) {
        workflowService.submitToRegulator(id, request);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> acknowledge(@PathVariable Long id,
                                                           @RequestBody RegulatoryRequests.AcknowledgmentDetails request) {
        workflowService.recordAcknowledgment(id, request);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> reject(@PathVariable Long id,
                                                      @RequestBody RegulatoryRequests.RejectionDetails request) {
        workflowService.recordRejection(id, request);
        return ResponseEntity.ok(ApiResponse.ok("OK"));
    }

    @PostMapping("/{id}/amend")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> amend(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.createAmendment(id, reason)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ReturnAuditEvent>>> auditTrail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getReturnAuditTrail(id)));
    }

    @GetMapping("/compare")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.ReturnComparison>> compare(@RequestParam Long currentReturnId,
                                                                                     @RequestParam Long previousReturnId) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.comparePeriods(currentReturnId, previousReturnId)));
    }

    @GetMapping("/upcoming-deadlines")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> upcomingDeadlines(@RequestParam(defaultValue = "7") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getUpcomingDeadlines(daysAhead)));
    }

    @GetMapping("/breached-deadlines")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> breachedDeadlines() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getBreachedDeadlines()));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturn>>> byStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getReturnsByStatus(
                RegulatoryDomainEnums.ReturnStatus.valueOf(status.toUpperCase()))));
    }
}
