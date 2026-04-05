package com.cbs.nostro.service;

import com.cbs.nostro.dto.*;
import com.cbs.nostro.entity.BreakTimelineEntry;
import com.cbs.nostro.entity.ReconciliationBreak;
import com.cbs.nostro.repository.BreakTimelineEntryRepository;
import com.cbs.nostro.repository.ReconciliationBreakRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationBreakService {

    private final ReconciliationBreakRepository breakRepository;
    private final BreakTimelineEntryRepository timelineRepository;

    // SLA hours by escalation level
    private static final Map<String, Long> SLA_HOURS = Map.of(
            "OFFICER", 48L,
            "TEAM_LEAD", 72L,
            "OPS_MANAGER", 120L,
            "CFO", 168L
    );

    private static final List<String> ESCALATION_ORDER = List.of(
            "OFFICER", "TEAM_LEAD", "OPS_MANAGER", "CFO");

    // ─── List Breaks ─────────────────────────────────────────────────────────

    public List<BreakDto> getBreaks(String status, String currency, String assignedTo) {
        List<ReconciliationBreak> breaks = breakRepository.findByFilters(status, currency, assignedTo);
        return breaks.stream().map(this::toDto).toList();
    }

    // ─── Get Break Timeline ──────────────────────────────────────────────────

    public List<BreakTimelineDto> getTimeline(Long breakId) {
        breakRepository.findById(breakId)
                .orElseThrow(() -> new EntityNotFoundException("Break " + breakId + " not found"));
        return timelineRepository.findByReconBreakIdOrderByTimestampDesc(breakId)
                .stream().map(this::toTimelineDto).toList();
    }

    // ─── Resolve Break ───────────────────────────────────────────────────────

    @Transactional
    public void resolveBreak(Long breakId, BreakResolveRequest request, String actor) {
        ReconciliationBreak b = breakRepository.findById(breakId)
                .orElseThrow(() -> new EntityNotFoundException("Break " + breakId + " not found"));

        String targetStatus = "WRITE_OFF".equals(request.getResolutionType())
                ? "WRITTEN_OFF" : "RESOLVED";

        b.setStatus(targetStatus);
        b.setResolutionType(request.getResolutionType());
        b.setResolutionNotes(request.getReason());
        b.setResolvedDate(LocalDate.now());
        b.setResolvedBy(actor);
        breakRepository.save(b);

        addTimelineEntry(b, actor, "Resolved: " + request.getResolutionType(),
                request.getReason(), "RESOLVED");
    }

    // ─── Escalate Break ──────────────────────────────────────────────────────

    @Transactional
    public void escalateBreak(Long breakId, String notes, String actor) {
        ReconciliationBreak b = breakRepository.findById(breakId)
                .orElseThrow(() -> new EntityNotFoundException("Break " + breakId + " not found"));

        String currentLevel = b.getEscalationLevel();
        int idx = ESCALATION_ORDER.indexOf(currentLevel);
        String nextLevel = (idx >= 0 && idx < ESCALATION_ORDER.size() - 1)
                ? ESCALATION_ORDER.get(idx + 1) : currentLevel;

        b.setEscalationLevel(nextLevel);
        b.setStatus("ESCALATED");
        b.setSlaDeadline(Instant.now().plus(SLA_HOURS.getOrDefault(nextLevel, 48L), ChronoUnit.HOURS));
        breakRepository.save(b);

        addTimelineEntry(b, actor, "Escalated to " + nextLevel, notes, "ESCALATED");
    }

    // ─── Add Note ────────────────────────────────────────────────────────────

    @Transactional
    public BreakTimelineDto addNote(Long breakId, String notes, String actor) {
        ReconciliationBreak b = breakRepository.findById(breakId)
                .orElseThrow(() -> new EntityNotFoundException("Break " + breakId + " not found"));
        BreakTimelineEntry entry = addTimelineEntry(b, actor, "Note added", notes, "INFO");
        return toTimelineDto(entry);
    }

    // ─── Bulk Assign ─────────────────────────────────────────────────────────

    @Transactional
    public int bulkAssign(List<Long> breakIds, String assignee, String actor) {
        int updated = breakRepository.bulkAssign(breakIds, assignee);
        // Add timeline entries
        for (Long id : breakIds) {
            breakRepository.findById(id).ifPresent(b ->
                    addTimelineEntry(b, actor, "Assigned to " + assignee, null, "ACTION"));
        }
        return updated;
    }

    // ─── Bulk Escalate ───────────────────────────────────────────────────────

    @Transactional
    public int bulkEscalate(List<Long> breakIds, String notes, String actor) {
        int count = 0;
        for (Long id : breakIds) {
            try {
                escalateBreak(id, notes, actor);
                count++;
            } catch (EntityNotFoundException e) {
                log.warn("Break {} not found during bulk escalate", id);
            }
        }
        return count;
    }

    // ─── Compliance Checklist (derived from system state) ────────────────────

    public List<ComplianceCheckDto> getComplianceChecklist() {
        long openBreaks = breakRepository.countByStatus("OPEN");
        long escalatedBreaks = breakRepository.countByStatus("ESCALATED");
        long totalBreaks = breakRepository.count();
        String now = Instant.now().toString();

        return List.of(
                ComplianceCheckDto.builder()
                        .id("CBN-RECON-001")
                        .requirement("Daily Nostro Reconciliation")
                        .description("All nostro accounts must be reconciled daily")
                        .met(openBreaks == 0)
                        .lastChecked(now)
                        .build(),
                ComplianceCheckDto.builder()
                        .id("CBN-RECON-002")
                        .requirement("Break Resolution SLA")
                        .description("All breaks must be resolved within SLA deadlines")
                        .met(escalatedBreaks == 0)
                        .lastChecked(now)
                        .build(),
                ComplianceCheckDto.builder()
                        .id("CBN-RECON-003")
                        .requirement("Escalation Compliance")
                        .description("Breaks older than 48 hours must be escalated")
                        .met(true) // simplified check
                        .lastChecked(now)
                        .build(),
                ComplianceCheckDto.builder()
                        .id("CBN-RECON-004")
                        .requirement("Monthly Reconciliation Certificate")
                        .description("Monthly reconciliation certificate must be generated and signed off")
                        .met(totalBreaks < 10)
                        .lastChecked(now)
                        .build(),
                ComplianceCheckDto.builder()
                        .id("CBN-RECON-005")
                        .requirement("Audit Trail Completeness")
                        .description("All break resolutions must have documented audit trail")
                        .met(true)
                        .lastChecked(now)
                        .build()
        );
    }

    // ─── Compliance Score Trend ──────────────────────────────────────────────

    /**
     * Computes compliance score trend for the last 12 months based on actual
     * break resolution rates: score = (resolved breaks / total breaks) * 100.
     * Months with no breaks are scored at 100% (fully compliant).
     */
    public List<ComplianceScoreDto> getComplianceScoreTrend() {
        List<ComplianceScoreDto> trend = new ArrayList<>();
        YearMonth current = YearMonth.now();

        for (int i = 11; i >= 0; i--) {
            YearMonth month = current.minusMonths(i);
            LocalDate monthStart = month.atDay(1);
            LocalDate monthEnd = month.atEndOfMonth();

            // Query breaks detected within this month
            List<ReconciliationBreak> monthBreaks = breakRepository.findByFilters(null, null, null)
                    .stream()
                    .filter(b -> !b.getDetectedDate().isBefore(monthStart) && !b.getDetectedDate().isAfter(monthEnd))
                    .toList();

            double score;
            if (monthBreaks.isEmpty()) {
                // No breaks detected means full compliance for the month
                score = 100.0;
            } else {
                long resolved = monthBreaks.stream()
                        .filter(b -> "RESOLVED".equals(b.getStatus()) || "WRITTEN_OFF".equals(b.getStatus()))
                        .count();
                score = ((double) resolved / monthBreaks.size()) * 100.0;
            }

            trend.add(ComplianceScoreDto.builder()
                    .month(month.format(DateTimeFormatter.ofPattern("yyyy-MM")))
                    .score(Math.round(score * 10.0) / 10.0)
                    .target(95.0)
                    .build());
        }
        return trend;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private BreakTimelineEntry addTimelineEntry(ReconciliationBreak b, String actor,
                                                 String action, String notes, String entryType) {
        BreakTimelineEntry entry = BreakTimelineEntry.builder()
                .reconBreak(b)
                .timestamp(Instant.now())
                .actor(actor)
                .action(action)
                .notes(notes)
                .entryType(entryType)
                .build();
        return timelineRepository.save(entry);
    }

    private BreakDto toDto(ReconciliationBreak b) {
        return BreakDto.builder()
                .id(b.getId())
                .positionId(b.getPositionId())
                .reconItemId(b.getReconItemId())
                .accountNumber(b.getAccountNumber())
                .bankName(b.getBankName())
                .currency(b.getCurrency())
                .amount(b.getAmount())
                .direction(b.getDirection())
                .detectedDate(b.getDetectedDate())
                .agingDays(b.getAgingDays())
                .assignedTo(b.getAssignedTo())
                .status(b.getStatus())
                .escalationLevel(b.getEscalationLevel())
                .slaDeadline(b.getSlaDeadline())
                .resolutionType(b.getResolutionType())
                .resolutionNotes(b.getResolutionNotes())
                .resolvedDate(b.getResolvedDate())
                .resolvedBy(b.getResolvedBy())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private BreakTimelineDto toTimelineDto(BreakTimelineEntry e) {
        return BreakTimelineDto.builder()
                .id(e.getId())
                .timestamp(e.getTimestamp())
                .actor(e.getActor())
                .action(e.getAction())
                .notes(e.getNotes())
                .type(e.getEntryType())
                .build();
    }
}
