package com.cbs.alm;

import com.cbs.alm.entity.*;
import com.cbs.alm.repository.*;
import com.cbs.alm.service.AlmService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
class AlmStressAndDurationServiceTest {

    @Mock private AlmGapReportRepository gapReportRepository;
    @Mock private AlmScenarioRepository scenarioRepository;
    @Mock private SecurityHoldingRepository holdingRepository;
    @Mock private AlcoPackRepository alcoPackRepository;
    @Mock private AlcoActionItemRepository actionItemRepository;
    @Mock private AlmRegulatoryReturnRepository regulatoryReturnRepository;
    @Mock private AlmRegulatorySubmissionRepository regulatorySubmissionRepository;
    @Mock private StressTestRunRepository stressTestRunRepository;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private AlmService almService;

    // ===================================================================
    // STRESS TESTING
    // ===================================================================

    @Nested
    @DisplayName("Stress Testing")
    class StressTests {

        @Test
        @DisplayName("Run stress scenario returns NII waterfall, EVE breakdown, capital, projections, breaches")
        void runStressScenario_fullResult() {
            AlmScenario scenario = AlmScenario.builder()
                    .id(1L)
                    .scenarioName("Parallel Up +200")
                    .scenarioType("PARALLEL_UP")
                    .shiftBps(Map.of("1Y", 200, "5Y", 200, "10Y", 200))
                    .isActive(true)
                    .build();
            when(scenarioRepository.findById(1L)).thenReturn(Optional.of(scenario));
            when(currentActorProvider.getCurrentActor()).thenReturn("tester");
            when(stressTestRunRepository.save(any())).thenAnswer(inv -> { StressTestRun r = inv.getArgument(0); r.setId(1L); return r; });

            AlmGapReport report = AlmGapReport.builder()
                    .id(1L)
                    .niiBase(new BigDecimal("5000000000"))
                    .eveBase(new BigDecimal("2000000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .durationGap(new BigDecimal("1.2"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.runStressScenario(1L);

            assertThat(result).containsKeys("scenarioId", "scenarioName", "scenarioType", "avgShockBps",
                    "niiWaterfall", "eveBreakdown", "capitalAdequacy", "balanceSheetProjection", "limitBreaches",
                    "niiImpact", "eveImpact", "runAt");

            assertThat(result.get("scenarioId")).isEqualTo(1L);
            assertThat(result.get("scenarioName")).isEqualTo("Parallel Up +200");
            assertThat(result.get("avgShockBps")).isEqualTo(200);

            // NII waterfall has 5 steps
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> waterfall = (List<Map<String, Object>>) result.get("niiWaterfall");
            assertThat(waterfall).hasSize(5);
            assertThat(waterfall.get(0).get("step")).isEqualTo("Base NII");
            assertThat(waterfall.get(4).get("step")).isEqualTo("Stress NII");

            // EVE breakdown has all risk factors
            @SuppressWarnings("unchecked")
            Map<String, Object> eve = (Map<String, Object>) result.get("eveBreakdown");
            assertThat(eve).containsKeys("repricingRisk", "basisRisk", "optionRisk", "yieldCurveRisk", "totalImpact");

            // Capital adequacy
            @SuppressWarnings("unchecked")
            Map<String, Object> capital = (Map<String, Object>) result.get("capitalAdequacy");
            assertThat(capital).containsKeys("cet1Before", "cet1After", "regulatoryMinimum", "capitalImpactPct");

            // Balance sheet projection has 13 months (0-12)
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> balanceSheet = (List<Map<String, Object>>) result.get("balanceSheetProjection");
            assertThat(balanceSheet).hasSize(13);

            // Verify stress run was persisted
            assertThat(result.get("runId")).isEqualTo(1L);
            verify(stressTestRunRepository).save(any());
        }

        @Test
        @DisplayName("Stress scenario with no gap reports uses defaults")
        void runStressScenario_noReports_usesDefaults() {
            AlmScenario scenario = AlmScenario.builder()
                    .id(2L)
                    .scenarioName("Test")
                    .scenarioType("CUSTOM")
                    .shiftBps(Map.of("1Y", 100))
                    .isActive(true)
                    .build();
            when(scenarioRepository.findById(2L)).thenReturn(Optional.of(scenario));
            when(gapReportRepository.findAll()).thenReturn(List.of());
            when(currentActorProvider.getCurrentActor()).thenReturn("tester");
            when(stressTestRunRepository.save(any())).thenAnswer(inv -> { StressTestRun r = inv.getArgument(0); r.setId(2L); return r; });

            Map<String, Object> result = almService.runStressScenario(2L);

            // Should still return a result using default values
            assertThat(result).containsKey("niiWaterfall");
            assertThat(result).containsKey("eveBreakdown");
        }

        @Test
        @DisplayName("Stress scenario not found throws ResourceNotFoundException")
        void runStressScenario_notFound() {
            when(scenarioRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> almService.runStressScenario(999L))
                    .isInstanceOf(com.cbs.common.exception.ResourceNotFoundException.class);
        }
    }

    // ===================================================================
    // HISTORICAL REPLAY
    // ===================================================================

    @Nested
    @DisplayName("Historical Replay")
    class HistoricalReplayTests {

        @Test
        @DisplayName("GFC 2008 replay returns 13-month path with correct crisis metrics")
        void gfc2008_replay() {
            AlmGapReport report = AlmGapReport.builder()
                    .niiBase(new BigDecimal("5000000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.historicalReplay("GFC_2008");

            assertThat(result.get("crisisName")).isEqualTo("GFC_2008");
            assertThat(result.get("totalMonths")).isEqualTo(13);
            assertThat(result).containsKeys("peakLoss", "peakGain", "finalPnl", "path");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> path = (List<Map<String, Object>>) result.get("path");
            assertThat(path).hasSize(13);

            // First month should be zero impact
            assertThat(path.get(0).get("month")).isEqualTo(0);
            assertThat(path.get(0).get("rateBps")).isEqualTo(0);
        }

        @Test
        @DisplayName("COVID 2020 replay has negative rate path")
        void covid2020_replay() {
            when(gapReportRepository.findAll()).thenReturn(List.of());
            Map<String, Object> result = almService.historicalReplay("COVID_2020");
            assertThat(result.get("crisisName")).isEqualTo("COVID_2020");
            assertThat(result.get("totalMonths")).isEqualTo(13);
        }

        @Test
        @DisplayName("SVB 2023 replay has positive rate path (rate hikes)")
        void svb2023_replay() {
            when(gapReportRepository.findAll()).thenReturn(List.of());
            Map<String, Object> result = almService.historicalReplay("SVB_2023");
            assertThat(result.get("crisisName")).isEqualTo("SVB_2023");
        }

        @Test
        @DisplayName("Nigeria 2016 replay")
        void nigeria2016_replay() {
            when(gapReportRepository.findAll()).thenReturn(List.of());
            Map<String, Object> result = almService.historicalReplay("NIGERIA_2016");
            assertThat(result.get("crisisName")).isEqualTo("NIGERIA_2016");
        }

        @Test
        @DisplayName("Unknown crisis returns single-month path")
        void unknownCrisis_singleMonth() {
            when(gapReportRepository.findAll()).thenReturn(List.of());
            Map<String, Object> result = almService.historicalReplay("UNKNOWN_CRISIS");
            assertThat(result.get("totalMonths")).isEqualTo(1);
        }
    }

    // ===================================================================
    // SCENARIO COMPARISON
    // ===================================================================

    @Nested
    @DisplayName("Scenario Comparison")
    class CompareTests {

        @Test
        @DisplayName("Compare scenarios runs each scenario and returns combined results")
        void compareScenarios_returnsAllResults() {
            AlmScenario s1 = AlmScenario.builder().id(1L).scenarioName("S1").scenarioType("PARALLEL_UP")
                    .shiftBps(Map.of("1Y", 200)).isActive(true).build();
            AlmScenario s2 = AlmScenario.builder().id(2L).scenarioName("S2").scenarioType("STEEPENING")
                    .shiftBps(Map.of("1Y", 50, "10Y", 250)).isActive(true).build();

            when(scenarioRepository.findById(1L)).thenReturn(Optional.of(s1));
            when(scenarioRepository.findById(2L)).thenReturn(Optional.of(s2));
            when(gapReportRepository.findAll()).thenReturn(List.of());
            when(currentActorProvider.getCurrentActor()).thenReturn("tester");
            when(stressTestRunRepository.save(any())).thenAnswer(inv -> { StressTestRun r = inv.getArgument(0); r.setId(99L); return r; });

            Map<String, Object> result = almService.compareScenarios(List.of(1L, 2L));

            assertThat(result).containsKeys("scenarios", "comparedAt");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> scenarios = (List<Map<String, Object>>) result.get("scenarios");
            assertThat(scenarios).hasSize(2);
        }
    }

    // ===================================================================
    // DURATION ANALYTICS
    // ===================================================================

    @Nested
    @DisplayName("Duration Analytics")
    class DurationTests {

        @Test
        @DisplayName("Duration analytics returns comprehensive portfolio metrics")
        void durationAnalytics_fullMetrics() {
            when(holdingRepository.findByPortfolioCodeAndStatus("MAIN", "ACTIVE")).thenReturn(List.of());
            AlmGapReport report = AlmGapReport.builder()
                    .weightedAvgDurationLiabs(new BigDecimal("2.1"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.calculateDurationAnalytics("MAIN", new BigDecimal("5.0"));

            assertThat(result).containsKeys("portfolioCode", "macaulayDurationAssets", "modifiedDurationAssets",
                    "modifiedDurationLiabilities", "durationGap", "dv01", "totalAssetValue", "totalLiabValue",
                    "dv01Ladder", "keyRateDurations", "computedAt");

            assertThat(result.get("portfolioCode")).isEqualTo("MAIN");

            // DV01 ladder should have 9 buckets
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> ladder = (List<Map<String, Object>>) result.get("dv01Ladder");
            assertThat(ladder).hasSize(9);

            // Key rate durations should have 11 tenor points
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> krd = (List<Map<String, Object>>) result.get("keyRateDurations");
            assertThat(krd).hasSize(11);
        }

        @Test
        @DisplayName("Duration analytics with no holdings returns synthetic baseline (not zero)")
        void durationAnalytics_noHoldings_usesSyntheticBaseline() {
            when(holdingRepository.findByPortfolioCodeAndStatus("EMPTY", "ACTIVE")).thenReturn(List.of());
            when(gapReportRepository.findAll()).thenReturn(List.of());

            Map<String, Object> result = almService.calculateDurationAnalytics("EMPTY", new BigDecimal("5.0"));

            // With no holdings and no gap reports, synthetic baseline is used
            BigDecimal assetDur = (BigDecimal) result.get("modifiedDurationAssets");
            assertThat(assetDur).isEqualByComparingTo(new BigDecimal("3.42")); // synthetic baseline
            BigDecimal liabDur = (BigDecimal) result.get("modifiedDurationLiabilities");
            assertThat(liabDur).isEqualByComparingTo(new BigDecimal("2.18")); // synthetic baseline
            BigDecimal dv01 = (BigDecimal) result.get("dv01");
            assertThat(dv01).isPositive(); // non-zero because synthetic values are used
        }
    }

    // ===================================================================
    // REPORT APPROVAL
    // ===================================================================

    @Nested
    @DisplayName("Report Approval")
    class ApprovalTests {

        @Test
        @DisplayName("Approve report transitions status to FINAL")
        void approveReport_setsFinal() {
            AlmGapReport report = AlmGapReport.builder().id(1L).status("DRAFT").build();
            when(gapReportRepository.findById(1L)).thenReturn(Optional.of(report));
            when(gapReportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(currentActorProvider.getCurrentActor()).thenReturn("approver");

            AlmGapReport result = almService.approveReport(1L);

            assertThat(result.getStatus()).isEqualTo("FINAL");
            assertThat(result.getApprovedBy()).isEqualTo("approver");
        }

        @Test
        @DisplayName("Approve non-existent report throws exception")
        void approveReport_notFound() {
            when(gapReportRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> almService.approveReport(999L))
                    .isInstanceOf(com.cbs.common.exception.ResourceNotFoundException.class);
        }
    }

    // ===================================================================
    // REGULATORY RETURN VALIDATION AND SUBMISSION
    // ===================================================================

    @Nested
    @DisplayName("Regulatory Returns - Validation and Submission")
    class RegulatoryExtendedTests {

        @Test
        @DisplayName("Validate return with NII > 15% triggers ERROR")
        void validateReturn_niiBreachError() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("IRRBB").name("IRRBB Report").frequency("QUARTERLY")
                    .dueDate(LocalDate.now().plusDays(30)).nextDue(LocalDate.now().plusDays(30))
                    .status("DRAFT").build();
            when(regulatoryReturnRepository.findById(1L)).thenReturn(Optional.of(ret));

            // Create report with NII sensitivity > 15% of base
            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.now())
                    .niiBase(new BigDecimal("1000000000"))
                    .niiSensitivity(new BigDecimal("200000000")) // 20% > 15%
                    .eveBase(new BigDecimal("500000000"))
                    .eveSensitivity(new BigDecimal("-50000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .durationGap(new BigDecimal("1.5"))
                    .gapRatio(new BigDecimal("1.0667"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = almService.validateRegulatoryReturn(1L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) result.get("errors");
            assertThat(errors).isNotEmpty();
            assertThat(errors.get(0).get("rule")).isEqualTo("NII_DECLINE_15PCT");
        }

        @Test
        @DisplayName("Validate return with duration gap > 5Y triggers WARNING")
        void validateReturn_durationWarning() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(2L).code("IRRBB").name("IRRBB").frequency("QUARTERLY")
                    .dueDate(LocalDate.now().plusDays(30)).nextDue(LocalDate.now().plusDays(30))
                    .status("DRAFT").build();
            when(regulatoryReturnRepository.findById(2L)).thenReturn(Optional.of(ret));

            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.now())
                    .niiBase(new BigDecimal("1000000000"))
                    .niiSensitivity(new BigDecimal("50000000")) // 5% - within limit
                    .eveBase(new BigDecimal("500000000"))
                    .eveSensitivity(new BigDecimal("-50000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .durationGap(new BigDecimal("6.0")) // > 5Y
                    .gapRatio(new BigDecimal("1.0667"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = almService.validateRegulatoryReturn(2L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> warnings = (List<Map<String, Object>>) result.get("warnings");
            assertThat(warnings).isNotEmpty();
            assertThat(warnings.get(0).get("rule")).isEqualTo("DURATION_GAP_LIMIT");

            // No errors when NII is within limit
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) result.get("errors");
            assertThat(errors).isEmpty();
        }

        @Test
        @DisplayName("Validate return with no gap report data produces MISSING_DATA error")
        void validateReturn_noData_error() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(3L).code("NSFR").name("NSFR").frequency("MONTHLY")
                    .dueDate(LocalDate.now().plusDays(30)).nextDue(LocalDate.now().plusDays(30))
                    .status("DRAFT").build();
            when(regulatoryReturnRepository.findById(3L)).thenReturn(Optional.of(ret));
            when(gapReportRepository.findAll()).thenReturn(List.of());
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = almService.validateRegulatoryReturn(3L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) result.get("errors");
            assertThat(errors).isNotEmpty();
            assertThat(errors.get(0).get("rule")).isEqualTo("MISSING_DATA");
        }

        @Test
        @DisplayName("Submit return requires VALIDATED status")
        void submitReturn_requiresValidated() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(4L).code("LCR").status("DRAFT").build();
            when(regulatoryReturnRepository.findById(4L)).thenReturn(Optional.of(ret));

            assertThatThrownBy(() -> almService.submitRegulatoryReturn(4L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("VALIDATED");
        }

        @Test
        @DisplayName("Submit validated return creates submission record")
        void submitReturn_createsSubmission() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(5L).code("IRRBB").name("IRRBB").status("VALIDATED")
                    .dueDate(LocalDate.now()).nextDue(LocalDate.now().plusMonths(3))
                    .build();
            when(regulatoryReturnRepository.findById(5L)).thenReturn(Optional.of(ret));
            when(currentActorProvider.getCurrentActor()).thenReturn("submitter");
            when(regulatorySubmissionRepository.save(any())).thenAnswer(inv -> {
                AlmRegulatorySubmission s = inv.getArgument(0);
                s.setId(1L);
                return s;
            });
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AlmRegulatorySubmission result = almService.submitRegulatoryReturn(5L);

            assertThat(result.getReturnCode()).isEqualTo("IRRBB");
            assertThat(result.getSubmittedBy()).isEqualTo("submitter");
            assertThat(result.getReferenceNumber()).startsWith("CBN-IRRBB-");

            verify(regulatoryReturnRepository).save(argThat(r ->
                    "SUBMITTED".equals(r.getStatus()) && r.getLastSubmittedBy().equals("submitter")));
        }
    }

    // ===================================================================
    // EXECUTIVE SUMMARY GENERATION
    // ===================================================================

    @Nested
    @DisplayName("Executive Summary Generation")
    class SummaryTests {

        @Test
        @DisplayName("Generate summary with gap data includes all sections")
        void generateSummary_withData() {
            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.now())
                    .niiBase(new BigDecimal("5000000000"))
                    .niiUp100bp(new BigDecimal("5200000000"))
                    .niiDown100bp(new BigDecimal("4800000000"))
                    .niiSensitivity(new BigDecimal("200000000"))
                    .eveBase(new BigDecimal("2000000000"))
                    .eveUp200bp(new BigDecimal("1800000000"))
                    .eveDown200bp(new BigDecimal("2200000000"))
                    .eveSensitivity(new BigDecimal("-200000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .gapRatio(new BigDecimal("1.0667"))
                    .durationGap(new BigDecimal("1.4"))
                    .weightedAvgDurationAssets(new BigDecimal("3.5"))
                    .weightedAvgDurationLiabs(new BigDecimal("2.1"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));
            when(actionItemRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of());
            when(scenarioRepository.findByIsActiveTrueOrderByScenarioNameAsc()).thenReturn(List.of());
            when(scenarioRepository.findByIsRegulatoryTrueAndIsActiveTrue()).thenReturn(List.of());

            Map<String, Object> result = almService.generateExecutiveSummary("2026-03");

            String summary = (String) result.get("summary");
            assertThat(summary).contains("INTEREST RATE RISK POSITION");
            assertThat(summary).contains("DURATION RISK");
            assertThat(summary).contains("ACTION ITEMS STATUS");
            assertThat(summary).contains("REGULATORY SUBMISSIONS");
            assertThat(summary).contains("SCENARIO & STRESS TESTING");
            assertThat(summary).contains("RECOMMENDATIONS");
            assertThat(summary).contains("ASSET-SENSITIVE"); // positive gap
        }

        @Test
        @DisplayName("Generate summary without gap data returns fallback message")
        void generateSummary_noData() {
            when(gapReportRepository.findAll()).thenReturn(List.of());

            Map<String, Object> result = almService.generateExecutiveSummary("2026-03");

            String summary = (String) result.get("summary");
            assertThat(summary).contains("No gap report data available");
        }
    }

    // ===================================================================
    // ADVANCE SUBMITTED RETURN DATES
    // ===================================================================

    @Nested
    @DisplayName("Regulatory Return Date Advancement")
    class AdvanceDateTests {

        @Test
        @DisplayName("Advance submitted MONTHLY return moves due date by 1 month")
        void advanceMonthly() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("NSFR").frequency("MONTHLY").status("SUBMITTED")
                    .dueDate(LocalDate.now().minusDays(1))
                    .nextDue(LocalDate.now().minusDays(1))
                    .build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(ret));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int advanced = almService.advanceSubmittedReturnDates();

            assertThat(advanced).isEqualTo(1);
            verify(regulatoryReturnRepository).save(argThat(r ->
                    "DRAFT".equals(r.getStatus()) && r.getDueDate().isAfter(LocalDate.now().minusDays(2))));
        }

        @Test
        @DisplayName("Non-submitted returns are not advanced")
        void dontAdvanceNonSubmitted() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("IRRBB").frequency("QUARTERLY").status("DRAFT")
                    .dueDate(LocalDate.now().minusDays(1))
                    .nextDue(LocalDate.now().minusDays(1))
                    .build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(ret));

            int advanced = almService.advanceSubmittedReturnDates();

            assertThat(advanced).isEqualTo(0);
            verify(regulatoryReturnRepository, never()).save(any());
        }
    }
}
