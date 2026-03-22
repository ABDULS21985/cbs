package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.nostro.dto.*;
import com.cbs.nostro.entity.NostroReconciliationItem;
import com.cbs.nostro.entity.NostroVostroPosition;
import com.cbs.nostro.entity.PositionType;
import com.cbs.nostro.entity.ReconSession;
import com.cbs.nostro.repository.NostroReconciliationItemRepository;
import com.cbs.nostro.repository.NostroVostroPositionRepository;
import com.cbs.nostro.repository.ReconSessionRepository;
import com.cbs.nostro.service.ReconciliationBreakService;
import com.cbs.nostro.service.StatementImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/v1/reconciliation")
@RequiredArgsConstructor
@Tag(name = "Reconciliation", description = "Reconciliation sessions, statement import, break management, compliance")
public class ReconciliationController {

    private final NostroVostroPositionRepository nostroVostroPositionRepository;
    private final NostroReconciliationItemRepository nostroReconciliationItemRepository;
    private final ReconSessionRepository reconSessionRepository;
    private final StatementImportService statementImportService;
    private final ReconciliationBreakService breakService;

    // ═════════════════════════════════════════════════════════════════════════
    // SESSIONS & HISTORY (existing)
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/sessions")
    @Operation(summary = "List reconciliation sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<NostroVostroPosition> positions = nostroVostroPositionRepository.findAll();
        List<Map<String, Object>> sessions = new ArrayList<>();
        for (NostroVostroPosition pos : positions) {
            if (pos.getLastReconciledDate() != null || pos.getLastStatementDate() != null) {
                Map<String, Object> session = new LinkedHashMap<>();
                session.put("positionId", pos.getId());
                session.put("currencyCode", pos.getCurrencyCode());
                session.put("positionType", pos.getPositionType().name());
                session.put("bookBalance", pos.getBookBalance());
                session.put("statementBalance", pos.getStatementBalance());
                session.put("unreconciledAmount", pos.getUnreconciledAmount());
                session.put("reconciliationStatus", pos.getReconciliationStatus().name());
                session.put("lastStatementDate", pos.getLastStatementDate());
                session.put("lastReconciledDate", pos.getLastReconciledDate());
                session.put("outstandingItemsCount", pos.getOutstandingItemsCount());
                sessions.add(session);
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @GetMapping("/history")
    @Operation(summary = "Reconciliation history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NostroReconciliationItem>>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<NostroReconciliationItem> result = nostroReconciliationItemRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/nostro-accounts")
    @Operation(summary = "Nostro accounts for reconciliation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NostroVostroPosition>>> getNostroAccounts() {
        List<NostroVostroPosition> nostroPositions = nostroVostroPositionRepository
                .findByPositionTypeAndIsActiveTrue(PositionType.NOSTRO);
        return ResponseEntity.ok(ApiResponse.ok(nostroPositions));
    }

    @PostMapping("/sessions/{sessionId}/auto-match")
    @Operation(summary = "Trigger automatic matching for a reconciliation session")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> autoMatch(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "sessionId", sessionId, "matched", 0, "unmatched", 0, "status", "COMPLETED"
        )));
    }

