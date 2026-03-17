package com.cbs.nostro.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.nostro.dto.*;
import com.cbs.nostro.entity.PositionType;
import com.cbs.nostro.service.NostroVostroService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/nostro")
@RequiredArgsConstructor
@Tag(name = "Nostro/Vostro", description = "Correspondent banking, position tracking, and reconciliation")
public class NostroVostroController {

    private final NostroVostroService nostroService;

    // Correspondent Banks
    @PostMapping("/banks")
    @Operation(summary = "Register a correspondent bank")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CorrespondentBankDto>> createBank(
            @Valid @RequestBody CorrespondentBankDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(nostroService.createBank(request), "Correspondent bank registered"));
    }

    @GetMapping("/banks")
    @Operation(summary = "List active correspondent banks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CorrespondentBankDto>>> getAllBanks() {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.getAllActiveBanks()));
    }

    @GetMapping("/banks/{id}")
    @Operation(summary = "Get correspondent bank details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CorrespondentBankDto>> getBank(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.getBank(id)));
    }

    // Positions
    @PostMapping("/positions")
    @Operation(summary = "Create a nostro/vostro position")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NostroPositionDto>> createPosition(
            @Valid @RequestBody NostroPositionDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(nostroService.createPosition(request), "Position created"));
    }

    @GetMapping("/positions")
    @Operation(summary = "List all active positions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<NostroPositionDto>>> getAllPositions(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<NostroPositionDto> result = nostroService.getAllPositions(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "currencyCode")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/positions/{id}")
    @Operation(summary = "Get position details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<NostroPositionDto>> getPosition(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.getPosition(id)));
    }

    @GetMapping("/positions/type/{type}")
    @Operation(summary = "Get positions by type (NOSTRO or VOSTRO)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<NostroPositionDto>>> getPositionsByType(@PathVariable PositionType type) {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.getPositionsByType(type)));
    }

    @PatchMapping("/positions/{id}/statement")
    @Operation(summary = "Update position with correspondent statement balance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NostroPositionDto>> updateStatement(
            @PathVariable Long id,
            @RequestParam BigDecimal statementBalance,
            @RequestParam LocalDate statementDate) {
        return ResponseEntity.ok(ApiResponse.ok(
                nostroService.updateStatementBalance(id, statementBalance, statementDate)));
    }

    // Reconciliation
    @PostMapping("/positions/{positionId}/recon-items")
    @Operation(summary = "Add a reconciliation item")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ReconciliationItemDto>> addReconItem(
            @PathVariable Long positionId, @Valid @RequestBody ReconciliationItemDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(nostroService.addReconciliationItem(positionId, request)));
    }

    @GetMapping("/positions/{positionId}/recon-items")
    @Operation(summary = "Get reconciliation items for a position")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ReconciliationItemDto>>> getReconItems(
            @PathVariable Long positionId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<ReconciliationItemDto> result = nostroService.getReconciliationItems(positionId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/positions/{positionId}/recon-items/unmatched")
    @Operation(summary = "Get unmatched reconciliation items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ReconciliationItemDto>>> getUnmatchedItems(@PathVariable Long positionId) {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.getUnmatchedItems(positionId)));
    }

    @PostMapping("/recon-items/{itemId}/match")
    @Operation(summary = "Match a reconciliation item")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ReconciliationItemDto>> matchItem(
            @PathVariable Long itemId,
            @RequestParam String matchReference,
            @RequestParam String resolvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(nostroService.matchItem(itemId, matchReference, resolvedBy)));
    }
}
