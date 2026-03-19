package com.cbs.collections.controller;

import com.cbs.collections.dto.*;
import com.cbs.collections.entity.CollectionCase;
import com.cbs.collections.entity.CollectionCaseStatus;
import com.cbs.collections.repository.CollectionCaseRepository;
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
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/collections")
@RequiredArgsConstructor
@Tag(name = "Collections & Recovery", description = "Delinquency management, dunning, field visits, write-offs")
public class CollectionsController {

    private final CollectionsService collectionsService;
    private final CollectionCaseRepository collectionCaseRepository;

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

    // ========================================================================
    // COLLECTIONS EXTENDED ENDPOINTS
    // ========================================================================

    @GetMapping("/stats")
    @Operation(summary = "Collection stats: total cases, recovery rate, DPD distribution, write-off total")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCollectionStats() {
        List<CollectionCase> allCases = collectionCaseRepository.findAll();
        long totalCases = allCases.size();
        long openCases = allCases.stream().filter(c -> c.getStatus() == CollectionCaseStatus.OPEN || c.getStatus() == CollectionCaseStatus.IN_PROGRESS).count();
        long closedCases = collectionCaseRepository.countByStatus(CollectionCaseStatus.CLOSED);
        long recoveredCases = collectionCaseRepository.countByStatus(CollectionCaseStatus.RECOVERED);
        long writtenOffCases = collectionCaseRepository.countByStatus(CollectionCaseStatus.WRITTEN_OFF);
        long writeOffProposed = collectionCaseRepository.countByStatus(CollectionCaseStatus.WRITE_OFF_PROPOSED);

        BigDecimal totalOverdue = allCases.stream()
                .map(CollectionCase::getOverdueAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRecovered = allCases.stream()
                .filter(c -> c.getResolutionAmount() != null)
                .map(CollectionCase::getResolutionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal writeOffTotal = allCases.stream()
                .filter(c -> c.getStatus() == CollectionCaseStatus.WRITTEN_OFF)
                .map(CollectionCase::getTotalOutstanding)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double recoveryRate = totalOverdue.compareTo(BigDecimal.ZERO) > 0
                ? totalRecovered.doubleValue() / totalOverdue.doubleValue() * 100.0 : 0.0;

        // DPD distribution
        Map<String, Long> dpdDistribution = allCases.stream()
                .collect(Collectors.groupingBy(c -> c.getDelinquencyBucket() != null ? c.getDelinquencyBucket() : "UNKNOWN", Collectors.counting()));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalCases", totalCases,
                "openCases", openCases,
                "closedCases", closedCases,
                "recoveredCases", recoveredCases,
                "writtenOffCases", writtenOffCases,
                "writeOffProposed", writeOffProposed,
                "totalOverdueAmount", totalOverdue,
                "totalRecoveredAmount", totalRecovered,
                "writeOffTotal", writeOffTotal,
                "recoveryRatePct", Math.round(recoveryRate * 100.0) / 100.0,
                "dpdDistribution", dpdDistribution
        )));
    }

    @GetMapping("/dpd-aging")
    @Operation(summary = "Aging bucket breakdown by days past due")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDpdAging() {
        List<CollectionCase> activeCases = collectionCaseRepository.findAll().stream()
                .filter(c -> c.getStatus() != CollectionCaseStatus.CLOSED && c.getStatus() != CollectionCaseStatus.RECOVERED)
                .toList();

        Map<String, List<CollectionCase>> buckets = new LinkedHashMap<>();
        buckets.put("CURRENT", new ArrayList<>());
        buckets.put("1-30", new ArrayList<>());
        buckets.put("31-60", new ArrayList<>());
        buckets.put("61-90", new ArrayList<>());
        buckets.put("91-180", new ArrayList<>());
        buckets.put("180+", new ArrayList<>());

        for (CollectionCase c : activeCases) {
            int dpd = c.getDaysPastDue() != null ? c.getDaysPastDue() : 0;
            if (dpd == 0) buckets.get("CURRENT").add(c);
            else if (dpd <= 30) buckets.get("1-30").add(c);
            else if (dpd <= 60) buckets.get("31-60").add(c);
            else if (dpd <= 90) buckets.get("61-90").add(c);
            else if (dpd <= 180) buckets.get("91-180").add(c);
            else buckets.get("180+").add(c);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<CollectionCase>> entry : buckets.entrySet()) {
            BigDecimal totalAmount = entry.getValue().stream()
                    .map(CollectionCase::getOverdueAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(Map.of(
                    "bucket", entry.getKey(),
                    "caseCount", entry.getValue().size(),
                    "totalOverdueAmount", totalAmount
            ));
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/dunning-queue")
    @Operation(summary = "Loans pending dunning action, sorted by DPD descending")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CollectionCaseResponse>>> getDunningQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CollectionCaseResponse> result = collectionsService.getCasesByStatus(
                CollectionCaseStatus.OPEN,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "daysPastDue")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/write-off-requests")
    @Operation(summary = "Pending write-off requests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CollectionCaseResponse>>> getWriteOffRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CollectionCaseResponse> result = collectionsService.getCasesByStatus(
                CollectionCaseStatus.WRITE_OFF_PROPOSED,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/recovery")
    @Operation(summary = "Recovery tracking - amounts recovered per period")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRecoveryTracking() {
        List<CollectionCase> allCases = collectionCaseRepository.findAll();

        BigDecimal totalRecovered = allCases.stream()
                .filter(c -> c.getStatus() == CollectionCaseStatus.RECOVERED && c.getResolutionAmount() != null)
                .map(CollectionCase::getResolutionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long recoveredCount = collectionCaseRepository.countByStatus(CollectionCaseStatus.RECOVERED);
        long totalActiveCases = allCases.stream()
                .filter(c -> c.getStatus() != CollectionCaseStatus.CLOSED && c.getStatus() != CollectionCaseStatus.RECOVERED)
                .count();

        BigDecimal totalOutstanding = allCases.stream()
                .filter(c -> c.getStatus() != CollectionCaseStatus.CLOSED && c.getStatus() != CollectionCaseStatus.RECOVERED)
                .map(CollectionCase::getTotalOutstanding)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalRecoveredAmount", totalRecovered,
                "recoveredCaseCount", recoveredCount,
                "activeCaseCount", totalActiveCases,
                "outstandingAmount", totalOutstanding
        )));
    }
}
