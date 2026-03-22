package com.cbs.eod.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.exception.BusinessException;
import com.cbs.eod.entity.*;
import com.cbs.eod.entity.EodScheduleConfig;
import com.cbs.eod.repository.EodRunRepository;
import com.cbs.eod.repository.EodScheduleConfigRepository;
import com.cbs.eod.repository.EodStepRepository;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/eod")
@RequiredArgsConstructor
@Tag(name = "End-of-Day Processing", description = "EOD, EOM, EOQ, EOY batch execution")
public class EodController {

    private final EndOfDayService eodService;
    private final EodRunRepository eodRunRepository;
    private final EodStepRepository eodStepRepository;
    private final EodScheduleConfigRepository scheduleConfigRepository;

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
    @Operation(summary = "Get current EOD processing status — returns last EOD run with steps")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EodRun>> getStatus() {
        EodRun lastEod = eodRunRepository.findTopByRunTypeOrderByBusinessDateDesc(EodRunType.EOD).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(lastEod));
    }

    @GetMapping("/runs/{runId}")
    @Operation(summary = "Get EOD run detail with steps")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EodRun>> getRunDetail(@PathVariable Long runId) {
        EodRun run = eodRunRepository.findById(runId)
                .orElseThrow(() -> new BusinessException("EOD run not found: " + runId, "EOD_RUN_NOT_FOUND"));
        return ResponseEntity.ok(ApiResponse.ok(run));
    }

    @GetMapping("/runs/{runId}/steps")
    @Operation(summary = "Get steps for an EOD run")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EodStep>>> getRunSteps(@PathVariable Long runId) {
        List<EodStep> steps = eodStepRepository.findByEodRunIdOrderByStepOrderAsc(runId);
        return ResponseEntity.ok(ApiResponse.ok(steps));
    }

    @GetMapping("/runs/{runId}/logs")
    @Operation(summary = "Get synthesized log entries for an EOD run from step execution data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRunLogs(
            @PathVariable Long runId,
            @RequestParam(required = false) String cursor) {
        EodRun run = eodRunRepository.findById(runId)
                .orElseThrow(() -> new BusinessException("EOD run not found: " + runId, "EOD_RUN_NOT_FOUND"));

        List<Map<String, Object>> entries = new ArrayList<>();
        int cursorIndex = 0;
        if (cursor != null && !cursor.isBlank()) {
            try { cursorIndex = Integer.parseInt(cursor); } catch (NumberFormatException ignored) { /* default to 0 */ }
        }

        List<EodStep> steps = run.getSteps();
        for (int i = cursorIndex; i < steps.size(); i++) {
            EodStep step = steps.get(i);
            if (step.getStartedAt() != null) {
                entries.add(Map.of(
                        "timestamp", step.getStartedAt().toString(),
                        "level", "INFO",
                        "message", "Started: " + step.getStepName()));
            }
            if ("COMPLETED".equals(step.getStatus()) && step.getCompletedAt() != null) {
                entries.add(Map.of(
                        "timestamp", step.getCompletedAt().toString(),
                        "level", "INFO",
                        "message", String.format("Completed: %s — %d records in %dms",
                                step.getStepName(),
                                step.getRecordsProcessed() != null ? step.getRecordsProcessed() : 0,
                                step.getDurationMs() != null ? step.getDurationMs() : 0)));
            }
            if ("SKIPPED".equals(step.getStatus())) {
                entries.add(Map.of(
                        "timestamp", step.getCompletedAt() != null ? step.getCompletedAt().toString() : Instant.now().toString(),
                        "level", "WARN",
                        "message", "Skipped: " + step.getStepName() +
                                (step.getErrorMessage() != null ? " — " + step.getErrorMessage() : "")));
            }
            if ("FAILED".equals(step.getStatus())) {
                entries.add(Map.of(
                        "timestamp", step.getCompletedAt() != null ? step.getCompletedAt().toString() : Instant.now().toString(),
                        "level", "ERROR",
                        "message", "Failed: " + step.getStepName() + " — " +
                                (step.getErrorMessage() != null ? step.getErrorMessage() : "Unknown error")));
            }
        }

        String nextCursor = steps.size() > 0 ? String.valueOf(steps.size()) : null;
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "entries", entries,
                "nextCursor", nextCursor != null ? nextCursor : "")));
    }

    @PostMapping("/runs/{runId}/steps/{stepId}/retry")
    @Operation(summary = "Retry a failed EOD step")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodStep>> retryStep(
            @PathVariable Long runId, @PathVariable Long stepId) {
        EodStep step = eodStepRepository.findById(stepId)
                .orElseThrow(() -> new BusinessException("EOD step not found: " + stepId, "EOD_STEP_NOT_FOUND"));

        if (!step.getEodRun().getId().equals(runId)) {
            throw new BusinessException("Step does not belong to the specified run", "EOD_STEP_RUN_MISMATCH");
        }

        if (!"FAILED".equals(step.getStatus())) {
            throw new BusinessException("Only failed steps can be retried", "EOD_STEP_NOT_FAILED");
        }

        step.setStatus("PENDING");
        step.setErrorMessage(null);
        step.setStartedAt(null);
        step.setCompletedAt(null);
        step.setDurationMs(null);
        eodStepRepository.save(step);

        // Re-execute the step via the service
        eodService.retryStep(runId, step);

        return ResponseEntity.ok(ApiResponse.ok(step));
    }

    @PostMapping("/runs/{runId}/steps/{stepId}/skip")
    @Operation(summary = "Skip a failed EOD step")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodStep>> skipStep(
            @PathVariable Long runId, @PathVariable Long stepId,
            @RequestBody(required = false) Map<String, String> body) {
        EodStep step = eodStepRepository.findById(stepId)
                .orElseThrow(() -> new BusinessException("EOD step not found: " + stepId, "EOD_STEP_NOT_FOUND"));

        if (!step.getEodRun().getId().equals(runId)) {
            throw new BusinessException("Step does not belong to the specified run", "EOD_STEP_RUN_MISMATCH");
        }

        if (!"FAILED".equals(step.getStatus()) && !"PENDING".equals(step.getStatus())) {
            throw new BusinessException("Only failed or pending steps can be skipped", "EOD_STEP_CANNOT_SKIP");
        }

        String reason = body != null ? body.getOrDefault("reason", "Manually skipped") : "Manually skipped";
        step.setStatus("SKIPPED");
        step.setErrorMessage("Skipped: " + reason);
        step.setCompletedAt(Instant.now());
        eodStepRepository.save(step);

        // Update parent run counts
        EodRun run = eodRunRepository.findById(runId)
                .orElseThrow(() -> new BusinessException("EOD run not found: " + runId, "EOD_RUN_NOT_FOUND"));
        if (run.getFailedSteps() > 0) {
            run.setFailedSteps(run.getFailedSteps() - 1);
        }
        run.setCompletedSteps(run.getCompletedSteps() + 1);

        // Check if all steps are now done
        boolean allDone = run.getSteps().stream()
                .allMatch(s -> "COMPLETED".equals(s.getStatus()) || "SKIPPED".equals(s.getStatus()));
        if (allDone) {
            run.setStatus("COMPLETED");
            run.setCompletedAt(Instant.now());
            run.setDurationSeconds((int)(run.getCompletedAt().toEpochMilli() - run.getStartedAt().toEpochMilli()) / 1000);
        }
        eodRunRepository.save(run);

        return ResponseEntity.ok(ApiResponse.ok(step));
    }

    @PostMapping("/runs/{runId}/rollback")
    @Operation(summary = "Rollback (cancel) an EOD run")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodRun>> rollbackRun(@PathVariable Long runId) {
        EodRun run = eodRunRepository.findById(runId)
                .orElseThrow(() -> new BusinessException("EOD run not found: " + runId, "EOD_RUN_NOT_FOUND"));

        if ("COMPLETED".equals(run.getStatus())) {
            throw new BusinessException("Cannot rollback a completed run", "EOD_ALREADY_COMPLETED");
        }

        run.setStatus("ROLLED_BACK");
        run.setCompletedAt(Instant.now());
        if (run.getStartedAt() != null) {
            run.setDurationSeconds((int)(run.getCompletedAt().toEpochMilli() - run.getStartedAt().toEpochMilli()) / 1000);
        }

        // Mark any pending/running steps as skipped
        for (EodStep step : run.getSteps()) {
            if ("PENDING".equals(step.getStatus()) || "RUNNING".equals(step.getStatus())) {
                step.setStatus("SKIPPED");
                step.setErrorMessage("Run rolled back");
                step.setCompletedAt(Instant.now());
            }
        }

        eodRunRepository.save(run);
        return ResponseEntity.ok(ApiResponse.ok(run));
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
    @Operation(summary = "Get EOD step schedule from the most recent run")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EodStep>>> getSchedule() {
        EodRun lastRun = eodRunRepository.findTopByRunTypeOrderByBusinessDateDesc(EodRunType.EOD).orElse(null);
        if (lastRun == null) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.ok(lastRun.getSteps()));
    }

    @GetMapping("/schedule/config")
    @Operation(summary = "Get EOD schedule configuration")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EodScheduleConfig>> getScheduleConfig() {
        EodScheduleConfig config = scheduleConfigRepository.findAll().stream().findFirst()
                .orElse(EodScheduleConfig.builder().build());
        return ResponseEntity.ok(ApiResponse.ok(config));
    }

    @PutMapping("/schedule/config")
    @Operation(summary = "Update EOD schedule configuration")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodScheduleConfig>> saveScheduleConfig(
            @RequestBody EodScheduleConfig incoming) {
        EodScheduleConfig config = scheduleConfigRepository.findAll().stream().findFirst()
                .orElse(EodScheduleConfig.builder().build());

        config.setAutoTrigger(incoming.getAutoTrigger());
        config.setScheduledTime(incoming.getScheduledTime());
        config.setBlockIfUnclosedBranches(incoming.getBlockIfUnclosedBranches());
        config.setNotificationEmails(incoming.getNotificationEmails());
        config.setAutoRetry(incoming.getAutoRetry());
        config.setMaxRetries(incoming.getMaxRetries());
        config.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(ApiResponse.ok(scheduleConfigRepository.save(config)));
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

    @GetMapping("/trigger")
    @Operation(summary = "Get EOD trigger status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTriggerStatus() {
        EodRun lastEod = eodRunRepository.findTopByRunTypeOrderByBusinessDateDesc(EodRunType.EOD).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "canTrigger", true,
                "lastRunDate", lastEod != null ? lastEod.getBusinessDate().toString() : "N/A",
                "lastRunStatus", lastEod != null ? lastEod.getStatus() : "N/A"
        )));
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
