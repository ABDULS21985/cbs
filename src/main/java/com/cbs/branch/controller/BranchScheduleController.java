package com.cbs.branch.controller;

import com.cbs.branch.service.BranchOperationsService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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
import java.util.Map;

@RestController
@RequestMapping("/v1/branches/{branchId}/schedule")
@RequiredArgsConstructor
@Tag(name = "Branch Staff Scheduling", description = "Branch staff roster and shift swaps")
public class BranchScheduleController {

    private final BranchOperationsService branchOperationsService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchOperationsService.BranchStaffScheduleView>>> getSchedule(
            @PathVariable Long branchId,
            @RequestParam LocalDate weekOf) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getStaffSchedule(branchId, weekOf)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchOperationsService.BranchStaffScheduleView>>> saveSchedule(
            @PathVariable Long branchId,
            @RequestBody SaveScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.saveStaffSchedule(
                branchId,
                request.staffId(),
                request.staffName(),
                request.role(),
                request.weekOf(),
                request.schedule())));
    }

    @PostMapping("/swap")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchOperationsService.BranchStaffScheduleView>>> swapShift(
            @PathVariable Long branchId,
            @RequestBody SwapShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.swapShift(
                branchId,
                request.staffId1(),
                request.staffId2(),
                request.date1(),
                request.date2(),
                request.reason())));
    }

    public record SaveScheduleRequest(
            String staffId,
            String staffName,
            String role,
            LocalDate weekOf,
            Map<String, String> schedule) {}

    public record SwapShiftRequest(
            String staffId1,
            String staffId2,
            LocalDate date1,
            LocalDate date2,
            String reason) {}
}
