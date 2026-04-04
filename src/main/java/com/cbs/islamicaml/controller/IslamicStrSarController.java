package com.cbs.islamicaml.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.service.IslamicStrSarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-aml/sar")
@RequiredArgsConstructor
@Slf4j
public class IslamicStrSarController {

    private final IslamicStrSarService sarService;

    // ===================== SAR LIFECYCLE =====================

    @PostMapping
    public ResponseEntity<ApiResponse<IslamicStrSarResponse>> createSar(
            @Valid @RequestBody CreateSarRequest request) {
        log.info("Creating SAR for customer {}", request.getSubjectCustomerId());
        IslamicStrSarResponse sar = sarService.createSar(request);
        return ResponseEntity.ok(ApiResponse.ok(sar, "SAR created"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IslamicStrSarResponse>> getSar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(sarService.getSar(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<IslamicStrSarResponse>>> searchSars(
            SarSearchCriteria criteria, Pageable pageable) {
        Page<IslamicStrSarResponse> page = sarService.searchSars(criteria, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), PageMeta.from(page)));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<ApiResponse<IslamicStrSarResponse>> reviewSar(
            @PathVariable Long id, @Valid @RequestBody SarReviewRequest request) {
        IslamicStrSarResponse sar = sarService.reviewSar(id, request);
        return ResponseEntity.ok(ApiResponse.ok(sar, "SAR reviewed"));
    }

    @PostMapping("/{id}/mlro-approve")
    public ResponseEntity<ApiResponse<Void>> mlroApprove(
            @PathVariable Long id,
            @RequestParam(required = false) String mlroId) {
        sarService.mlroApprove(id, mlroId);
        return ResponseEntity.ok(ApiResponse.ok(null, "SAR approved by MLRO"));
    }

    @PostMapping("/{id}/file")
    public ResponseEntity<ApiResponse<Void>> fileSar(@PathVariable Long id) {
        sarService.fileSar(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "SAR filed"));
    }

    // ===================== FIU RESPONSE =====================

    @PostMapping("/{id}/fiu-response")
    public ResponseEntity<ApiResponse<Void>> recordFiuResponse(
            @PathVariable Long id, @Valid @RequestBody FiuResponseDetails response) {
        sarService.recordFiuResponse(id, response);
        return ResponseEntity.ok(ApiResponse.ok(null, "FIU response recorded"));
    }

    // ===================== AUTO-GENERATE =====================

    @PostMapping("/auto-generate/{alertId}")
    public ResponseEntity<ApiResponse<IslamicStrSarResponse>> autoGenerateSar(
            @PathVariable Long alertId) {
        log.info("Auto-generating SAR from alert {}", alertId);
        IslamicStrSarResponse sar = sarService.autoGenerateSar(alertId);
        return ResponseEntity.ok(ApiResponse.ok(sar, "SAR auto-generated from alert"));
    }

    // ===================== DEADLINE QUERIES =====================

    @GetMapping("/approaching-deadline")
    public ResponseEntity<ApiResponse<List<IslamicStrSarResponse>>> getSarsApproachingDeadline(
            @RequestParam(defaultValue = "3") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(sarService.getSarsApproachingDeadline(daysAhead)));
    }

    @GetMapping("/breaching-deadline")
    public ResponseEntity<ApiResponse<List<IslamicStrSarResponse>>> getSarsBreachingDeadline() {
        return ResponseEntity.ok(ApiResponse.ok(sarService.getSarsBreachingDeadline()));
    }

    // ===================== FILING SUMMARY =====================

    @GetMapping("/filing-summary")
    public ResponseEntity<ApiResponse<SarFilingSummary>> getFilingSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(sarService.getFilingSummary(from, to)));
    }
}
