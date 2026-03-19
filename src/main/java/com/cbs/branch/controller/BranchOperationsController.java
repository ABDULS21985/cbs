package com.cbs.branch.controller;

import com.cbs.branch.entity.*;
import com.cbs.branch.service.BranchOperationsService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/branch-operations")
@RequiredArgsConstructor
@Tag(name = "Branch Operations", description = "Facilities, queue management, staff scheduling, and service plans")
public class BranchOperationsController {

    private final BranchOperationsService branchOperationsService;

    // ── Facility Endpoints ───────────────────────────────────────────────

    @GetMapping("/facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchFacility>>> listFacilities() {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getAllFacilities()));
    }

    @PostMapping("/facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchFacility>> registerFacility(@RequestBody BranchFacility facility) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(branchOperationsService.registerFacility(facility)));
    }

    @GetMapping("/facilities/branch/{branchId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchFacility>>> getFacilitiesByBranch(
            @PathVariable Long branchId,
            @RequestParam(defaultValue = "OPERATIONAL") String status) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getFacilitiesByBranch(branchId, status)));
    }

    @PostMapping("/facilities/{id}/inspect")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchFacility>> recordInspection(
            @PathVariable Long id,
            @RequestParam String condition) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.recordInspection(id, condition)));
    }

    @GetMapping("/facilities/overdue-inspections")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchFacility>>> getOverdueInspections() {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getOverdueInspections()));
    }

    // ── Queue Ticket Endpoints ───────────────────────────────────────────

    @GetMapping("/queue-tickets")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchQueueTicket>>> listQueueTickets() {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getAllQueueTickets()));
    }

    @PostMapping("/queue-tickets")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> issueQueueTicket(@RequestBody BranchQueueTicket ticket) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(branchOperationsService.issueQueueTicket(ticket)));
    }

    @PostMapping("/queue-tickets/call-next/{branchId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> callNextTicket(
            @PathVariable Long branchId,
            @RequestParam String counterNumber,
            @RequestParam String employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.callNextTicket(branchId, counterNumber, employeeId)));
    }

    @PostMapping("/queue-tickets/{id}/complete")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchQueueTicket>> completeService(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.completeService(id)));
    }

    @GetMapping("/queue-tickets/status/{branchId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQueueStatus(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getQueueStatus(branchId)));
    }

    // ── Service Plan Endpoints ───────────────────────────────────────────

    @GetMapping("/service-plans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BranchServicePlan>>> listServicePlans() {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.getAllServicePlans()));
    }

    @PostMapping("/service-plans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchServicePlan>> createServicePlan(@RequestBody BranchServicePlan plan) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(branchOperationsService.createServicePlan(plan)));
    }

    @PutMapping("/service-plans/{id}/actuals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BranchServicePlan>> updateActuals(
            @PathVariable Long id,
            @RequestParam int txnVol,
            @RequestParam int newAccts,
            @RequestParam int crossSell) {
        return ResponseEntity.ok(ApiResponse.ok(branchOperationsService.updateActuals(id, txnVol, newAccts, crossSell)));
    }
}
