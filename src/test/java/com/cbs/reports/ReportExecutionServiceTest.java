package com.cbs.reports;

import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.repository.CustomReportRepository;
import com.cbs.reports.repository.ReportExecutionRepository;
import com.cbs.reports.service.ReportExecutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportExecutionServiceTest {

    @Mock private CustomReportRepository customReportRepo;
    @Mock private ReportExecutionRepository executionRepo;
    @InjectMocks private ReportExecutionService service;

    // ── save ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("save - generates reportCode starting with RPT- when code is blank")
    void save_generatesReportCode() {
        when(customReportRepo.save(any(CustomReport.class))).thenAnswer(inv -> {
            CustomReport r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        CustomReport report = new CustomReport();
        report.setReportName("Monthly Balance Report");
        report.setCategory("FINANCE");
        report.setOwner("user1");

        CustomReport result = service.save(report);

        assertThat(result.getReportCode()).startsWith("RPT-");
        assertThat(result.getUpdatedAt()).isNotNull();
        verify(customReportRepo).save(report);
    }

    @Test
    @DisplayName("save - preserves existing reportCode when already set")
    void save_preservesExistingCode() {
        when(customReportRepo.save(any(CustomReport.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomReport report = new CustomReport();
        report.setReportCode("RPT-EXISTING");
        report.setReportName("Existing Report");

        CustomReport result = service.save(report);

        assertThat(result.getReportCode()).isEqualTo("RPT-EXISTING");
        verify(customReportRepo).save(report);
    }

    @Test
    @DisplayName("save - sets updatedAt timestamp on save")
    void save_setsUpdatedAt() {
        Instant before = Instant.now();
        when(customReportRepo.save(any(CustomReport.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomReport report = new CustomReport();
        report.setReportName("Test Report");

        CustomReport result = service.save(report);

        assertThat(result.getUpdatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isAfterOrEqualTo(before);
    }

    // ── run ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("run - executes a report and creates a ReportExecution with COMPLETED status")
    void run_createsExecutionRecord() {
        CustomReport report = CustomReport.builder()
                .id(10L)
                .reportCode("RPT-TEST")
                .reportName("Test Report")
                .config(Map.of())
                .build();

        when(customReportRepo.findById(10L)).thenReturn(Optional.of(report));
        when(executionRepo.save(any(ReportExecution.class))).thenAnswer(inv -> {
            ReportExecution e = inv.getArgument(0);
            e.setId(100L);
            return e;
        });

        Map<String, Object> result = service.run(10L);

        assertThat(result).containsKey("reportId");
        assertThat(result).containsKey("rowCount");
        assertThat(result).containsKey("executionId");
        assertThat(result).containsKey("durationMs");
        assertThat(result).containsKey("columns");
        assertThat(result).containsKey("rows");
        // save called twice: once for RUNNING, once for COMPLETED
        verify(executionRepo, times(2)).save(any(ReportExecution.class));
    }

    @Test
    @DisplayName("run - throws IllegalArgumentException when report not found")
    void run_throwsWhenReportNotFound() {
        when(customReportRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.run(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Report not found");
    }

    // ── getHistory ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getHistory - returns execution history for a report ordered by createdAt desc")
    void getHistory_returnsExecutionHistory() {
        ReportExecution exec1 = ReportExecution.builder()
                .id(1L).reportId(10L).status("COMPLETED").rowCount(50).build();
        ReportExecution exec2 = ReportExecution.builder()
                .id(2L).reportId(10L).status("FAILED").build();

        when(executionRepo.findByReportIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(exec2, exec1));

        List<ReportExecution> result = service.getHistory(10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getStatus()).isEqualTo("FAILED");
        assertThat(result.get(1).getStatus()).isEqualTo("COMPLETED");
        verify(executionRepo).findByReportIdOrderByCreatedAtDesc(10L);
    }

    // ── updateSchedule ───────────────────────────────────────────────────

    @Test
    @DisplayName("updateSchedule - updates schedule on a CustomReport")
    void updateSchedule_setsScheduleAndUpdatesTimestamp() {
        CustomReport report = CustomReport.builder()
                .id(5L).reportCode("RPT-SCHED").reportName("Scheduled Report").build();

        when(customReportRepo.findById(5L)).thenReturn(Optional.of(report));
        when(customReportRepo.save(any(CustomReport.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> schedule = Map.of("cron", "0 0 * * *", "timezone", "UTC");
        CustomReport result = service.updateSchedule(5L, schedule);

        assertThat(result.getSchedule()).isEqualTo(schedule);
        assertThat(result.getUpdatedAt()).isNotNull();
        verify(customReportRepo).save(report);
    }

    @Test
    @DisplayName("updateSchedule - throws IllegalArgumentException when report not found")
    void updateSchedule_throwsWhenNotFound() {
        when(customReportRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSchedule(999L, Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Report not found");
    }

    // ── delete ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete - soft-deletes a CustomReport by setting status to DELETED")
    void delete_setsStatusToDeleted() {
        CustomReport report = CustomReport.builder()
                .id(7L).reportCode("RPT-DEL").reportName("To Delete").status("DRAFT").build();

        when(customReportRepo.findById(7L)).thenReturn(Optional.of(report));
        when(customReportRepo.save(any(CustomReport.class))).thenAnswer(inv -> inv.getArgument(0));

        service.delete(7L);

        assertThat(report.getStatus()).isEqualTo("DELETED");
        assertThat(report.getUpdatedAt()).isNotNull();
        verify(customReportRepo).save(report);
    }

    @Test
    @DisplayName("delete - throws IllegalArgumentException when report not found")
    void delete_throwsWhenNotFound() {
        when(customReportRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Report not found");
    }

    // ── getByOwner ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getByOwner - returns reports filtered by owner")
    void getByOwner_returnsFilteredReports() {
        CustomReport r1 = CustomReport.builder()
                .id(1L).reportCode("RPT-001").owner("alice").reportName("Alice Report").build();
        CustomReport r2 = CustomReport.builder()
                .id(2L).reportCode("RPT-002").owner("alice").reportName("Alice Report 2").build();

        when(customReportRepo.findByOwnerOrderByCreatedAtDesc("alice"))
                .thenReturn(List.of(r1, r2));

        List<CustomReport> result = service.getByOwner("alice");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(CustomReport::getOwner).containsOnly("alice");
        verify(customReportRepo).findByOwnerOrderByCreatedAtDesc("alice");
    }

    @Test
    @DisplayName("getByOwner - returns empty list when no reports found")
    void getByOwner_returnsEmptyWhenNoReports() {
        when(customReportRepo.findByOwnerOrderByCreatedAtDesc("unknown"))
                .thenReturn(List.of());

        List<CustomReport> result = service.getByOwner("unknown");

        assertThat(result).isEmpty();
    }

    // ── getById ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getById - returns Optional containing the report when found")
    void getById_returnsReportWhenFound() {
        CustomReport report = CustomReport.builder()
                .id(3L).reportCode("RPT-003").reportName("Report Three").build();

        when(customReportRepo.findById(3L)).thenReturn(Optional.of(report));

        Optional<CustomReport> result = service.getById(3L);

        assertThat(result).isPresent();
        assertThat(result.get().getReportCode()).isEqualTo("RPT-003");
    }

    @Test
    @DisplayName("getById - returns empty Optional when report not found")
    void getById_returnsEmptyWhenNotFound() {
        when(customReportRepo.findById(999L)).thenReturn(Optional.empty());

        Optional<CustomReport> result = service.getById(999L);

        assertThat(result).isEmpty();
    }
}
