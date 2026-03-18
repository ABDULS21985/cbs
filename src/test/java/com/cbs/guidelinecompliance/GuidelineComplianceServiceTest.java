package com.cbs.guidelinecompliance;

import com.cbs.guidelinecompliance.entity.GuidelineAssessment;
import com.cbs.guidelinecompliance.repository.GuidelineAssessmentRepository;
import com.cbs.guidelinecompliance.service.GuidelineComplianceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuidelineComplianceServiceTest {

    @Mock
    private GuidelineAssessmentRepository repository;

    @InjectMocks
    private GuidelineComplianceService service;

    @Test
    @DisplayName("Complete calculates compliance score correctly (compliant / (total - NA) × 100)")
    void completeCalculatesComplianceScoreCorrectly() {
        GuidelineAssessment assessment = new GuidelineAssessment();
        assessment.setId(1L);
        assessment.setAssessmentCode("GA-TEST00001");
        assessment.setTotalControls(100);
        assessment.setCompliantControls(80);
        assessment.setPartiallyCompliant(10);
        assessment.setNonCompliant(5);
        assessment.setNotApplicable(5);
        assessment.setStatus("IN_PROGRESS");

        when(repository.findByAssessmentCode("GA-TEST00001")).thenReturn(Optional.of(assessment));
        when(repository.save(any(GuidelineAssessment.class))).thenAnswer(i -> i.getArgument(0));

        GuidelineAssessment result = service.complete("GA-TEST00001");

        // 80 / (100 - 5) × 100 = 84.21%
        assertThat(result.getComplianceScorePct()).isEqualByComparingTo(new BigDecimal("84.21"));
        assertThat(result.getOverallRating()).isEqualTo("SUBSTANTIALLY_COMPLIANT");
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Score ≥95% → FULLY_COMPLIANT, <60% → NON_COMPLIANT")
    void scoreThresholdsMapToCorrectRatings() {
        // Test FULLY_COMPLIANT (≥95%)
        GuidelineAssessment fullyCompliant = new GuidelineAssessment();
        fullyCompliant.setId(2L);
        fullyCompliant.setAssessmentCode("GA-TEST00002");
        fullyCompliant.setTotalControls(100);
        fullyCompliant.setCompliantControls(96);
        fullyCompliant.setPartiallyCompliant(2);
        fullyCompliant.setNonCompliant(2);
        fullyCompliant.setNotApplicable(0);
        fullyCompliant.setStatus("IN_PROGRESS");

        when(repository.findByAssessmentCode("GA-TEST00002")).thenReturn(Optional.of(fullyCompliant));
        when(repository.save(any(GuidelineAssessment.class))).thenAnswer(i -> i.getArgument(0));

        GuidelineAssessment resultFull = service.complete("GA-TEST00002");
        assertThat(resultFull.getOverallRating()).isEqualTo("FULLY_COMPLIANT");

        // Test NON_COMPLIANT (<60%)
        GuidelineAssessment nonCompliant = new GuidelineAssessment();
        nonCompliant.setId(3L);
        nonCompliant.setAssessmentCode("GA-TEST00003");
        nonCompliant.setTotalControls(100);
        nonCompliant.setCompliantControls(50);
        nonCompliant.setPartiallyCompliant(20);
        nonCompliant.setNonCompliant(30);
        nonCompliant.setNotApplicable(0);
        nonCompliant.setStatus("IN_PROGRESS");

        when(repository.findByAssessmentCode("GA-TEST00003")).thenReturn(Optional.of(nonCompliant));

        GuidelineAssessment resultNon = service.complete("GA-TEST00003");
        assertThat(resultNon.getOverallRating()).isEqualTo("NON_COMPLIANT");
    }
}
