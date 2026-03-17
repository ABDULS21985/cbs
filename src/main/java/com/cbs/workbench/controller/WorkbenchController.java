package com.cbs.workbench.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.workbench.entity.StaffWorkbenchSession;
import com.cbs.workbench.service.WorkbenchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/workbench") @RequiredArgsConstructor
@Tag(name = "Staff Workbench", description = "Unified staff workspace — customer context, tabs, active cases, session management")
public class WorkbenchController {
    private final WorkbenchService workbenchService;

    @PostMapping("/sessions") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<StaffWorkbenchSession>> start(
            @RequestParam Long staffUserId, @RequestParam String staffName, @RequestParam String workbenchType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                workbenchService.createSession(staffUserId, staffName, workbenchType)));
    }
    @PostMapping("/sessions/{sessionId}/load-customer") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<StaffWorkbenchSession>> loadCustomer(
            @PathVariable String sessionId, @RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(workbenchService.loadCustomerContext(sessionId, customerId)));
    }
    @PostMapping("/sessions/{sessionId}/open-tab") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<StaffWorkbenchSession>> openTab(
            @PathVariable String sessionId, @RequestParam String tabName) {
        return ResponseEntity.ok(ApiResponse.ok(workbenchService.openTab(sessionId, tabName)));
    }
    @PostMapping("/sessions/{sessionId}/logout") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<StaffWorkbenchSession>> logout(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(workbenchService.endSession(sessionId)));
    }
    @GetMapping("/sessions/staff/{staffUserId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<StaffWorkbenchSession>>> getActive(@PathVariable Long staffUserId) {
        return ResponseEntity.ok(ApiResponse.ok(workbenchService.getActiveSessions(staffUserId)));
    }
}