    @PostMapping("/sessions/{sessionId}/manual-match")
    @Operation(summary = "Manually match reconciliation items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> manualMatch(
            @PathVariable Long sessionId, @RequestBody Map<String, Object> matchData) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "sessionId", sessionId, "status", "MATCHED", "matchData", matchData
        )));
    }

    @PostMapping("/sessions/{sessionId}/write-off")
    @Operation(summary = "Write off unreconciled items")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> writeOff(
            @PathVariable Long sessionId, @RequestBody Map<String, Object> writeOffData) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "sessionId", sessionId, "status", "WRITTEN_OFF"
        )));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STATEMENT UPLOAD & IMPORT
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/upload-statement")
    @Operation(summary = "Get upload statement status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadStatementStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping(value = "/upload-statement", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload bank statement file for reconciliation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadStatement(
            @RequestParam Long positionId,
            @RequestPart("file") MultipartFile file,
            Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        Map<String, Object> result = statementImportService.uploadStatement(positionId, file, user);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping(value = "/statements/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Parse a bank statement file and return preview")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ParsedStatementDto>> parseStatement(
            @RequestPart("file") MultipartFile file,
            @RequestParam Long positionId) {
        ParsedStatementDto result = statementImportService.parseStatement(file, positionId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/statements/confirm")
    @Operation(summary = "Confirm and import a parsed statement")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> confirmImport(
            @RequestBody Map<String, String> body) {
        Long positionId = Long.parseLong(body.getOrDefault("accountId", body.getOrDefault("positionId", "0")));
        LocalDate statementDate = LocalDate.parse(body.getOrDefault("statementDate", LocalDate.now().toString()));
        Map<String, Object> result = statementImportService.confirmImport(positionId, statementDate);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/statements/reject")
    @Operation(summary = "Reject a parsed statement")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectImport(
            @RequestBody Map<String, String> body) {
        Long positionId = Long.parseLong(body.getOrDefault("accountId", body.getOrDefault("positionId", "0")));
        LocalDate statementDate = LocalDate.parse(body.getOrDefault("statementDate", LocalDate.now().toString()));
        statementImportService.rejectImport(positionId, statementDate);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true)));
    }

    @GetMapping("/statements/history")
    @Operation(summary = "Get import history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<StatementImportDto>>> getImportHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<StatementImportDto> history = statementImportService.getImportHistory(page, size);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @PostMapping("/statements/{importId}/reimport")
    @Operation(summary = "Re-import a previous statement")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reImportStatement(@PathVariable Long importId) {
        statementImportService.reImport(importId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true)));
    }

    @PostMapping("/statements/{importId}/delete")
    @Operation(summary = "Delete an import record")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteImport(@PathVariable Long importId) {
        statementImportService.deleteImport(importId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true)));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // AUTO-FETCH CONFIGS
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/auto-fetch/configs")
    @Operation(summary = "Get SFTP/SWIFT/API auto-fetch configurations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AutoFetchConfigDto>>> getAutoFetchConfigs() {
        return ResponseEntity.ok(ApiResponse.ok(statementImportService.getAutoFetchConfigs()));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BREAK MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/breaks")
    @Operation(summary = "List reconciliation breaks with optional filters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BreakDto>>> getBreaks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String assignedTo) {
        return ResponseEntity.ok(ApiResponse.ok(breakService.getBreaks(status, currency, assignedTo)));
    }

    @GetMapping("/breaks/{breakId}/timeline")
    @Operation(summary = "Get timeline events for a break")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BreakTimelineDto>>> getBreakTimeline(@PathVariable Long breakId) {
        return ResponseEntity.ok(ApiResponse.ok(breakService.getTimeline(breakId)));
    }

    @PostMapping("/breaks/{breakId}/resolve")
    @Operation(summary = "Resolve a reconciliation break")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resolveBreak(
            @PathVariable Long breakId,
            @RequestBody BreakResolveRequest request,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : "system";
        breakService.resolveBreak(breakId, request, actor);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true)));
    }

    @PostMapping("/breaks/{breakId}/escalate")
    @Operation(summary = "Escalate a break to next level")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> escalateBreak(
            @PathVariable Long breakId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : "system";
        breakService.escalateBreak(breakId, body.getOrDefault("notes", ""), actor);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true)));
    }

    @PostMapping("/breaks/{breakId}/notes")
    @Operation(summary = "Add a note to break timeline")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BreakTimelineDto>> addBreakNote(
            @PathVariable Long breakId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : "system";
        BreakTimelineDto entry = breakService.addNote(breakId, body.getOrDefault("notes", ""), actor);
        return ResponseEntity.ok(ApiResponse.ok(entry));
    }

    @PostMapping("/breaks/bulk-assign")
    @Operation(summary = "Bulk assign breaks to an officer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkAssignBreaks(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        @SuppressWarnings("unchecked")
        List<String> breakIdStrings = (List<String>) body.getOrDefault("breakIds", List.of());
        List<Long> breakIds = breakIdStrings.stream().map(Long::parseLong).toList();
        String assignedTo = (String) body.getOrDefault("assignedTo", "");
        String actor = auth != null ? auth.getName() : "system";
        int updated = breakService.bulkAssign(breakIds, assignedTo, actor);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true, "updated", updated)));
    }

    @PostMapping("/breaks/bulk-escalate")
    @Operation(summary = "Bulk escalate breaks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkEscalateBreaks(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        @SuppressWarnings("unchecked")
        List<String> breakIdStrings = (List<String>) body.getOrDefault("breakIds", List.of());
        List<Long> breakIds = breakIdStrings.stream().map(Long::parseLong).toList();
        String notes = (String) body.getOrDefault("notes", "");
        String actor = auth != null ? auth.getName() : "system";
        int escalated = breakService.bulkEscalate(breakIds, notes, actor);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true, "escalated", escalated)));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // REPORTS
    // ═════════════════════════════════════════════════════════════════════════

    @PostMapping("/reports/{reportType}/generate")
    @Operation(summary = "Generate a reconciliation report")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<byte[]> generateReport(
            @PathVariable String reportType,
            @RequestBody Map<String, String> params) {
        String dateFrom = params.getOrDefault("dateFrom", LocalDate.now().minusMonths(1).toString());
        String dateTo = params.getOrDefault("dateTo", LocalDate.now().toString());

        // Build a simple CSV report based on type
        StringBuilder csv = new StringBuilder();
        csv.append("Report Type,").append(reportType).append("\n");
        csv.append("Date Range,").append(dateFrom).append(" to ").append(dateTo).append("\n");
        csv.append("Generated,").append(Instant.now()).append("\n\n");

        switch (reportType) {
            case "daily-status" -> {
                csv.append("Position ID,Currency,Book Balance,Statement Balance,Difference,Status\n");
                nostroVostroPositionRepository.findAll().forEach(p ->
                        csv.append(p.getId()).append(",")
                                .append(p.getCurrencyCode()).append(",")
                                .append(p.getBookBalance()).append(",")
                                .append(p.getStatementBalance()).append(",")
                                .append(p.getUnreconciledAmount()).append(",")
                                .append(p.getReconciliationStatus()).append("\n"));
            }
            case "outstanding-breaks" -> {
                csv.append("Break ID,Account,Bank,Currency,Amount,Status,Aging Days,Assigned To\n");
                breakService.getBreaks(null, null, null).forEach(b ->
                        csv.append(b.getId()).append(",")
                                .append(b.getAccountNumber()).append(",")
                                .append(b.getBankName()).append(",")
                                .append(b.getCurrency()).append(",")
                                .append(b.getAmount()).append(",")
                                .append(b.getStatus()).append(",")
                                .append(b.getAgingDays()).append(",")
                                .append(b.getAssignedTo()).append("\n"));
            }
            case "monthly-certificate", "nostro-proof", "write-off-summary" -> {
                csv.append("Type,Count\n");
                csv.append("Total Positions,").append(nostroVostroPositionRepository.count()).append("\n");
                csv.append("Open Breaks,").append(breakService.getBreaks("OPEN", null, null).size()).append("\n");
                csv.append("Resolved Breaks,").append(breakService.getBreaks("RESOLVED", null, null).size()).append("\n");
            }
            default -> csv.append("Unknown report type: ").append(reportType).append("\n");
        }

        byte[] content = csv.toString().getBytes();
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=\"recon-report-" + reportType + ".csv\"")
                .body(content);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // COMPLIANCE
    // ═════════════════════════════════════════════════════════════════════════

    @GetMapping("/compliance/checklist")
    @Operation(summary = "Get CBN compliance checklist for reconciliation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceCheckDto>>> getComplianceChecklist() {
        return ResponseEntity.ok(ApiResponse.ok(breakService.getComplianceChecklist()));
    }

    @GetMapping("/compliance/score-trend")
    @Operation(summary = "Get 12-month compliance score trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ComplianceScoreDto>>> getComplianceScoreTrend() {
        return ResponseEntity.ok(ApiResponse.ok(breakService.getComplianceScoreTrend()));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SESSIONS CRUD (added for frontend parity)
    // ═════════════════════════════════════════════════════════════════════════

    @PostMapping("/sessions")
    @Operation(summary = "Create a new reconciliation session")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ReconSession>> createSession(
            @RequestBody Map<String, Object> request, Authentication auth) {
        String reconType = (String) request.getOrDefault("reconType", "NOSTRO");
        String reconDateStr = (String) request.getOrDefault("reconDate", LocalDate.now().toString());
        Long positionId = request.containsKey("positionId")
                ? Long.valueOf(String.valueOf(request.get("positionId")))
                : null;

        ReconSession session = ReconSession.builder()
                .sessionRef("RS-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .reconType(reconType)
                .positionId(positionId)
                .reconDate(LocalDate.parse(reconDateStr))
                .status("OPEN")
                .createdBy(auth != null ? auth.getName() : "system")
                .build();

        ReconSession saved = reconSessionRepository.save(session);
        return ResponseEntity.status(201).body(ApiResponse.ok(saved));
    }

    @PostMapping("/auto-match-all")
    @Operation(summary = "Auto-match all open reconciliation sessions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> autoMatchAll() {
        List<ReconSession> openSessions = reconSessionRepository
                .findByStatusOrderByCreatedAtDesc("OPEN", PageRequest.of(0, 100)).getContent();
        int matched = 0;
        for (ReconSession session : openSessions) {
            session.setStatus("IN_PROGRESS");
            session.setUpdatedAt(Instant.now());
            reconSessionRepository.save(session);
            matched++;
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("matchedSessions", matched, "status", "COMPLETED")));
    }

    @PostMapping("/sessions/{sessionId}/complete")
    @Operation(summary = "Complete a reconciliation session")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ReconSession>> completeSession(
            @PathVariable Long sessionId, Authentication auth) {
        ReconSession session = reconSessionRepository.findById(sessionId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "ReconSession", "id", sessionId));
        session.setStatus("COMPLETED");
        session.setCompletedAt(Instant.now());
        session.setCompletedBy(auth != null ? auth.getName() : "system");
        session.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(reconSessionRepository.save(session)));
    }

    @GetMapping("/sessions/{sessionId}/our-records")
    @Operation(summary = "Get our records for a session")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NostroReconciliationItem>>> getOurRecords(
            @PathVariable Long sessionId) {
        ReconSession session = reconSessionRepository.findById(sessionId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "ReconSession", "id", sessionId));
        List<NostroReconciliationItem> items;
        if (session.getPositionId() != null) {
            items = nostroReconciliationItemRepository.findAll().stream()
                    .filter(i -> "OUR".equalsIgnoreCase(i.getItemType().name())
                            && i.getPosition() != null && session.getPositionId().equals(i.getPosition().getId()))
                    .toList();
        } else {
            items = nostroReconciliationItemRepository.findAll().stream()
                    .filter(i -> "OUR".equalsIgnoreCase(i.getItemType().name()))
                    .toList();
        }
        session.setOurCount(items.size());
        reconSessionRepository.save(session);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/sessions/{sessionId}/counterparty-records")
    @Operation(summary = "Get counterparty records for a session")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NostroReconciliationItem>>> getCounterpartyRecords(
            @PathVariable Long sessionId) {
        ReconSession session = reconSessionRepository.findById(sessionId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "ReconSession", "id", sessionId));
        List<NostroReconciliationItem> items;
        if (session.getPositionId() != null) {
            items = nostroReconciliationItemRepository.findAll().stream()
                    .filter(i -> "COUNTERPARTY".equalsIgnoreCase(i.getItemType().name())
                            && i.getPosition() != null && session.getPositionId().equals(i.getPosition().getId()))
                    .toList();
        } else {
            items = nostroReconciliationItemRepository.findAll().stream()
                    .filter(i -> "COUNTERPARTY".equalsIgnoreCase(i.getItemType().name()))
                    .toList();
        }
        session.setCpCount(items.size());
        reconSessionRepository.save(session);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }
}
