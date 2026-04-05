package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.regulatory.service.RegulatoryReturnWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/regulatory")
@RequiredArgsConstructor
public class RegulatoryReportingDashboardController {

    private final RegulatoryReturnWorkflowService workflowService;

    @GetMapping("/calendar/{jurisdiction}/{year}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RegulatoryResponses.RegulatoryCalendarEntry>>> calendar(
            @PathVariable String jurisdiction,
            @PathVariable int year) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getRegulatoryCalendar(jurisdiction, year)));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','CBS_ADMIN','CFO')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.RegulatoryReportingDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getDashboard()));
    }
}
