package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.workflow.entity.WorkflowInstance;
import com.cbs.workflow.entity.WorkflowStatus;
import com.cbs.workflow.repository.WorkflowInstanceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/v1/workflow")
@RequiredArgsConstructor
@Tag(name = "Workflow Tasks", description = "Pending workflow tasks")
public class WorkflowTaskController {

    private final WorkflowInstanceRepository workflowInstanceRepository;

    @GetMapping("/tasks")
    @Operation(summary = "List pending workflow tasks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkflowInstance>>> getPendingTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WorkflowInstance> pending = workflowInstanceRepository.findByStatusOrderByCreatedAtDesc(
                WorkflowStatus.PENDING, PageRequest.of(page, size));
        Page<WorkflowInstance> inProgress = workflowInstanceRepository.findByStatusOrderByCreatedAtDesc(
                WorkflowStatus.IN_PROGRESS, PageRequest.of(page, size));
        List<WorkflowInstance> tasks = new ArrayList<>(pending.getContent());
        tasks.addAll(inProgress.getContent());
        return ResponseEntity.ok(ApiResponse.ok(tasks, PageMeta.from(pending)));
    }
}
