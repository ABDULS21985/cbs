package com.cbs.workflow.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.workflow.entity.*;
import com.cbs.workflow.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/workflows") @RequiredArgsConstructor
@Tag(name = "Workflow & Approvals", description = "Multi-step approval engine with SLA tracking and auto-approve thresholds")
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping("/definitions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<WorkflowDefinition>> createDefinition(@RequestBody WorkflowDefinition def) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(workflowService.createDefinition(def)));
    }

    @GetMapping("/definitions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowDefinition>>> getAllDefinitions() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getAllDefinitions()));
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> initiate(
            @RequestParam String entityType, @RequestParam String triggerEvent, @RequestParam Long entityId,
            @RequestParam(required = false) String entityRef, @RequestParam(required = false) BigDecimal amount,
            @RequestParam(required = false) String currencyCode, @RequestParam String initiatedBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                workflowService.initiateWorkflow(entityType, triggerEvent, entityId, entityRef, amount, currencyCode, initiatedBy)));
    }

    @GetMapping("/instances/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> getInstance(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getInstance(id)));
    }

    @GetMapping("/instances")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> getByStatus(@RequestParam WorkflowStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> result = workflowService.getByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/instances/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> approve(@PathVariable Long id,
            @RequestParam String actionBy, @RequestParam(required = false) String comments) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.approveStep(id, actionBy, comments)));
    }

    @PostMapping("/instances/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkflowInstance>> reject(@PathVariable Long id,
            @RequestParam String actionBy, @RequestParam String comments) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.rejectStep(id, actionBy, comments)));
    }

    @PostMapping("/sla-check")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> checkSla() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("breached", workflowService.checkSlaBreaches())));
    }

    @GetMapping("/tasks")
    @Operation(summary = "Pending workflow tasks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> getPendingTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> pending = workflowService.getByStatus(WorkflowStatus.PENDING, PageRequest.of(page, size));
        Page<WorkflowInstance> inProgress = workflowService.getByStatus(WorkflowStatus.IN_PROGRESS, PageRequest.of(page, size));
        List<WorkflowInstance> tasks = new java.util.ArrayList<>(pending.getContent());
        tasks.addAll(inProgress.getContent());
        return ResponseEntity.ok(ApiResponse.ok(tasks, PageMeta.from(pending)));
    }
}
