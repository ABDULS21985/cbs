package com.cbs.collections.controller;

import com.cbs.collections.dto.*;
import com.cbs.collections.entity.CollectionCaseStatus;
import com.cbs.collections.service.CollectionsService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/collections")
@RequiredArgsConstructor
@Tag(name = "Collections & Recovery", description = "Delinquency management, dunning, field visits, write-offs")
public class CollectionsController {

    private final CollectionsService collectionsService;

    @PostMapping("/cases/loan/{loanAccountId}")
    @Operation(summary = "Create a collection case for a delinquent loan")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CollectionCaseResponse>> createCase(@PathVariable Long loanAccountId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(collectionsService.createCase(loanAccountId)));
    }

    @PostMapping("/cases/batch")
    @Operation(summary = "Batch create/update collection cases for all delinquent loans")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> batchCreate() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", collectionsService.batchCreateCases())));
    }

    @GetMapping("/cases/{caseId}")
    @Operation(summary = "Get collection case with actions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CollectionCaseResponse>> getCase(@PathVariable Long caseId) {
        return ResponseEntity.ok(ApiResponse.ok(collectionsService.getCase(caseId)));
    }

    @GetMapping("/cases")
    @Operation(summary = "Get cases by status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CollectionCaseResponse>>> getCasesByStatus(
            @RequestParam(required = false) CollectionCaseStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (status == null) {
            Page<CollectionCaseResponse> result = collectionsService.getAllCases(
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
            return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
        }
        Page<CollectionCaseResponse> result = collectionsService.getCasesByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/cases/agent/{assignedTo}")
    @Operation(summary = "Get cases assigned to an agent")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CollectionCaseResponse>>> getAgentCases(
            @PathVariable String assignedTo,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CollectionCaseResponse> result = collectionsService.getCasesByAgent(assignedTo,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PatchMapping("/cases/{caseId}/assign")
    @Operation(summary = "Assign case to an agent")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CollectionCaseResponse>> assignCase(
            @PathVariable Long caseId, @RequestParam String assignedTo, @RequestParam(required = false) String team) {
        return ResponseEntity.ok(ApiResponse.ok(collectionsService.assignCase(caseId, assignedTo, team)));
    }

    @PostMapping("/cases/{caseId}/actions")
    @Operation(summary = "Log a collection action")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CollectionActionDto>> logAction(
            @PathVariable Long caseId, @Valid @RequestBody CollectionActionDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(collectionsService.logAction(caseId, dto)));
    }

    @PostMapping("/cases/{caseId}/close")
    @Operation(summary = "Close a collection case")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CollectionCaseResponse>> closeCase(
            @PathVariable Long caseId, @RequestParam String resolutionType,
            @RequestParam(required = false) BigDecimal resolutionAmount) {
        return ResponseEntity.ok(ApiResponse.ok(collectionsService.closeCase(caseId, resolutionType, resolutionAmount)));
    }
}
