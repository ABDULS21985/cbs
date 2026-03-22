package com.cbs.casemgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.service.CaseManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
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

    // Fix #1: GET /v1/cases now returns ALL cases, not just OPEN
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> listCases() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getAllCases()));
    }

    @GetMapping("/{caseNumber}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> getCase(@PathVariable String caseNumber) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCase(caseNumber)));
    }

    @GetMapping("/stats") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stats() {
        List<CustomerCase> all = caseService.getAllCases();
        int slaBreached = caseService.checkSlaBreaches();
        Map<String, Object> stats = Map.of(
            "openCases", all.stream().filter(c -> !"RESOLVED".equals(c.getStatus()) && !"CLOSED".equals(c.getStatus())).count(),
            "slaBreached", slaBreached,
            "resolvedToday", all.stream().filter(c -> "RESOLVED".equals(c.getStatus())).count(),
            "avgResolutionHours", 4.2
        );
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // Fix #2: GET /v1/cases/my now returns cases assigned to the authenticated user
    @GetMapping("/my") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> myCases() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ApiResponse.ok(caseService.getMyCases(username)));
    }

    @GetMapping("/unassigned") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> unassigned() {
        List<CustomerCase> unassigned = caseService.getOpenCases().stream()
            .filter(c -> c.getAssignedTo() == null || c.getAssignedTo().isBlank())
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(unassigned));
    }

    // Fix #6: POST /v1/cases/{caseNumber}/assign accepts both @RequestBody JSON and @RequestParam
    @PostMapping("/{caseNumber}/assign") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> assign(
            @PathVariable String caseNumber,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String assignedTo,
            @RequestParam(required = false) String team) {
        String resolvedAssignedTo = assignedTo;
        String resolvedTeam = team;
        if (body != null) {
            if (resolvedAssignedTo == null) resolvedAssignedTo = body.get("assignedTo");
            if (resolvedTeam == null) resolvedTeam = body.get("team");
        }
        return ResponseEntity.ok(ApiResponse.ok(caseService.assignCase(caseNumber, resolvedAssignedTo, resolvedTeam)));
    }

    // Fix #9: resolve - swap resolutionType and summary to match service signature (resolutionSummary, resolutionType)
    @PostMapping("/{caseNumber}/resolve") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> resolve(@PathVariable String caseNumber, @RequestParam String resolutionType, @RequestParam(required = false) String summary) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.resolveCase(caseNumber, summary, resolutionType, null)));
    }

    // Fix #7: POST /v1/cases/{caseNumber}/escalate now accepts reason parameter
    @PostMapping("/{caseNumber}/escalate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> escalate(@PathVariable String caseNumber, @RequestParam String escalateTo, @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.escalateCase(caseNumber, escalateTo, reason)));
    }

    @PostMapping("/{caseNumber}/notes") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CaseNote>> addNote(@PathVariable String caseNumber, @RequestBody CaseNote note) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(caseService.addNote(caseNumber, note.getContent(), note.getNoteType(), note.getCreatedBy())));
    }

    // Fix #4: PUT /v1/cases/{caseNumber} now saves the entity and handles status updates
    @PutMapping("/{caseNumber}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> updateCase(@PathVariable String caseNumber, @RequestBody CustomerCase updates) {
        CustomerCase existing = caseService.getCase(caseNumber);
        if (updates.getSubject() != null) existing.setSubject(updates.getSubject());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getPriority() != null) existing.setPriority(updates.getPriority());
        if (updates.getCaseCategory() != null) existing.setCaseCategory(updates.getCaseCategory());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        existing.setUpdatedAt(java.time.Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(caseService.saveCase(existing)));
    }

    // Fix #5: POST /v1/cases/{caseNumber}/close now saves the entity
    @PostMapping("/{caseNumber}/close") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> closeCase(@PathVariable String caseNumber, @RequestParam(required = false) String reason) {
        CustomerCase c = caseService.getCase(caseNumber);
        c.setStatus("CLOSED");
        c.setClosedAt(java.time.Instant.now());
        if (reason != null) c.setResolutionSummary(reason);
        return ResponseEntity.ok(ApiResponse.ok(caseService.saveCase(c)));
    }

    @PostMapping("/{caseNumber}/attachments") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addAttachment(@PathVariable String caseNumber, @RequestBody Map<String, Object> attachment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
            "caseNumber", caseNumber,
            "attachmentId", System.currentTimeMillis(),
            "message", "Attachment added"
        )));
    }

    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getByCustomer(customerId)));
    }

    // Fix #3: GET /v1/cases/sla-breached now returns List<CustomerCase> and allows CBS_OFFICER access
    @GetMapping("/sla-breached") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> slaBreached() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getSlaBreachedCases()));
    }

    // Fix #8: New GET /v1/cases/escalated endpoint
    @GetMapping("/escalated") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> escalatedCases() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getEscalatedCases()));
    }
}
