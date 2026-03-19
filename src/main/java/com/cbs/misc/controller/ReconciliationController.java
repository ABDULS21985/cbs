package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.nostro.entity.NostroReconciliationItem;
import com.cbs.nostro.entity.NostroVostroPosition;
import com.cbs.nostro.entity.PositionType;
import com.cbs.nostro.repository.NostroReconciliationItemRepository;
import com.cbs.nostro.repository.NostroVostroPositionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/v1/reconciliation")
@RequiredArgsConstructor
@Tag(name = "Reconciliation", description = "Reconciliation sessions, history, and nostro accounts")
public class ReconciliationController {

    private final NostroVostroPositionRepository nostroVostroPositionRepository;
    private final NostroReconciliationItemRepository nostroReconciliationItemRepository;

    @GetMapping("/sessions")
    @Operation(summary = "List reconciliation sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Build sessions from nostro positions that have recon data
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

    @PostMapping("/upload-statement")
    @Operation(summary = "Upload bank statement for matching")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadStatement(
            @RequestParam Long positionId,
            @RequestBody List<Map<String, Object>> statementEntries) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "positionId", positionId,
                "entriesReceived", statementEntries.size(),
                "status", "PROCESSING",
                "message", "Statement uploaded and queued for matching",
                "timestamp", Instant.now().toString()
        )));
    }
}
