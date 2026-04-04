package com.cbs.fees.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import com.cbs.fees.islamic.service.IslamicFeeWaiverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/v1/islamic-fees/waivers")
@RequiredArgsConstructor
public class FeeWaiverController {

    private final IslamicFeeWaiverService waiverService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicFeeWaiver>> requestWaiver(
            @RequestBody IslamicFeeRequests.RequestFeeWaiverRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(waiverService.requestWaiver(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeWaiver>> getWaiver(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.getWaiver(id)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','BRANCH_MANAGER','REGIONAL_MANAGER','HEAD_OFFICE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeWaiver>> approveWaiver(
            @PathVariable Long id,
            @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.approveWaiver(id, approvedBy)));
    }

    @PostMapping("/{id}/apply")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeWaiver>> applyWaiver(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.applyWaiver(id)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','BRANCH_MANAGER','REGIONAL_MANAGER','HEAD_OFFICE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeWaiver>> rejectWaiver(
            @PathVariable Long id,
            @RequestBody IslamicFeeRequests.RejectWaiverRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.rejectWaiver(id, request.getRejectedBy(), request.getReason())));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicFeeWaiver>>> pendingWaivers() {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.getPendingWaivers()));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicFeeWaiver>>> waiversByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.getWaiversByCustomer(customerId)));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<IslamicFeeWaiver>>> waiversByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.getWaiversByContract(contractId)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.FeeWaiverSummary>> waiverSummary(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(waiverService.getWaiverSummary(fromDate, toDate)));
    }
}
