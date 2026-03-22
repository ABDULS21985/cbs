package com.cbs.regulatory;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.regulatory.entity.ReportCategory;
import com.cbs.regulatory.entity.RegulatoryReportDefinition;
import com.cbs.regulatory.entity.RegulatoryReportRun;
import com.cbs.regulatory.repository.RegulatoryReportDefinitionRepository;
import com.cbs.regulatory.repository.RegulatoryReportRunRepository;
import com.cbs.regulatory.service.RegulatoryReportingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegulatoryReportServiceTest {

    @Mock private RegulatoryReportDefinitionRepository definitionRepo;
    @Mock private RegulatoryReportRunRepository runRepo;
    @Mock private EntityManager entityManager;
    @Mock private ObjectMapper objectMapper;
    @Mock private CurrentActorProvider currentActorProvider;
    @InjectMocks private RegulatoryReportingService service;

    // ── createDefinition ─────────────────────────────────────────────────

    @Test
    @DisplayName("createDefinition - saves a new RegulatoryReportDefinition")
    void createDefinition_savesDefinition() {
        RegulatoryReportDefinition def = RegulatoryReportDefinition.builder()
                .reportCode("REG-001")
                .reportName("Capital Adequacy Report")
                .regulator("CBN")
                .frequency("QUARTERLY")
                .reportCategory(ReportCategory.CAPITAL_ADEQUACY)
                .build();

        when(definitionRepo.save(any(RegulatoryReportDefinition.class))).thenAnswer(inv -> {
            RegulatoryReportDefinition d = inv.getArgument(0);
            d.setId(1L);
            return d;
        });

        RegulatoryReportDefinition result = service.createDefinition(def);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getReportCode()).isEqualTo("REG-001");
        assertThat(result.getRegulator()).isEqualTo("CBN");
        assertThat(result.getFrequency()).isEqualTo("QUARTERLY");
        assertThat(result.getReportCategory()).isEqualTo(ReportCategory.CAPITAL_ADEQUACY);
        verify(definitionRepo).save(def);
    }

    @Test
    @DisplayName("createDefinition - preserves all fields on save")
    void createDefinition_preservesAllFields() {
        RegulatoryReportDefinition def = RegulatoryReportDefinition.builder()
                .reportCode("REG-002")
                .reportName("AML Compliance Report")
                .regulator("SEC")
                .frequency("MONTHLY")
                .reportCategory(ReportCategory.AML_CFT)
                .outputFormat("CSV")
                .isActive(true)
                .build();

        when(definitionRepo.save(any(RegulatoryReportDefinition.class))).thenAnswer(inv -> inv.getArgument(0));

        RegulatoryReportDefinition result = service.createDefinition(def);

        assertThat(result.getOutputFormat()).isEqualTo("CSV");
        assertThat(result.getIsActive()).isTrue();
        assertThat(result.getReportName()).isEqualTo("AML Compliance Report");
    }

    // ── getAllDefinitions ─────────────────────────────────────────────────

    @Test
    @DisplayName("getAllDefinitions - returns all active definitions ordered by name")
    void getAllDefinitions_returnsActiveDefinitions() {
        RegulatoryReportDefinition def1 = RegulatoryReportDefinition.builder()
                .id(1L).reportCode("REG-A").reportName("Alpha Report")
                .regulator("CBN").frequency("MONTHLY").reportCategory(ReportCategory.PRUDENTIAL)
                .isActive(true).build();
        RegulatoryReportDefinition def2 = RegulatoryReportDefinition.builder()
                .id(2L).reportCode("REG-B").reportName("Beta Report")
                .regulator("SEC").frequency("QUARTERLY").reportCategory(ReportCategory.STATISTICAL)
                .isActive(true).build();

        when(definitionRepo.findByIsActiveTrueOrderByReportNameAsc())
                .thenReturn(List.of(def1, def2));

        List<RegulatoryReportDefinition> result = service.getAllDefinitions();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getReportName()).isEqualTo("Alpha Report");
        assertThat(result.get(1).getReportName()).isEqualTo("Beta Report");
        verify(definitionRepo).findByIsActiveTrueOrderByReportNameAsc();
    }

    @Test
    @DisplayName("getAllDefinitions - returns empty list when no active definitions")
    void getAllDefinitions_returnsEmptyWhenNone() {
        when(definitionRepo.findByIsActiveTrueOrderByReportNameAsc())
                .thenReturn(List.of());

        List<RegulatoryReportDefinition> result = service.getAllDefinitions();

        assertThat(result).isEmpty();
    }

    // ── getByRegulator ───────────────────────────────────────────────────

    @Test
    @DisplayName("getByRegulator - filters definitions by regulator")
    void getByRegulator_filtersCorrectly() {
        RegulatoryReportDefinition def = RegulatoryReportDefinition.builder()
                .id(1L).reportCode("REG-CBN-01").reportName("CBN Prudential")
                .regulator("CBN").frequency("QUARTERLY").reportCategory(ReportCategory.PRUDENTIAL)
                .isActive(true).build();

        when(definitionRepo.findByRegulatorAndIsActiveTrue("CBN"))
                .thenReturn(List.of(def));

        List<RegulatoryReportDefinition> result = service.getByRegulator("CBN");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRegulator()).isEqualTo("CBN");
        verify(definitionRepo).findByRegulatorAndIsActiveTrue("CBN");
    }

    @Test
    @DisplayName("getByRegulator - returns empty list for unknown regulator")
    void getByRegulator_returnsEmptyForUnknown() {
        when(definitionRepo.findByRegulatorAndIsActiveTrue("UNKNOWN"))
                .thenReturn(List.of());

        List<RegulatoryReportDefinition> result = service.getByRegulator("UNKNOWN");

        assertThat(result).isEmpty();
    }

    // ── generateReport ───────────────────────────────────────────────────

    @Test
    @DisplayName("generateReport - creates a RegulatoryReportRun with correct fields")
    void generateReport_createsRunWithCorrectFields() {
        RegulatoryReportDefinition def = RegulatoryReportDefinition.builder()
                .id(1L).reportCode("REG-GEN").reportName("Generated Report")
                .regulator("CBN").frequency("MONTHLY").reportCategory(ReportCategory.RISK)
                .outputFormat("XLSX").build();

        when(definitionRepo.findByReportCode("REG-GEN")).thenReturn(Optional.of(def));
        when(currentActorProvider.getCurrentActor()).thenReturn("admin-user");
        when(runRepo.save(any(RegulatoryReportRun.class))).thenAnswer(inv -> {
            RegulatoryReportRun r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);
        RegulatoryReportRun result = service.generateReport("REG-GEN", start, end);

        assertThat(result.getReportCode()).isEqualTo("REG-GEN");
        assertThat(result.getReportingPeriodStart()).isEqualTo(start);
        assertThat(result.getReportingPeriodEnd()).isEqualTo(end);
        assertThat(result.getGeneratedBy()).isEqualTo("admin-user");
        assertThat(result.getGeneratedAt()).isNotNull();
        verify(runRepo).save(any(RegulatoryReportRun.class));
    }

    @Test
    @DisplayName("generateReport - throws ResourceNotFoundException when definition not found")
    void generateReport_throwsWhenDefinitionNotFound() {
        when(definitionRepo.findByReportCode("NONEXISTENT")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generateReport(
                "NONEXISTENT",
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 31)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── submitReport ─────────────────────────────────────────────────────

    @Test
    @DisplayName("submitReport - updates run status to SUBMITTED with submissionRef")
    void submitReport_updatesStatusToSubmitted() {
        RegulatoryReportRun run = RegulatoryReportRun.builder()
                .id(10L).reportCode("REG-SUB").status("COMPLETED").build();

        when(runRepo.findById(10L)).thenReturn(Optional.of(run));
        when(currentActorProvider.getCurrentActor()).thenReturn("submitter-user");
        when(runRepo.save(any(RegulatoryReportRun.class))).thenAnswer(inv -> inv.getArgument(0));

        RegulatoryReportRun result = service.submitReport(10L);

        assertThat(result.getStatus()).isEqualTo("SUBMITTED");
        assertThat(result.getSubmittedBy()).isEqualTo("submitter-user");
        assertThat(result.getSubmittedAt()).isNotNull();
        assertThat(result.getSubmissionRef()).startsWith("SUB-");
        verify(runRepo).save(run);
    }

    @Test
    @DisplayName("submitReport - throws BusinessException when status is not COMPLETED")
    void submitReport_throwsWhenNotCompleted() {
        RegulatoryReportRun run = RegulatoryReportRun.builder()
                .id(11L).reportCode("REG-FAIL").status("RUNNING").build();

        when(runRepo.findById(11L)).thenReturn(Optional.of(run));
        when(currentActorProvider.getCurrentActor()).thenReturn("user");

        assertThatThrownBy(() -> service.submitReport(11L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("COMPLETED");
    }

    @Test
    @DisplayName("submitReport - throws ResourceNotFoundException when run not found")
    void submitReport_throwsWhenRunNotFound() {
        when(runRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitReport(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
