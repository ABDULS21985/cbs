package com.cbs.workbench.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.workbench.entity.WorkbenchAlert;
import com.cbs.workbench.entity.WorkbenchQuickAction;
import com.cbs.workbench.entity.WorkbenchWidget;
import com.cbs.workbench.service.WorkbenchEnhancementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/workbench-config")
@RequiredArgsConstructor
@Tag(name = "Workbench Enhancement", description = "Widgets, quick actions, and alerts for staff workbench")
public class WorkbenchEnhancementController {

    private final WorkbenchEnhancementService enhancementService;

    @PostMapping("/widgets")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkbenchWidget>> createWidget(@RequestBody WorkbenchWidget widget) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(enhancementService.registerWidget(widget)));
    }

    @GetMapping("/widgets")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkbenchWidget>>> getActiveWidgets() {
        return ResponseEntity.ok(ApiResponse.ok(enhancementService.getActiveWidgets()));
    }

    @PostMapping("/quick-actions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkbenchQuickAction>> createQuickAction(@RequestBody WorkbenchQuickAction action) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(enhancementService.registerQuickAction(action)));
    }

    @GetMapping("/quick-actions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkbenchQuickAction>>> getActiveQuickActions() {
        return ResponseEntity.ok(ApiResponse.ok(enhancementService.getActiveQuickActions()));
    }

    @GetMapping("/load/{workbenchType}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> loadWorkbench(@PathVariable String workbenchType) {
        return ResponseEntity.ok(ApiResponse.ok(enhancementService.loadWorkbench(workbenchType)));
    }

    @PostMapping("/alerts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkbenchAlert>> raiseAlert(
            @RequestParam Long sessionId, @RequestParam String alertType,
            @RequestParam String severity, @RequestParam String message) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(enhancementService.raiseAlert(sessionId, alertType, severity, message)));
    }

    @PostMapping("/alerts/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<WorkbenchAlert>> acknowledgeAlert(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(enhancementService.acknowledgeAlert(id)));
    }

    @GetMapping("/alerts/session/{sessionId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<WorkbenchAlert>>> getSessionAlerts(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(enhancementService.getAlerts(sessionId)));
    }
}
