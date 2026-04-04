package com.cbs.shariahcompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariahcompliance.dto.CreateSnciRecordRequest;
import com.cbs.shariahcompliance.dto.SnciRecordResponse;
import com.cbs.shariahcompliance.dto.SnciSearchCriteria;
import com.cbs.shariahcompliance.dto.SnciSummary;
import com.cbs.shariahcompliance.service.SnciService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/shariah-compliance/snci")
@RequiredArgsConstructor
@Slf4j
public class SnciController {

    private final SnciService snciService;

    // ── Detection ─────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<SnciRecordResponse>> createSnciRecord(
            @Valid @RequestBody CreateSnciRecordRequest request) {
        log.info("Creating SNCI record for transaction ref: {}", request.getSourceTransactionRef());
        SnciRecordResponse record = snciService.createSnciRecord(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(record, "SNCI record created"));
    }

    @PostMapping("/detect")
    public ResponseEntity<ApiResponse<List<SnciRecordResponse>>> runAutomatedDetection(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("Running automated SNCI detection from {} to {}", from, to);
        List<SnciRecordResponse> results = snciService.runAutomatedDetection(from, to);
        return ResponseEntity.ok(ApiResponse.ok(results, "Automated detection completed"));
    }

    // ── Quarantine ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/quarantine")
    public ResponseEntity<ApiResponse<Void>> quarantineIncome(@PathVariable Long id) {
        log.info("Quarantining SNCI record id={}", id);
        snciService.quarantineIncome(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Income quarantined successfully"));
    }

    @PostMapping("/batch-quarantine")
    public ResponseEntity<ApiResponse<Void>> batchQuarantine(@RequestBody List<Long> snciIds) {
        log.info("Batch quarantining {} SNCI records", snciIds.size());
        snciService.batchQuarantine(snciIds);
        return ResponseEntity.ok(ApiResponse.ok(null, "Batch quarantine completed"));
    }

    // ── Dispute ───────────────────────────────────────────────────────────────

    @PostMapping("/{id}/dispute")
    public ResponseEntity<ApiResponse<Void>> disputeSnci(
            @PathVariable Long id,
            @RequestParam String disputedBy,
            @RequestParam String reason) {
        log.info("Disputing SNCI record id={} by {}", id, disputedBy);
        snciService.disputeSnci(id, disputedBy, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "SNCI record disputed"));
    }

    @PostMapping("/{id}/resolve-dispute")
    public ResponseEntity<ApiResponse<Void>> resolveDispute(
            @PathVariable Long id,
            @RequestParam boolean isNonCompliant,
            @RequestParam String resolvedBy,
            @RequestParam String resolution) {
        log.info("Resolving dispute on SNCI record id={} by {}", id, resolvedBy);
        snciService.resolveDispute(id, isNonCompliant, resolvedBy, resolution);
        return ResponseEntity.ok(ApiResponse.ok(null, "Dispute resolved"));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SnciRecordResponse>> getSnciRecord(@PathVariable Long id) {
        SnciRecordResponse record = snciService.getSnciRecord(id);
        return ResponseEntity.ok(ApiResponse.ok(record));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SnciRecordResponse>>> searchSnci(
            SnciSearchCriteria criteria, Pageable pageable) {
        Page<SnciRecordResponse> results = snciService.searchSnci(criteria, pageable);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SnciSummary>> getSnciSummary() {
        SnciSummary summary = snciService.getSnciSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/pending-purification")
    public ResponseEntity<ApiResponse<List<SnciRecordResponse>>> getSnciPendingPurification() {
        List<SnciRecordResponse> records = snciService.getSnciPendingPurification();
        return ResponseEntity.ok(ApiResponse.ok(records));
    }

    @GetMapping("/total-unpurified")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalUnpurifiedSnci() {
        BigDecimal total = snciService.getTotalUnpurifiedSnci();
        return ResponseEntity.ok(ApiResponse.ok(total));
    }
}
