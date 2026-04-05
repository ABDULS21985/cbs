package com.cbs.casemgmt;

import com.cbs.casemgmt.entity.CasePatternInsight;
import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import com.cbs.casemgmt.repository.CasePatternInsightRepository;
import com.cbs.casemgmt.repository.CaseRootCauseAnalysisRepository;
import com.cbs.casemgmt.service.RootCauseAnalysisService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RootCauseAnalysisServiceTest {

    @Mock private CaseRootCauseAnalysisRepository rcaRepository;
    @Mock private CasePatternInsightRepository patternRepository;
    @InjectMocks private RootCauseAnalysisService service;

    private CaseRootCauseAnalysis buildRca(String code, String category, String status) {
        CaseRootCauseAnalysis rca = new CaseRootCauseAnalysis();
        rca.setId((long) code.hashCode());
        rca.setRcaCode(code);
        rca.setCaseId(1L);
        rca.setAnalysisMethod("FIVE_WHY");
        rca.setAnalysisDate(LocalDate.now());
        rca.setAnalystName("Test Analyst");
        rca.setProblemStatement("Test problem");
        rca.setRootCauseCategory(category);
        rca.setRootCauseDescription("Test description");
        rca.setCustomersAffected(5);
        rca.setFinancialImpact(BigDecimal.valueOf(100000));
        rca.setReputationalImpact("MEDIUM");
        rca.setStatus(status);
        rca.setUpdatedAt(Instant.now());
        return rca;
    }

    @Test @DisplayName("createRca assigns code, status, and analysis date")
    void createRca() {
        when(rcaRepository.save(any())).thenAnswer(inv -> { CaseRootCauseAnalysis r = inv.getArgument(0); r.setId(1L); return r; });

        CaseRootCauseAnalysis input = new CaseRootCauseAnalysis();
        input.setCaseId(1L);
        input.setAnalysisMethod("FISHBONE");
        input.setRootCauseCategory("PROCESS");
        input.setRootCauseDescription("Process gap");
        input.setProblemStatement("Delayed payments");

        CaseRootCauseAnalysis result = service.createRca(input);
        assertThat(result.getRcaCode()).startsWith("RCA-");
        assertThat(result.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(result.getAnalysisDate()).isEqualTo(LocalDate.now());
    }

    @Test @DisplayName("completeRca sets status to COMPLETED")
    void completeRca() {
        CaseRootCauseAnalysis rca = buildRca("RCA-001", "SYSTEM", "IN_PROGRESS");
        when(rcaRepository.findById(rca.getId())).thenReturn(Optional.of(rca));
        when(rcaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CaseRootCauseAnalysis result = service.completeRca(rca.getId());
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }

    @Test @DisplayName("validateRca sets status to VALIDATED")
    void validateRca() {
        CaseRootCauseAnalysis rca = buildRca("RCA-002", "PROCESS", "COMPLETED");
        when(rcaRepository.findById(rca.getId())).thenReturn(Optional.of(rca));
        when(rcaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CaseRootCauseAnalysis result = service.validateRca(rca.getId());
        assertThat(result.getStatus()).isEqualTo("VALIDATED");
    }

    @Test @DisplayName("addCorrectiveAction adds action to map")
    void addCorrectiveAction() {
        CaseRootCauseAnalysis rca = buildRca("RCA-003", "PEOPLE", "IN_PROGRESS");
        rca.setCorrectiveActions(new HashMap<>());
        when(rcaRepository.findById(rca.getId())).thenReturn(Optional.of(rca));
        when(rcaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> action = Map.of("action", "Train staff", "owner", "HR", "priority", "HIGH");
        CaseRootCauseAnalysis result = service.addCorrectiveAction(rca.getId(), action);
        assertThat(result.getCorrectiveActions()).containsKey("action_1");
    }

    @Test @DisplayName("getRcaDashboard returns complete statistics")
    void dashboard() {
        List<CaseRootCauseAnalysis> rcas = List.of(
                buildRca("RCA-A", "SYSTEM", "IN_PROGRESS"),
                buildRca("RCA-B", "SYSTEM", "COMPLETED"),
                buildRca("RCA-C", "PROCESS", "VALIDATED")
        );
        when(rcaRepository.findAll()).thenReturn(rcas);

        Map<String, Object> dashboard = service.getRcaDashboard();
        assertThat(dashboard.get("totalAnalyses")).isEqualTo(3L);
        assertThat(dashboard.get("pendingAnalyses")).isEqualTo(1L);
        assertThat(dashboard.get("completedAnalyses")).isEqualTo(1L);
        assertThat(dashboard.get("validatedAnalyses")).isEqualTo(1L);
        assertThat(dashboard).containsKey("byCategory");
        assertThat(dashboard).containsKey("financialImpactTotal");
    }

    @Test @DisplayName("getRecurringRootCauses groups by category")
    void recurring() {
        List<CaseRootCauseAnalysis> rcas = List.of(
                buildRca("RCA-1", "SYSTEM", "COMPLETED"),
                buildRca("RCA-2", "SYSTEM", "IN_PROGRESS"),
                buildRca("RCA-3", "PROCESS", "VALIDATED")
        );
        when(rcaRepository.findByAnalysisDateBetween(any(), any())).thenReturn(rcas);

        List<Map<String, Object>> result = service.getRecurringRootCauses();
        assertThat(result).isNotEmpty();
        boolean hasSystem = result.stream().anyMatch(r -> "SYSTEM".equals(r.get("category")));
        assertThat(hasSystem).isTrue();
    }

    @Test @DisplayName("generatePatternInsights creates insights for recurring categories")
    void generatePatterns() {
        CaseRootCauseAnalysis rca1 = buildRca("RCA-P1", "SYSTEM", "COMPLETED");
        CaseRootCauseAnalysis rca2 = buildRca("RCA-P2", "SYSTEM", "IN_PROGRESS");
        rca1.setAnalysisDate(LocalDate.now().minusDays(10));
        rca2.setAnalysisDate(LocalDate.now().minusDays(5));
        when(rcaRepository.findByAnalysisDateBetween(any(), any())).thenReturn(List.of(rca1, rca2));
        when(patternRepository.save(any())).thenAnswer(inv -> { CasePatternInsight p = inv.getArgument(0); p.setId(1L); return p; });

        List<CasePatternInsight> insights = service.generatePatternInsights(LocalDate.now().minusDays(30), LocalDate.now());
        assertThat(insights).hasSize(1);
        assertThat(insights.get(0).getRootCauseCategory()).isEqualTo("SYSTEM");
        assertThat(insights.get(0).getCaseCount()).isEqualTo(2);
    }

    @Test @DisplayName("getByCode returns RCA by code")
    void getByCode() {
        CaseRootCauseAnalysis rca = buildRca("RCA-FIND", "PROCESS", "IN_PROGRESS");
        when(rcaRepository.findByRcaCode("RCA-FIND")).thenReturn(Optional.of(rca));

        CaseRootCauseAnalysis result = service.getByCode("RCA-FIND");
        assertThat(result.getRcaCode()).isEqualTo("RCA-FIND");
    }

    @Test @DisplayName("getByCaseId returns list of RCAs for case")
    void getByCaseId() {
        CaseRootCauseAnalysis rca = buildRca("RCA-CASE", "SYSTEM", "IN_PROGRESS");
        when(rcaRepository.findByCaseId(1L)).thenReturn(List.of(rca));

        List<CaseRootCauseAnalysis> result = service.getByCaseId(1L);
        assertThat(result).hasSize(1);
    }
}
