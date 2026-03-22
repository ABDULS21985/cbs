package com.cbs.reports;

import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.service.ReportExecutionService;
import com.cbs.reports.service.ReportsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the custom report CRUD endpoints added to ReportsController.
 * These endpoints were previously missing — this test suite validates:
 * - listCustomReports (GET /v1/reports/custom?owner=...)
 * - getMyReports     (GET /v1/reports/custom/mine)
 * - saveCustomReport (POST /v1/reports/custom/save)
 * - deleteCustomReport (DELETE /v1/reports/custom/{id})
 * - runCustomReport  (POST /v1/reports/custom/{id}/run)
 * - cloneReport      (POST /v1/reports/custom/{id}/clone)
 * - accessLevel ↔ savedTo enum mapping
 */
@ExtendWith(MockitoExtension.class)
class CustomReportControllerTest {

    @Mock private ReportsService reportsService;
    @Mock private ReportExecutionService reportExecutionService;
    @Mock private Authentication auth;

    // Import the controller directly for unit testing
    private com.cbs.reports.controller.ReportsController controller;

    @BeforeEach
    void setUp() {
        controller = new com.cbs.reports.controller.ReportsController(reportsService, reportExecutionService);
        lenient().when(auth.getName()).thenReturn("testuser");
    }

    // ── listCustomReports ─────────────────────────────────────────────────

