package com.cbs.casemgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.service.CaseManagementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/v1/cases") @RequiredArgsConstructor
@Tag(name = "Customer Case Management", description = "Cross-product case management with SLA tracking, escalation, notes, resolution")
public class CaseManagementController {
    private final CaseManagementService caseService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> openCase(@RequestBody CustomerCase caseEntity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(caseService.createCase(caseEntity)));
    }

    // Paginated + filtered case listing (server-side filtering)
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerCase>>> listCases(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String caseType,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        boolean hasFilters = search != null || caseType != null || priority != null
                || status != null || dateFrom != null || dateTo != null;
        if (!hasFilters && page == 0 && size >= 100) {
            // Backwards-compatible: return all cases when no filters/pagination
            return ResponseEntity.ok(ApiResponse.ok(caseService.getAllCases()));
        }
        Page<CustomerCase> result = caseService.searchCases(search, caseType, priority, status,
                dateFrom, dateTo, PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{caseNumber}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCase(@PathVariable String caseNumber) {
        CustomerCase c = caseService.getCase(caseNumber);
        List<CaseNote> notes = caseService.getCaseNotes(caseNumber);
        // Build enriched response with activities from notes
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", c.getId());
        result.put("caseNumber", c.getCaseNumber());
        result.put("customerId", c.getCustomerId());
        result.put("customerName", c.getCustomerName());
        result.put("caseType", c.getCaseType());
        result.put("caseCategory", c.getCaseCategory());
        result.put("subCategory", c.getSubCategory());
        result.put("priority", c.getPriority());
        result.put("status", c.getStatus());
        result.put("subject", c.getSubject());
        result.put("description", c.getDescription());
        result.put("channelOriginated", c.getChannelOriginated());
        result.put("assignedTo", c.getAssignedTo());
        result.put("assignedToName", caseService.resolveDisplayName(c.getAssignedTo()));
        result.put("assignedTeam", c.getAssignedTeam());
        result.put("slaDueAt", c.getSlaDueAt());
        result.put("slaBreached", c.getSlaBreached());
        result.put("resolutionSummary", c.getResolutionSummary());
        result.put("resolutionType", c.getResolutionType());
        result.put("compensationAmount", c.getCompensationAmount());
        result.put("compensationApproved", c.getCompensationApproved());
        result.put("compensationApprovedBy", c.getCompensationApprovedBy());
        result.put("compensationApprovedAt", c.getCompensationApprovedAt());
        result.put("compensationRejectionReason", c.getCompensationRejectionReason());
        result.put("rootCause", c.getRootCause());
        result.put("linkedCaseId", c.getLinkedCaseId());
        result.put("linkedTransactionId", c.getLinkedTransactionId());
        result.put("openedAt", c.getCreatedAt());
        result.put("createdAt", c.getCreatedAt());
        result.put("updatedAt", c.getUpdatedAt());
        result.put("resolvedAt", c.getResolvedAt());
        result.put("closedAt", c.getClosedAt());
        // Convert notes to activities format expected by frontend
        List<Map<String, Object>> activities = notes.stream().map(n -> {
            Map<String, Object> act = new LinkedHashMap<>();
            act.put("id", n.getId());
            act.put("type", "NOTE");
            act.put("noteType", n.getNoteType());
            act.put("content", n.getContent());
            act.put("createdBy", n.getCreatedBy());
            act.put("createdAt", n.getCreatedAt());
            return act;
        }).collect(Collectors.toList());
        result.put("activities", activities);
        // Include real persisted attachments
        List<CaseAttachment> attachments = caseService.getCaseAttachments(c.getId());
        List<Map<String, Object>> attList = attachments.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("filename", a.getOriginalFilename());
            m.put("fileSize", a.getFileSize());
            m.put("mimeType", a.getMimeType());
            m.put("uploadedBy", a.getUploadedBy());
            m.put("uploadedAt", a.getUploadedAt());
            m.put("url", "/api/v1/cases/" + caseNumber + "/attachments/" + a.getId() + "/download");
            return m;
        }).collect(Collectors.toList());
        result.put("attachments", attList);
        return ResponseEntity.ok(ApiResponse.ok(result));
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

    @GetMapping("/metadata") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> metadata() {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCaseMetadata()));
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

    @PostMapping(value = "/{caseNumber}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addAttachment(
            @PathVariable String caseNumber,
            @RequestParam("file") MultipartFile file) {
        String uploadedBy = SecurityContextHolder.getContext().getAuthentication().getName();
        CaseAttachment att = caseService.uploadAttachment(caseNumber, file, uploadedBy);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", att.getId());
        resp.put("caseNumber", caseNumber);
        resp.put("filename", att.getOriginalFilename());
        resp.put("fileSize", att.getFileSize());
        resp.put("mimeType", att.getMimeType());
        resp.put("uploadedBy", att.getUploadedBy());
        resp.put("uploadedAt", att.getUploadedAt());
        resp.put("url", "/api/v1/cases/" + caseNumber + "/attachments/" + att.getId() + "/download");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(resp));
    }

    @GetMapping("/{caseNumber}/attachments/{attachmentId}/download")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable String caseNumber, @PathVariable Long attachmentId) {
        byte[] content = caseService.downloadAttachment(attachmentId);
        CaseAttachment att = caseService.getCaseAttachments(caseService.getCase(caseNumber).getId()).stream()
                .filter(a -> a.getId().equals(attachmentId)).findFirst()
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("CaseAttachment", "id", attachmentId));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + att.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(att.getMimeType()))
                .contentLength(att.getFileSize())
                .body(content);
    }

    // ── Compensation approval/rejection ──────────────────────────────────

    @PostMapping("/{caseNumber}/compensation") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerCase>> setCompensation(
            @PathVariable String caseNumber, @RequestBody Map<String, Object> body) {
        java.math.BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
        return ResponseEntity.ok(ApiResponse.ok(caseService.setCompensation(caseNumber, amount)));
    }

    @PostMapping("/{caseNumber}/compensation/approve") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerCase>> approveCompensation(@PathVariable String caseNumber) {
        String approvedBy = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ApiResponse.ok(caseService.approveCompensation(caseNumber, approvedBy)));
    }

    @PostMapping("/{caseNumber}/compensation/reject") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerCase>> rejectCompensation(
            @PathVariable String caseNumber, @RequestParam(required = false) String reason) {
        String rejectedBy = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ApiResponse.ok(caseService.rejectCompensation(caseNumber, rejectedBy, reason)));
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
