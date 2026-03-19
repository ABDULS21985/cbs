package com.cbs.eod.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.eod.entity.*;
import com.cbs.eod.repository.EodRunRepository;
import com.cbs.eod.service.EndOfDayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/eod")
@RequiredArgsConstructor
@Tag(name = "End-of-Day Processing", description = "EOD, EOM, EOQ, EOY batch execution")
public class EodController {

    private final EndOfDayService eodService;
    private final EodRunRepository eodRunRepository;

    @PostMapping("/execute")
    @Operation(summary = "Execute end-of-day processing")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodRun>> executeEod(
            @RequestParam LocalDate businessDate, @RequestParam String initiatedBy) {
        return ResponseEntity.ok(ApiResponse.ok(eodService.executeEod(businessDate, initiatedBy)));
    }

    @GetMapping("/last/{runType}")
    @Operation(summary = "Get last EOD run")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EodRun>> getLastRun(@PathVariable EodRunType runType) {
        return ResponseEntity.ok(ApiResponse.ok(eodService.getLastRun(runType)));
    }

    @GetMapping("/status")
    @Operation(summary = "Get current EOD processing status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        EodRun lastEod = eodRunRepository.findTopByRunTypeOrderByBusinessDateDesc(EodRunType.EOD).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "lastRunDate", lastEod != null ? lastEod.getBusinessDate().toString() : "N/A",
                "lastRunStatus", lastEod != null ? lastEod.getStatus() : "N/A",
                "totalRuns", eodRunRepository.count()
        )));
    }

    @GetMapping("/history")
    @Operation(summary = "List EOD run history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EodRun>>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<EodRun> result = eodRunRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "businessDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/schedule")
    @Operation(summary = "Get EOD step schedule/configuration from the most recent run")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EodStep>>> getSchedule() {
        EodRun lastRun = eodRunRepository.findTopByRunTypeOrderByBusinessDateDesc(EodRunType.EOD).orElse(null);
        if (lastRun == null) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.ok(lastRun.getSteps()));
    }

    @GetMapping("/duration-trend")
    @Operation(summary = "Get EOD duration trend over last 30 days")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDurationTrend() {
        LocalDate since = LocalDate.now().minusDays(30);
        Page<EodRun> runs = eodRunRepository.findAll(
                PageRequest.of(0, 30, Sort.by(Sort.Direction.ASC, "businessDate")));
        List<Map<String, Object>> trend = runs.getContent().stream()
                .filter(r -> r.getBusinessDate() != null && !r.getBusinessDate().isBefore(since))
                .map(r -> Map.<String, Object>of(
                        "date", r.getBusinessDate().toString(),
                        "durationSeconds", r.getDurationSeconds() != null ? r.getDurationSeconds() : 0,
                        "status", r.getStatus() != null ? r.getStatus() : "UNKNOWN",
                        "totalSteps", r.getTotalSteps(),
                        "completedSteps", r.getCompletedSteps(),
                        "failedSteps", r.getFailedSteps()
                ))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @PostMapping("/trigger")
    @Operation(summary = "Manually trigger EOD processing")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodRun>> triggerEod(
            @RequestParam(required = false) LocalDate businessDate,
            @RequestParam(defaultValue = "MANUAL") String initiatedBy) {
        LocalDate date = businessDate != null ? businessDate : LocalDate.now();
        EodRun run = eodService.executeEod(date, initiatedBy);
        return ResponseEntity.ok(ApiResponse.ok(run));
    }
}