    @Test
    @DisplayName("listCustomReports - returns only non-deleted reports for owner=mine")
    void listCustomReports_filtersMineAndExcludesDeleted() {
        CustomReport active = buildReport(1L, "Active Report", "testuser", "PRIVATE", "ACTIVE");
        CustomReport deleted = buildReport(2L, "Deleted Report", "testuser", "PRIVATE", "DELETED");

        when(reportExecutionService.getByOwner("testuser")).thenReturn(List.of(active, deleted));

        var response = controller.listCustomReports("mine", auth);

        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getName()).isEqualTo("Active Report");
    }

    @Test
    @DisplayName("listCustomReports - returns shared reports when owner=shared")
    void listCustomReports_returnsSharedReports() {
        CustomReport shared = buildReport(3L, "Shared Report", "otheruser", "SHARED", "ACTIVE");
        when(reportExecutionService.getShared()).thenReturn(List.of(shared));

        var response = controller.listCustomReports("shared", auth);

        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getSavedTo()).isEqualTo("SHARED");
    }

    // ── getMyReports ──────────────────────────────────────────────────────

    @Test
    @DisplayName("getMyReports - returns reports owned by authenticated user, excluding DELETED")
    void getMyReports_returnsOnlyOwnerReports() {
        CustomReport r = buildReport(5L, "My Report", "testuser", "PRIVATE", "ACTIVE");
        when(reportExecutionService.getByOwner("testuser")).thenReturn(List.of(r));

        var response = controller.getMyReports(auth);

        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getCreatedBy()).isEqualTo("testuser");
    }

    // ── accessLevel ↔ savedTo mapping ────────────────────────────────────

    @Test
    @DisplayName("toDto - maps PRIVATE accessLevel to MY_REPORTS savedTo")
    void toDto_mapsPrivateToMyReports() {
        CustomReport r = buildReport(1L, "R", "u", "PRIVATE", "ACTIVE");
        when(reportExecutionService.getByOwner("u")).thenReturn(List.of(r));
        when(auth.getName()).thenReturn("u");

        var resp = controller.listCustomReports("mine", auth);
        assertThat(resp.getBody().getData().get(0).getSavedTo()).isEqualTo("MY_REPORTS");
    }

    @Test
    @DisplayName("toDto - maps SHARED accessLevel to SHARED savedTo")
    void toDto_mapsSharedToShared() {
        CustomReport r = buildReport(2L, "R", "u", "SHARED", "ACTIVE");
        when(reportExecutionService.getShared()).thenReturn(List.of(r));

        var resp = controller.listCustomReports("shared", auth);
        assertThat(resp.getBody().getData().get(0).getSavedTo()).isEqualTo("SHARED");
    }

    @Test
    @DisplayName("toDto - maps PUBLIC accessLevel to DEPARTMENT savedTo")
    void toDto_mapsPublicToDepartment() {
        CustomReport r = buildReport(3L, "R", "u", "PUBLIC", "ACTIVE");
        when(reportExecutionService.getAll()).thenReturn(List.of(r));

        var resp = controller.listCustomReports("all", auth);
        assertThat(resp.getBody().getData().get(0).getSavedTo()).isEqualTo("DEPARTMENT");
    }

    // ── saveCustomReport ──────────────────────────────────────────────────

    @Test
    @DisplayName("saveCustomReport - creates new report with owner set to authenticated user")
    void saveCustomReport_createsNewReportWithOwner() {
        com.cbs.reports.dto.ReportDTOs.SaveReportRequest req = new com.cbs.reports.dto.ReportDTOs.SaveReportRequest();
        req.setName("New Report");
        req.setSchedule("MANUAL");
        req.setSavedTo("MY_REPORTS");

        when(reportExecutionService.save(any(CustomReport.class))).thenAnswer(inv -> {
            CustomReport r = inv.getArgument(0);
            r.setId(10L);
            r.setReportCode("RPT-NEW");
            return r;
        });

        var response = controller.saveCustomReport(req, auth);

        assertThat(response.getBody().getData().getId()).isEqualTo("10");
        // Verify owner set to authenticated user
        verify(reportExecutionService).save(argThat(r -> "testuser".equals(r.getOwner())));
    }

    @Test
    @DisplayName("saveCustomReport - updates existing report when id is provided")
    void saveCustomReport_updatesExistingReport() {
        CustomReport existing = buildReport(5L, "Old Name", "testuser", "PRIVATE", "ACTIVE");
        when(reportExecutionService.getById(5L)).thenReturn(Optional.of(existing));
        when(reportExecutionService.save(any(CustomReport.class))).thenAnswer(inv -> inv.getArgument(0));

        com.cbs.reports.dto.ReportDTOs.SaveReportRequest req = new com.cbs.reports.dto.ReportDTOs.SaveReportRequest();
        req.setId("5");
        req.setName("Updated Name");
        req.setSchedule("DAILY");
        req.setSavedTo("MY_REPORTS");

        var response = controller.saveCustomReport(req, auth);

        assertThat(response.getBody().getData().getName()).isEqualTo("Updated Name");
    }

    @Test
    @DisplayName("saveCustomReport - maps savedTo=MY_REPORTS to accessLevel=PRIVATE")
    void saveCustomReport_mapsSavedToToAccessLevel() {
        com.cbs.reports.dto.ReportDTOs.SaveReportRequest req = new com.cbs.reports.dto.ReportDTOs.SaveReportRequest();
        req.setName("Private Report");
        req.setSavedTo("MY_REPORTS");

        when(reportExecutionService.save(any(CustomReport.class))).thenAnswer(inv -> {
            CustomReport r = inv.getArgument(0);
            r.setId(11L);
            return r;
        });

        controller.saveCustomReport(req, auth);

        verify(reportExecutionService).save(argThat(r -> "PRIVATE".equals(r.getAccessLevel())));
    }

    @Test
    @DisplayName("saveCustomReport - maps savedTo=DEPARTMENT to accessLevel=PUBLIC")
    void saveCustomReport_mapsDepartmentToPublic() {
        com.cbs.reports.dto.ReportDTOs.SaveReportRequest req = new com.cbs.reports.dto.ReportDTOs.SaveReportRequest();
        req.setName("Dept Report");
        req.setSavedTo("DEPARTMENT");

        when(reportExecutionService.save(any(CustomReport.class))).thenAnswer(inv -> {
            CustomReport r = inv.getArgument(0);
            r.setId(12L);
            return r;
        });

        controller.saveCustomReport(req, auth);

        verify(reportExecutionService).save(argThat(r -> "PUBLIC".equals(r.getAccessLevel())));
    }

    // ── deleteCustomReport ────────────────────────────────────────────────

    @Test
    @DisplayName("deleteCustomReport - calls service.delete and returns 200 OK")
    void deleteCustomReport_callsServiceDelete() {
        doNothing().when(reportExecutionService).delete(7L);

        var response = controller.deleteCustomReport(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(reportExecutionService).delete(7L);
    }

    // ── runCustomReport ───────────────────────────────────────────────────

    @Test
    @DisplayName("runCustomReport - returns ReportRunResult with execution metadata")
    void runCustomReport_returnsResult() {
        Map<String, Object> runResult = Map.of(
                "reportId", "10",
                "runAt", Instant.now().toString(),
                "rowCount", 25,
                "columns", List.of(Map.of("key", "id", "label", "ID", "type", "NUMBER")),
                "rows", List.of(Map.of("id", 1)),
                "executionId", 100L,
                "durationMs", 150
        );

        when(reportExecutionService.run(10L)).thenReturn(runResult);

        var response = controller.runCustomReport(10L);

        assertThat(response.getBody().getData().getRowCount()).isEqualTo(25);
        assertThat(response.getBody().getData().getExecutionId()).isEqualTo(100L);
        assertThat(response.getBody().getData().getDurationMs()).isEqualTo(150);
    }

    // ── getRunHistory ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getRunHistory - returns execution history for a report")
    void getRunHistory_returnsHistory() {
        ReportExecution exec = ReportExecution.builder()
                .id(1L).reportId(5L).status("COMPLETED").rowCount(30).build();
        when(reportExecutionService.getHistory(5L)).thenReturn(List.of(exec));

        var response = controller.getRunHistory(5L);

        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getStatus()).isEqualTo("COMPLETED");
    }

    // ── cloneReport ───────────────────────────────────────────────────────

    @Test
    @DisplayName("cloneReport - clones report with 'Copy of' prefix and PRIVATE access")
    void cloneReport_createsCloneWithCorrectName() {
        CustomReport original = buildReport(8L, "Original Report", "alice", "SHARED", "ACTIVE");
        original.setConfig(Map.of("dataSources", List.of("customers")));

        when(reportExecutionService.getById(8L)).thenReturn(Optional.of(original));
        when(reportExecutionService.save(any(CustomReport.class))).thenAnswer(inv -> {
            CustomReport r = inv.getArgument(0);
            r.setId(9L);
            return r;
        });

        var response = controller.cloneReport(8L, auth);

        assertThat(response.getBody().getData().getName()).isEqualTo("Copy of Original Report");
        verify(reportExecutionService).save(argThat(r ->
                "testuser".equals(r.getOwner())
                && "PRIVATE".equals(r.getAccessLevel())
                && r.getReportName().startsWith("Copy of")));
    }

    // ── getDataSources ────────────────────────────────────────────────────

    @Test
    @DisplayName("getDataSources - returns all 6 standard data source definitions")
    void getDataSources_returnsAllSources() {
        var response = controller.getDataSources();

        assertThat(response.getBody().getData()).hasSize(6);
        assertThat(response.getBody().getData())
                .extracting(com.cbs.reports.dto.ReportDTOs.DataSourceDto::getId)
                .containsExactlyInAnyOrder(
                        "customers", "accounts", "loans",
                        "payments", "fixed_deposits", "transactions");
    }

    @Test
    @DisplayName("getDataSources - each source has at least one filterable field")
    void getDataSources_eachSourceHasFilterableFields() {
        var response = controller.getDataSources();

        response.getBody().getData().forEach(source ->
                assertThat(source.getFields())
                        .as("DataSource '%s' should have at least one filterable field", source.getId())
                        .anyMatch(com.cbs.reports.dto.ReportDTOs.DataFieldDto::isFilterable));
    }

    // ── Helper ────────────────────────────────────────────────────────────

    private CustomReport buildReport(Long id, String name, String owner,
                                     String accessLevel, String status) {
        return CustomReport.builder()
                .id(id)
                .reportCode("RPT-" + id)
                .reportName(name)
                .owner(owner)
                .accessLevel(accessLevel)
                .status(status)
                .createdAt(Instant.now())
                .build();
    }
}
