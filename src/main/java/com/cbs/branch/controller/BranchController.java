package com.cbs.branch.controller;

import com.cbs.branch.dto.SaveScheduleRequest;
import com.cbs.branch.dto.SwapShiftRequest;
import com.cbs.branch.entity.*;
import com.cbs.branch.service.BranchService;
import com.cbs.branch.service.BranchOperationsService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/branches") @RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Branch hierarchy, location, services")
public class BranchController {

    private final BranchService branchService;
    private final BranchOperationsService branchOpsService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> create(@RequestBody Branch branch) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(branchService.createBranch(branch)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Branch>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranch(id)));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Branch>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranchByCode(code)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getAllActiveBranches()));
    }

    @GetMapping("/children/{parentCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getChildren(@PathVariable String parentCode) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getChildBranches(parentCode)));
    }

    @GetMapping("/region/{regionCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getRegion(@PathVariable String regionCode) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getRegionBranches(regionCode)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getByType(@PathVariable BranchType type) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranchesByType(type)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> update(@PathVariable Long id, @RequestBody Branch updated) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.updateBranch(id, updated)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> close(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.closeBranch(id)));
    }

    // ── Branch Stats (facade for frontend) ────────────────────────────────
    @GetMapping("/{branchId}/stats")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getBranchStats(branchId)));
    }

    // ── Queue Management (facades) ────────────────────────────────────────
    @GetMapping("/{branchId}/queue/live")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLiveQueue(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getQueueStatus(branchId)));
    }

    @GetMapping("/{branchId}/queue/history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchQueueTicket>>> getQueueHistory(
            @PathVariable Long branchId, @RequestParam(required = false) String date) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getQueueHistory(branchId, date)));
    }

    @PostMapping("/{branchId}/queue/issue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> issueTicket(
            @PathVariable Long branchId, @RequestBody BranchQueueTicket ticket) {
        ticket.setBranchId(branchId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(branchOpsService.issueQueueTicket(ticket)));
    }

    @PostMapping("/{branchId}/queue/call-next")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> callNext(
            @PathVariable Long branchId,
            @RequestParam(defaultValue = "1") String counterNumber,
            @RequestParam(defaultValue = "system") String employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.callNextTicket(branchId, counterNumber, employeeId)));
    }

    @PostMapping("/{branchId}/queue/{ticketId}/complete")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> completeTicket(
            @PathVariable Long branchId, @PathVariable Long ticketId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.completeService(ticketId)));
    }

    @PostMapping("/{branchId}/queue/{ticketId}/no-show")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> noShowTicket(
            @PathVariable Long branchId, @PathVariable Long ticketId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.markNoShow(ticketId)));
    }

    // ── Staff Schedule (facades) ──────────────────────────────────────────
    @GetMapping("/{branchId}/staff-schedule")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSchedule(
            @PathVariable Long branchId, @RequestParam(required = false) String weekOf) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getSchedule(branchId, weekOf)));
    }

    @PostMapping("/{branchId}/staff-schedule")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> saveSchedule(
            @PathVariable Long branchId, @Valid @RequestBody SaveScheduleRequest request) {
        LocalDate weekOf = LocalDate.parse(request.weekOf());
        var result = branchOpsService.saveStaffSchedule(
                branchId, request.staffId(), request.staffName(), request.role(),
                weekOf, request.schedule());
        return ResponseEntity.ok(ApiResponse.ok(result.stream()
                .map(v -> Map.<String, Object>of(
                        "staffId", v.staffId(), "staffName", v.staffName(),
                        "role", v.role(), "schedule", v.schedule()))
                .toList()));
    }

    @PostMapping("/{branchId}/staff-schedule/swap")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> swapShift(
            @PathVariable Long branchId, @Valid @RequestBody SwapShiftRequest request) {
        var result = branchOpsService.swapShift(
                branchId, request.staffId1(), request.staffId2(),
                LocalDate.parse(request.date1()), LocalDate.parse(request.date2()),
                request.reason() != null ? request.reason() : "");
        return ResponseEntity.ok(ApiResponse.ok(result.stream()
                .map(v -> Map.<String, Object>of(
                        "staffId", v.staffId(), "staffName", v.staffName(),
                        "role", v.role(), "schedule", v.schedule()))
                .toList()));
    }

    // ── Facilities (facades) ──────────────────────────────────────────────
    @GetMapping("/{branchId}/facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchFacility>>> getBranchFacilities(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getFacilitiesByBranch(branchId, "OPERATIONAL")));
    }

    @PostMapping("/{branchId}/facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchFacility>> addBranchFacility(
            @PathVariable Long branchId, @RequestBody BranchFacility facility) {
        facility.setBranchId(branchId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(branchOpsService.registerFacility(facility)));
    }

    // ── Service Plan (facade) ─────────────────────────────────────────────
    @GetMapping("/{branchId}/service-plan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchServicePlan>>> getServicePlan(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getServicePlansByBranch(branchId)));
    }

    // ── Rankings ──────────────────────────────────────────────────────────
    @GetMapping("/rankings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRankings() {
        return ResponseEntity.ok(ApiResponse.ok(branchOpsService.getBranchRankings()));
    }
}
