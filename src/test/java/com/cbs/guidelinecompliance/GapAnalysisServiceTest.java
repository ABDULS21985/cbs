package com.cbs.guidelinecompliance;

import com.cbs.guidelinecompliance.entity.ComplianceGapAnalysis;
import com.cbs.guidelinecompliance.repository.ComplianceGapAnalysisRepository;
import com.cbs.guidelinecompliance.service.GapAnalysisService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GapAnalysisServiceTest {

    @Mock
    private ComplianceGapAnalysisRepository repository;

    @InjectMocks
    private GapAnalysisService service;

    @Test
    @DisplayName("Status lifecycle: IDENTIFIED → IN_PROGRESS → REMEDIATED → VERIFIED")
    void gapLifecycleProgressesCorrectly() {
        ComplianceGapAnalysis gap = new ComplianceGapAnalysis();
        gap.setId(1L);
        gap.setAnalysisCode("GA-TEST00001");
        gap.setStatus("IDENTIFIED");

        when(repository.findById(1L)).thenReturn(Optional.of(gap));
        when(repository.save(any(ComplianceGapAnalysis.class))).thenAnswer(i -> i.getArgument(0));

        // Plan remediation
        ComplianceGapAnalysis planned = service.planRemediation(1L, "John Doe", "Fix policy gap", LocalDate.now().plusDays(30));
        assertThat(planned.getStatus()).isEqualTo("REMEDIATION_PLANNED");
        assertThat(planned.getRemediationOwner()).isEqualTo("John Doe");

        // Progress
        ComplianceGapAnalysis inProgress = service.updateProgress(1L, 50, "Remediation work started");
        assertThat(inProgress.getStatus()).isEqualTo("IN_PROGRESS");

        // Close
        ComplianceGapAnalysis remediated = service.closeGap(1L);
        assertThat(remediated.getStatus()).isEqualTo("REMEDIATED");
        assertThat(remediated.getRemediationActualDate()).isNotNull();

        // Verify
        ComplianceGapAnalysis verified = service.verifyGap(1L, "Auditor Smith");
        assertThat(verified.getStatus()).isEqualTo("VERIFIED");
        assertThat(verified.getVerifiedBy()).isEqualTo("Auditor Smith");
    }

    @Test
    @DisplayName("Overdue remediation detection finds gaps past target date")
    void overdueRemediationsDetected() {
        ComplianceGapAnalysis overdueGap = new ComplianceGapAnalysis();
        overdueGap.setId(1L);
        overdueGap.setAnalysisCode("GA-OVERDUE01");
        overdueGap.setStatus("IN_PROGRESS");
        overdueGap.setRemediationTargetDate(LocalDate.now().minusDays(10));

        ComplianceGapAnalysis onTimeGap = new ComplianceGapAnalysis();
        onTimeGap.setId(2L);
        onTimeGap.setAnalysisCode("GA-ONTIME01");
        onTimeGap.setStatus("IN_PROGRESS");
        onTimeGap.setRemediationTargetDate(LocalDate.now().plusDays(30));

        ComplianceGapAnalysis closedGap = new ComplianceGapAnalysis();
        closedGap.setId(3L);
        closedGap.setAnalysisCode("GA-CLOSED01");
        closedGap.setStatus("VERIFIED");
        closedGap.setRemediationTargetDate(LocalDate.now().minusDays(5));

        when(repository.findByRemediationTargetDateBeforeAndStatusNotIn(
                any(LocalDate.class),
                any(List.class)))
                .thenReturn(List.of(overdueGap));

        List<ComplianceGapAnalysis> overdue = service.getOverdueRemediations();

        assertThat(overdue).hasSize(1);
        assertThat(overdue.get(0).getAnalysisCode()).isEqualTo("GA-OVERDUE01");
    }
}
