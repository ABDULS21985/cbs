package com.cbs.casemgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.service.CaseManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/cases") @RequiredArgsConstructor
@Tag(name = "Customer Case Management", description = "Cross-product case management with SLA tracking, escalation, notes, resolution")
public class CaseManagementController {
    private final CaseManagementService caseService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> openCase(@RequestBody CustomerCase caseEntity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(caseService.createCase(caseEntity)));
    }
    @PostMapping("/{caseNumber}/assign") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> assign(@PathVariable String caseNumber, @RequestParam String assignedTo, @RequestParam(required = false) String team) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.assignCase(caseNumber, assignedTo, team)));
    }
    @PostMapping("/{caseNumber}/resolve") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> resolve(@PathVariable String caseNumber, @RequestParam String resolutionType, @RequestParam(required = false) String summary) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.resolveCase(caseNumber, resolutionType, summary, null)));
    }
    @PostMapping("/{caseNumber}/escalate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> escalate(@PathVariable String caseNumber, @RequestParam String escalateTo) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.escalateCase(caseNumber, escalateTo)));
    }
    @PostMapping("/{caseNumber}/notes") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseNote>> addNote(@PathVariable String caseNumber, @RequestBody CaseNote note) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(caseService.addNote(caseNumber, note.getContent(), note.getNoteType(), note.getCreatedBy())));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getByCustomer(customerId)));
    }
    @GetMapping("/sla-breached") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> slaBreached() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.checkSlaBreaches()));
    }
}
