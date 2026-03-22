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
    public ResponseEntity<ApiResponse<ScreeningRequest>> screen(@RequestBody java.util.Map<String, Object> body) {
        String screeningType = (String) body.getOrDefault("screeningType", "ONBOARDING");
        String subjectName = (String) body.getOrDefault("subjectName", "");
        String subjectType = (String) body.getOrDefault("subjectType", "INDIVIDUAL");
        LocalDate subjectDob = body.containsKey("subjectDob") ? LocalDate.parse((String) body.get("subjectDob")) : null;
        // Accept both 'nationality' and 'subjectNationality' from frontend
        String nationality = body.containsKey("subjectNationality") ? (String) body.get("subjectNationality")
                : (String) body.get("nationality");
        // Accept both 'idNumber' and 'subjectIdNumber' from frontend
        String idNumber = body.containsKey("subjectIdNumber") ? (String) body.get("subjectIdNumber")
                : (String) body.get("idNumber");
        Long customerId = body.containsKey("customerId") ? Long.valueOf(body.get("customerId").toString()) : null;
        String transactionRef = (String) body.get("transactionRef");
        // Accept both 'lists' and 'listsToScreen' from frontend
        @SuppressWarnings("unchecked")
        List<String> lists = body.containsKey("listsToScreen") ? (List<String>) body.get("listsToScreen")
                : body.containsKey("lists") ? (List<String>) body.get("lists") : null;
        // Accept both 'threshold' and 'matchThreshold'
        BigDecimal threshold = body.containsKey("matchThreshold") ? new BigDecimal(body.get("matchThreshold").toString())
                : body.containsKey("threshold") ? new BigDecimal(body.get("threshold").toString()) : null;
        return ResponseEntity.ok(ApiResponse.ok(screeningService.screenName(
                screeningType, subjectName, subjectType, subjectDob, nationality, idNumber, customerId, transactionRef, lists, threshold)));
    }

    @PostMapping("/matches/{screeningId}/dispose/{matchId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScreeningRequest>> dispose(@PathVariable Long screeningId, @PathVariable Long matchId,
            @RequestBody java.util.Map<String, String> body) {
        String disposition = body.getOrDefault("disposition", "");
        String disposedBy = body.getOrDefault("disposedBy", "SYSTEM");
        String notes = body.get("notes");
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
    public ResponseEntity<ApiResponse<ScreeningRequest>> confirmMatch(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.confirmMatch(id)));
    }

    @PostMapping("/matches/{id}/false-positive")
    @Operation(summary = "Mark a sanctions match as false positive")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScreeningRequest>> falsePositive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.markFalsePositive(id)));
    }

    @PostMapping("/watchlists/{id}/update")
    @Operation(summary = "Trigger watchlist update — refreshes last-updated timestamp and re-validates active entries")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Watchlist>> updateWatchlist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(screeningService.refreshWatchlist(id)));
    }

    @GetMapping("/batch-screen/{jobId}")
    @Operation(summary = "Get batch screening job status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getBatchScreeningStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("jobId", jobId, "status", "COMPLETED")));
    }

    @PostMapping("/batch-screen")
    @Operation(summary = "Batch screen multiple names — accepts {subjects:[...]} or {names:[...]} from frontend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScreeningRequest>>> batchScreen(
            @RequestBody java.util.Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        // Support both wrapper formats: {names:[...]} (frontend) and flat list encoding
        List<java.util.Map<String, Object>> subjects = payload.containsKey("names")
                ? (List<java.util.Map<String, Object>>) payload.get("names")
                : payload.containsKey("subjects")
                ? (List<java.util.Map<String, Object>>) payload.get("subjects")
                : List.of();
        List<ScreeningRequest> results = new java.util.ArrayList<>();
        for (java.util.Map<String, Object> subject : subjects) {
            // Accept 'name' (frontend) or 'subjectName' (legacy)
            String subjectName = subject.containsKey("name") ? (String) subject.get("name")
                    : (String) subject.getOrDefault("subjectName", "");
            // Accept 'type' (frontend) or 'subjectType' (legacy)
            String subjectType = subject.containsKey("type") ? (String) subject.get("type")
                    : (String) subject.getOrDefault("subjectType", "INDIVIDUAL");
            LocalDate dob = subject.containsKey("dob") ? LocalDate.parse((String) subject.get("dob")) : null;
            String nationality = subject.containsKey("nationality") ? (String) subject.get("nationality") : null;
            ScreeningRequest result = screeningService.screenName(
                    "ONBOARDING", subjectName, subjectType, dob, nationality, null, null, null, null, null);
            results.add(result);
        }
        return ResponseEntity.ok(ApiResponse.ok(results));
    }
}
