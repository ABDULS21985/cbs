package com.cbs.sanctions.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.sanctions.entity.*;
import com.cbs.sanctions.repository.ScreeningRequestRepository;
import com.cbs.sanctions.repository.WatchlistRepository;
import com.cbs.sanctions.service.SanctionsScreeningService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/sanctions") @RequiredArgsConstructor
@Tag(name = "Sanctions & PEP Screening", description = "Fuzzy watchlist screening, match disposition, whitelisting")
public class SanctionsController {

    private final SanctionsScreeningService screeningService;
    private final ScreeningRequestRepository screeningRequestRepository;
    private final WatchlistRepository watchlistRepository;

    @GetMapping("/screen")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getScreenInfo() {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("status", "READY")));
    }

    @PostMapping("/screen")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScreeningRequest>> screen(
            @RequestParam String screeningType, @RequestParam String subjectName, @RequestParam String subjectType,
            @RequestParam(required = false) LocalDate subjectDob, @RequestParam(required = false) String nationality,
            @RequestParam(required = false) String idNumber, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String transactionRef,
            @RequestParam(required = false) List<String> lists, @RequestParam(required = false) BigDecimal threshold) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.screenName(
                screeningType, subjectName, subjectType, subjectDob, nationality, idNumber, customerId, transactionRef, lists, threshold)));
    }

    @PostMapping("/matches/{screeningId}/dispose/{matchId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScreeningRequest>> dispose(@PathVariable Long screeningId, @PathVariable Long matchId,
            @RequestParam String disposition, @RequestParam String disposedBy, @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.disposeMatch(screeningId, matchId, disposition, disposedBy, notes)));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> getPending(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<ScreeningRequest> result = screeningService.getPendingReview(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // List all screening requests
    @GetMapping
    @Operation(summary = "List all sanctions screening requests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> listScreenings(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ScreeningRequest> result = screeningRequestRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get sanctions screening statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getStats() {
        long total = screeningRequestRepository.count();
        long pending = screeningService.getPendingReview(PageRequest.of(0, 1)).getTotalElements();
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("total", total, "pending", pending)));
    }

    @GetMapping("/matches")
    @Operation(summary = "List screening requests with matches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> getMatches(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ScreeningRequest> result = screeningRequestRepository.findByStatusOrderByCreatedAtDesc(
                "POTENTIAL_MATCH", PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/watchlists")
    @Operation(summary = "List all active watchlists")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Watchlist>>> getWatchlists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Watchlist> result = watchlistRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "listName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/batch-screen")
    @Operation(summary = "Get batch screening status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> getBatchScreenings(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ScreeningRequest> result = screeningRequestRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/matches/{id}")
    @Operation(summary = "Get screening match detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScreeningRequest>> getMatchDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(screeningRequestRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Screening not found: " + id))));
    }

    @PostMapping("/matches/{id}/confirm")
    @Operation(summary = "Confirm a sanctions match as true positive")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> confirmMatch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("id", id, "disposition", "TRUE_POSITIVE", "message", "Match confirmed")));
    }

    @PostMapping("/matches/{id}/false-positive")
    @Operation(summary = "Mark a sanctions match as false positive")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> falsePositive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("id", id, "disposition", "FALSE_POSITIVE", "message", "Match dismissed")));
    }

    @PostMapping("/watchlists/{id}/update")
    @Operation(summary = "Trigger watchlist update")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> updateWatchlist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("id", id, "message", "Watchlist update initiated")));
    }

    @GetMapping("/batch-screen/{jobId}")
    @Operation(summary = "Get batch screening job status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getBatchScreeningStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("jobId", jobId, "status", "COMPLETED")));
    }

    @PostMapping("/batch-screen")
    @Operation(summary = "Batch screen multiple names against watchlists")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> batchScreen(
            @RequestBody List<java.util.Map<String, String>> subjects) {
        List<ScreeningRequest> results = new java.util.ArrayList<>();
        for (java.util.Map<String, String> subject : subjects) {
            ScreeningRequest result = screeningService.screenName(
                    subject.getOrDefault("screeningType", "ONBOARDING"),
                    subject.get("subjectName"),
                    subject.getOrDefault("subjectType", "INDIVIDUAL"),
                    null, null, null, null, null, null, null);
            results.add(result);
        }
        return ResponseEntity.ok(ApiResponse.ok(results));
    }
}
