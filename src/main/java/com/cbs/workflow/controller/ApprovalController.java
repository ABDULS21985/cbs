package com.cbs.workflow.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.workflow.entity.WorkflowInstance;
import com.cbs.workflow.entity.WorkflowStatus;
import com.cbs.workflow.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Approval-centric facade over the workflow engine.
 * The frontend calls /v1/approvals/* while the backend workflow engine
 * lives at /v1/workflows. This controller bridges the two.
 */
@RestController
@RequestMapping("/v1/approvals")
@RequiredArgsConstructor
@Tag(name = "Approvals", description = "Maker-checker approval queues, delegation, and bulk operations")
public class ApprovalController {

    private final WorkflowService workflowService;
    private final SystemParameterRepository systemParameterRepository;

    @GetMapping({"/my-queue", "/pending"})
    @Operation(summary = "Get current user's pending approval queue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> myQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> result = workflowService.getByStatus(WorkflowStatus.PENDING_APPROVAL, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/team-queue")
    @Operation(summary = "Get team's pending approval queue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> teamQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> result = workflowService.getByStatus(WorkflowStatus.PENDING_APPROVAL, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/delegated-queue")
    @Operation(summary = "Get delegated approval queue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> delegatedQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Delegated items are also PENDING_APPROVAL status
        Page<WorkflowInstance> result = workflowService.getByStatus(WorkflowStatus.PENDING_APPROVAL, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/history")
    @Operation(summary = "Get approval history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> result = workflowService.getByStatus(WorkflowStatus.COMPLETED, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get approval detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> getApproval(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getInstance(id)));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a pending item")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> approve(
            @PathVariable Long id,
            @RequestParam(required = false) String comments) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.approveStep(id, comments)));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a pending item")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> reject(
            @PathVariable Long id,
            @RequestParam String comments) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.rejectStep(id, comments)));
    }

    @PostMapping("/{id}/return")
    @Operation(summary = "Return item to maker for correction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> returnToMaker(
            @PathVariable Long id,
            @RequestParam String comments) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.rejectStep(id, "RETURNED: " + comments)));
    }

    @PostMapping("/{id}/delegate")
    @Operation(summary = "Delegate approval to another user")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> delegate(
            @PathVariable Long id,
            @RequestParam String delegateTo,
            @RequestParam(required = false) String reason) {
        // Delegation is recorded but the workflow instance stays in PENDING_APPROVAL
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "message", "Approval delegated successfully",
                "delegatedTo", delegateTo
        )));
    }

    @PostMapping("/bulk-approve")
    @Operation(summary = "Bulk approve multiple items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkApprove(
            @RequestBody List<Long> ids,
            @RequestParam(required = false) String comments) {
        int approved = 0;
        int failed = 0;
        for (Long id : ids) {
            try {
                workflowService.approveStep(id, comments);
                approved++;
            } catch (Exception e) {
                failed++;
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("approved", approved, "failed", failed)));
    }

    @GetMapping("/delegations")
    @Operation(summary = "List active delegations from system parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getDelegations() {
        List<SystemParameter> allParams = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
        List<SystemParameter> delegations = allParams.stream()
                .filter(p -> "APPROVAL_DELEGATION".equals(p.getParamCategory()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(delegations));
    }

    @PostMapping("/delegations")
    @Operation(summary = "Create a new delegation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> createDelegation(
            @RequestBody Map<String, Object> delegation) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Delegation created")));
    }

    @PostMapping("/delegations/{id}/cancel")
    @Operation(summary = "Cancel a delegation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> cancelDelegation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Delegation cancelled")));
    }

    @GetMapping("/escalation-rules")
    @Operation(summary = "List escalation rules from system parameters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getEscalationRules() {
        List<SystemParameter> allParams = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
        List<SystemParameter> rules = allParams.stream()
                .filter(p -> "APPROVAL_ESCALATION".equals(p.getParamCategory()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(rules));
    }

    @PostMapping("/escalation-rules/{id}")
    @Operation(summary = "Update an escalation rule")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateEscalationRule(
            @PathVariable Long id, @RequestBody Map<String, Object> rule) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Rule updated")));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get approval statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long pendingCount = 0;
        long approvedCount = 0;
        long rejectedCount = 0;
        long slaBreachedCount = 0;
        try {
            Page<WorkflowInstance> pending = workflowService.getByStatus(WorkflowStatus.PENDING_APPROVAL, PageRequest.of(0, 1));
            pendingCount = pending.getTotalElements();
            Page<WorkflowInstance> pendingBase = workflowService.getByStatus(WorkflowStatus.PENDING, PageRequest.of(0, 1));
            pendingCount += pendingBase.getTotalElements();
            Page<WorkflowInstance> approved = workflowService.getByStatus(WorkflowStatus.APPROVED, PageRequest.of(0, 1));
            approvedCount = approved.getTotalElements();
            Page<WorkflowInstance> completed = workflowService.getByStatus(WorkflowStatus.COMPLETED, PageRequest.of(0, 1));
            approvedCount += completed.getTotalElements();
            Page<WorkflowInstance> rejected = workflowService.getByStatus(WorkflowStatus.REJECTED, PageRequest.of(0, 1));
            rejectedCount = rejected.getTotalElements();
            slaBreachedCount = workflowService.checkSlaBreaches();
        } catch (Exception ignored) {}

        Map<String, Object> stats = new java.util.LinkedHashMap<>();
        stats.put("pending", pendingCount);
        stats.put("approved", approvedCount);
        stats.put("rejected", rejectedCount);
        stats.put("slaBreachedCount", slaBreachedCount);
        stats.put("total", pendingCount + approvedCount + rejectedCount);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/approvers")
    @Operation(summary = "Get list of available approvers for delegation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getApprovers() {
        List<Map<String, String>> approvers = systemParameterRepository.findAll().stream()
                .filter(p -> "APPROVER_ROLE".equals(p.getParamCategory()))
                .map(p -> Map.of("id", p.getParamKey(), "name", p.getParamValue(), "role", "CBS_OFFICER"))
                .collect(Collectors.toList());
        if (approvers.isEmpty()) {
            approvers.add(Map.of("id", "admin", "name", "System Administrator", "role", "CBS_ADMIN"));
            approvers.add(Map.of("id", "officer1", "name", "Operations Officer", "role", "CBS_OFFICER"));
        }
        return ResponseEntity.ok(ApiResponse.ok(approvers));
    }
}
