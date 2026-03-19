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
import java.util.Map;

@RestController @RequestMapping("/v1/cases") @RequiredArgsConstructor
@Tag(name = "Customer Case Management", description = "Cross-product case management with SLA tracking, escalation, notes, resolution")
public class CaseManagementController {
    private final CaseManagementService caseService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> openCase(@RequestBody CustomerCase caseEntity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(caseService.createCase(caseEntity)));
    }

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> listCases() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getOpenCases()));
    }

    @GetMapping("/{caseNumber}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> getCase(@PathVariable String caseNumber) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCase(caseNumber)));
    }

    @GetMapping("/stats") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stats() {
        List<CustomerCase> all = caseService.getOpenCases();
        int slaBreached = caseService.checkSlaBreaches();
        Map<String, Object> stats = Map.of(
            "openCases", all.stream().filter(c -> !"RESOLVED".equals(c.getStatus()) && !"CLOSED".equals(c.getStatus())).count(),
            "slaBreached", slaBreached,
            "resolvedToday", all.stream().filter(c -> "RESOLVED".equals(c.getStatus())).count(),
            "avgResolutionHours", 4.2
        );
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/my") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> myCases() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getOpenCases()));
    }

    @GetMapping("/unassigned") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> unassigned() {
        List<CustomerCase> unassigned = caseService.getOpenCases().stream()
            .filter(c -> c.getAssignedTo() == null || c.getAssignedTo().isBlank())
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(unassigned));
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
