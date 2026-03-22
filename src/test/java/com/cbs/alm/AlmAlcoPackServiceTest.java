package com.cbs.alm;

import com.cbs.alm.entity.*;
import com.cbs.alm.repository.*;
import com.cbs.alm.service.AlmService;
import com.cbs.common.audit.CurrentActorProvider;
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
class AlmAlcoPackServiceTest {

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
    // ALCO Pack Tests
    // ===================================================================

    @Nested
    @DisplayName("ALCO Pack Lifecycle")
    class AlcoPackTests {

        @Test
        @DisplayName("Create ALCO pack sets preparedBy from current actor")
        void createPack() {
            when(currentActorProvider.getCurrentActor()).thenReturn("treasury_head");
            when(alcoPackRepository.save(any())).thenAnswer(inv -> {
                AlcoPack p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            AlcoPack pack = AlcoPack.builder()
                    .month("2026-03")
                    .sections(List.of("executive-summary", "gap-analysis", "duration-report"))
                    .executiveSummary("Test summary")
                    .build();

            AlcoPack result = almService.createAlcoPack(pack);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getPreparedBy()).isEqualTo("treasury_head");
            assertThat(result.getMonth()).isEqualTo("2026-03");
            assertThat(result.getSections()).hasSize(3);
            assertThat(result.getStatus()).isEqualTo("DRAFT");
            verify(alcoPackRepository).save(pack);
        }

        @Test
        @DisplayName("Update ALCO pack only in DRAFT status")
        void updatePack_draftOnly() {
            AlcoPack existing = AlcoPack.builder()
                    .id(1L).month("2026-03").status("DRAFT")
                    .sections(new ArrayList<>(List.of("executive-summary")))
                    .executiveSummary("old").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(alcoPackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            List<String> newSections = List.of("executive-summary", "gap-analysis");
            AlcoPack result = almService.updateAlcoPack(1L, newSections, "new summary");

            assertThat(result.getSections()).hasSize(2);
            assertThat(result.getExecutiveSummary()).isEqualTo("new summary");
        }

        @Test
        @DisplayName("Cannot update ALCO pack in PENDING_REVIEW status")
        void updatePack_rejectNonDraft() {
            AlcoPack existing = AlcoPack.builder()
                    .id(1L).month("2026-03").status("PENDING_REVIEW").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> almService.updateAlcoPack(1L, List.of(), "x"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("DRAFT");
        }

        @Test
        @DisplayName("Submit ALCO pack: DRAFT -> PENDING_REVIEW")
        void submitForReview() {
            AlcoPack existing = AlcoPack.builder().id(1L).status("DRAFT").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(alcoPackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AlcoPack result = almService.submitAlcoPackForReview(1L);
            assertThat(result.getStatus()).isEqualTo("PENDING_REVIEW");
        }

        @Test
        @DisplayName("Approve ALCO pack: PENDING_REVIEW -> APPROVED")
        void approvePack() {
            AlcoPack existing = AlcoPack.builder().id(1L).status("PENDING_REVIEW").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(alcoPackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(currentActorProvider.getCurrentActor()).thenReturn("cfo");

            AlcoPack result = almService.approveAlcoPack(1L);
            assertThat(result.getStatus()).isEqualTo("APPROVED");
            assertThat(result.getApprovedBy()).isEqualTo("cfo");
            assertThat(result.getApprovedAt()).isNotNull();
        }

        @Test
        @DisplayName("Cannot approve pack that is not PENDING_REVIEW")
        void approvePack_rejectWrongStatus() {
            AlcoPack existing = AlcoPack.builder().id(1L).status("DRAFT").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> almService.approveAlcoPack(1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("PENDING_REVIEW");
        }

        @Test
        @DisplayName("Distribute ALCO pack: APPROVED -> DISTRIBUTED")
        void distributePack() {
            AlcoPack existing = AlcoPack.builder().id(1L).status("APPROVED").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(alcoPackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AlcoPack result = almService.distributeAlcoPack(1L);
            assertThat(result.getStatus()).isEqualTo("DISTRIBUTED");
            assertThat(result.getDistributedAt()).isNotNull();
        }

        @Test
        @DisplayName("Cannot distribute non-APPROVED pack")
        void distributePack_rejectWrongStatus() {
            AlcoPack existing = AlcoPack.builder().id(1L).status("PENDING_REVIEW").build();
            when(alcoPackRepository.findById(1L)).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> almService.distributeAlcoPack(1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("APPROVED");
        }

        @Test
        @DisplayName("Generate comprehensive executive summary from gap report, action items, returns, scenarios")
        void generateExecutiveSummary() {
            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.of(2026, 3, 20))
                    .niiBase(new BigDecimal("5000000000"))
                    .niiUp100bp(new BigDecimal("5250000000"))
                    .niiDown100bp(new BigDecimal("4750000000"))
                    .niiSensitivity(new BigDecimal("250000000"))
                    .eveBase(new BigDecimal("2000000000"))
                    .eveUp200bp(new BigDecimal("1850000000"))
                    .eveDown200bp(new BigDecimal("2150000000"))
                    .eveSensitivity(new BigDecimal("-150000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .gapRatio(new BigDecimal("1.0667"))
                    .durationGap(new BigDecimal("1.2"))
                    .weightedAvgDurationAssets(new BigDecimal("3.5"))
                    .weightedAvgDurationLiabs(new BigDecimal("2.3"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            // Action items
            AlcoActionItem openItem = AlcoActionItem.builder()
                    .id(1L).itemNumber("AI-0001").description("Review limits").owner("CFO")
                    .status("OPEN").dueDate(LocalDate.now().plusDays(7)).meetingDate(LocalDate.now()).build();
            AlcoActionItem overdueItem = AlcoActionItem.builder()
                    .id(2L).itemNumber("AI-0002").description("Submit IRRBB").owner("Risk")
                    .status("IN_PROGRESS").dueDate(LocalDate.now().minusDays(3)).meetingDate(LocalDate.now()).build();
            when(actionItemRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(openItem, overdueItem));

            // Regulatory returns
            AlmRegulatoryReturn lcrReturn = AlmRegulatoryReturn.builder()
                    .id(1L).code("LCR").name("LCR Return").frequency("DAILY")
                    .dueDate(LocalDate.now()).nextDue(LocalDate.now().plusDays(1)).status("SUBMITTED").build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(lcrReturn));

            // Scenarios
            when(scenarioRepository.findByIsActiveTrueOrderByScenarioNameAsc()).thenReturn(List.of());
            when(scenarioRepository.findByIsRegulatoryTrueAndIsActiveTrue()).thenReturn(List.of());

            Map<String, Object> result = almService.generateExecutiveSummary("2026-03");

            assertThat(result).containsKey("summary");
            String summary = (String) result.get("summary");
            assertThat(summary).contains("2026-03");
            assertThat(summary).contains("INTEREST RATE RISK");
            assertThat(summary).contains("DURATION RISK");
            assertThat(summary).contains("ACTION ITEMS");
            assertThat(summary).contains("REGULATORY SUBMISSIONS");
            assertThat(summary).contains("SCENARIO");
            assertThat(summary).contains("RECOMMENDATIONS");
            assertThat(summary).contains("ASSET-SENSITIVE");
            assertThat(summary).contains("OVERDUE");
            assertThat(summary).contains("AI-0001");
        }
    }

    // ===================================================================
    // Action Item Tests
    // ===================================================================

    @Nested
    @DisplayName("Action Items")
    class ActionItemTests {

        @Test
        @DisplayName("Create action item assigns item number")
        void createActionItem() {
            when(actionItemRepository.count()).thenReturn(5L);
            when(actionItemRepository.save(any())).thenAnswer(inv -> {
                AlcoActionItem item = inv.getArgument(0);
                item.setId(6L);
                return item;
            });

            AlcoActionItem item = AlcoActionItem.builder()
                    .description("Review duration gap limits")
                    .owner("Treasury Head")
                    .dueDate(LocalDate.of(2026, 4, 15))
                    .meetingDate(LocalDate.of(2026, 3, 20))
                    .build();

            AlcoActionItem result = almService.createActionItem(item);

            assertThat(result.getItemNumber()).isEqualTo("AI-0006");
            assertThat(result.getDescription()).isEqualTo("Review duration gap limits");
            assertThat(result.getStatus()).isEqualTo("OPEN");
        }

        @Test
        @DisplayName("Update action item status: OPEN -> IN_PROGRESS")
        void updateStatus() {
            AlcoActionItem existing = AlcoActionItem.builder()
                    .id(1L).itemNumber("AI-0001").status("OPEN")
                    .description("Test").owner("Alice").dueDate(LocalDate.now())
                    .meetingDate(LocalDate.now()).build();
            when(actionItemRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(actionItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AlcoActionItem result = almService.updateActionItemStatus(1L, "IN_PROGRESS", "Started work");

            assertThat(result.getStatus()).isEqualTo("IN_PROGRESS");
            assertThat(result.getUpdateNotes()).isEqualTo("Started work");
        }

        @Test
        @DisplayName("Update action item status: IN_PROGRESS -> CLOSED")
        void closeItem() {
            AlcoActionItem existing = AlcoActionItem.builder()
                    .id(1L).itemNumber("AI-0001").status("IN_PROGRESS")
                    .description("Test").owner("Alice").dueDate(LocalDate.now())
                    .meetingDate(LocalDate.now()).build();
            when(actionItemRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(actionItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AlcoActionItem result = almService.updateActionItemStatus(1L, "CLOSED", "Completed");
            assertThat(result.getStatus()).isEqualTo("CLOSED");
        }
    }

    // ===================================================================
    // Regulatory Return Tests
    // ===================================================================

    @Nested
    @DisplayName("Regulatory Returns")
    class RegulatoryReturnTests {

        @Test
        @DisplayName("Validate return: populates data from gap report and detects breaches")
        void validateReturn_withData() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("IRRBB").name("IRRBB Report")
                    .frequency("QUARTERLY").dueDate(LocalDate.of(2026, 3, 31))
                    .nextDue(LocalDate.of(2026, 6, 30)).status("DRAFT").build();
            when(regulatoryReturnRepository.findById(1L)).thenReturn(Optional.of(ret));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // Gap report with NII sensitivity within limits
            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.of(2026, 3, 20))
                    .niiBase(new BigDecimal("5000000000"))
                    .niiSensitivity(new BigDecimal("250000000")) // 5% of base - within 15% limit
                    .eveBase(new BigDecimal("2000000000"))
                    .eveSensitivity(new BigDecimal("-100000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .gapRatio(new BigDecimal("1.0667"))
                    .durationGap(new BigDecimal("1.2"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.validateRegulatoryReturn(1L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) result.get("errors");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> warnings = (List<Map<String, Object>>) result.get("warnings");

            assertThat(errors).isEmpty(); // NII sensitivity 5% < 15%
            assertThat(ret.getStatus()).isEqualTo("VALIDATED");
            assertThat(ret.getData()).containsKey("niiBase");
        }

        @Test
        @DisplayName("Validate return: flags NII breach when > 15%")
        void validateReturn_niiBreach() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("IRRBB").name("IRRBB Report")
                    .frequency("QUARTERLY").dueDate(LocalDate.of(2026, 3, 31))
                    .nextDue(LocalDate.of(2026, 6, 30)).status("DRAFT").build();
            when(regulatoryReturnRepository.findById(1L)).thenReturn(Optional.of(ret));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // Gap report with NII sensitivity exceeding 15% limit
            AlmGapReport report = AlmGapReport.builder()
                    .reportDate(LocalDate.of(2026, 3, 20))
                    .niiBase(new BigDecimal("5000000000"))
                    .niiSensitivity(new BigDecimal("1000000000")) // 20% > 15% - BREACH
                    .eveBase(new BigDecimal("2000000000"))
                    .eveSensitivity(new BigDecimal("-100000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .cumulativeGap(new BigDecimal("5000000000"))
                    .gapRatio(new BigDecimal("1.0667"))
                    .durationGap(new BigDecimal("1.2"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.validateRegulatoryReturn(1L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) result.get("errors");

            assertThat(errors).isNotEmpty();
            assertThat(errors.get(0).get("rule")).isEqualTo("NII_DECLINE_15PCT");
            // Status should NOT be VALIDATED if errors found
            assertThat(ret.getStatus()).isEqualTo("DRAFT");
        }

        @Test
        @DisplayName("Submit validated return creates submission record")
        void submitReturn() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("LCR").name("LCR Return")
                    .frequency("DAILY").dueDate(LocalDate.now())
                    .nextDue(LocalDate.now().plusDays(1))
                    .status("VALIDATED").build();
            when(regulatoryReturnRepository.findById(1L)).thenReturn(Optional.of(ret));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(currentActorProvider.getCurrentActor()).thenReturn("compliance_officer");
            when(regulatorySubmissionRepository.save(any())).thenAnswer(inv -> {
                AlmRegulatorySubmission sub = inv.getArgument(0);
                sub.setId(1L);
                return sub;
            });

            AlmRegulatorySubmission submission = almService.submitRegulatoryReturn(1L);

            assertThat(submission.getReturnCode()).isEqualTo("LCR");
            assertThat(submission.getSubmittedBy()).isEqualTo("compliance_officer");
            assertThat(submission.getReferenceNumber()).startsWith("CBN-LCR-");
            assertThat(submission.getStatus()).isEqualTo("SUBMITTED");
            assertThat(ret.getStatus()).isEqualTo("SUBMITTED");
            assertThat(ret.getLastSubmittedBy()).isEqualTo("compliance_officer");
        }

        @Test
        @DisplayName("Cannot submit non-VALIDATED return")
        void submitReturn_rejectNonValidated() {
            AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                    .id(1L).code("NSFR").name("NSFR Return")
                    .frequency("MONTHLY").dueDate(LocalDate.now())
                    .nextDue(LocalDate.now().plusMonths(1))
                    .status("DRAFT").build();
            when(regulatoryReturnRepository.findById(1L)).thenReturn(Optional.of(ret));

            assertThatThrownBy(() -> almService.submitRegulatoryReturn(1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("VALIDATED");
        }

        @Test
        @DisplayName("Advance submitted daily return to next business day")
        void advanceSubmittedReturn_daily() {
            // Friday submitted, should advance to Monday
            LocalDate friday = LocalDate.of(2026, 3, 20); // Friday
            AlmRegulatoryReturn dailyReturn = AlmRegulatoryReturn.builder()
                    .id(1L).code("LCR").name("LCR Return").frequency("DAILY")
                    .dueDate(friday).nextDue(friday).status("SUBMITTED").build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(dailyReturn));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int count = almService.advanceSubmittedReturnDates();

            assertThat(count).isEqualTo(1);
            assertThat(dailyReturn.getStatus()).isEqualTo("DRAFT");
            // nextDue should be advanced past the weekend
            assertThat(dailyReturn.getDueDate().getDayOfWeek().getValue()).isLessThanOrEqualTo(5);
            assertThat(dailyReturn.getNextDue().isAfter(dailyReturn.getDueDate())).isTrue();
        }

        @Test
        @DisplayName("Advance submitted monthly return to next month")
        void advanceSubmittedReturn_monthly() {
            // Use a past date so the filter passes (nextDue must be <= today)
            LocalDate febEnd = LocalDate.of(2026, 2, 28);
            AlmRegulatoryReturn monthlyReturn = AlmRegulatoryReturn.builder()
                    .id(2L).code("NSFR").name("NSFR Return").frequency("MONTHLY")
                    .dueDate(febEnd).nextDue(febEnd).status("SUBMITTED").build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(monthlyReturn));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int count = almService.advanceSubmittedReturnDates();

            assertThat(count).isEqualTo(1);
            assertThat(monthlyReturn.getStatus()).isEqualTo("DRAFT");
            assertThat(monthlyReturn.getDueDate().getMonthValue()).isEqualTo(3); // March
            assertThat(monthlyReturn.getNextDue().getMonthValue()).isEqualTo(4); // April
        }

        @Test
        @DisplayName("Advance submitted quarterly return to next quarter")
        void advanceSubmittedReturn_quarterly() {
            // Use a past quarter-end date so the filter passes
            LocalDate q4End = LocalDate.of(2025, 12, 31);
            AlmRegulatoryReturn quarterlyReturn = AlmRegulatoryReturn.builder()
                    .id(3L).code("IRRBB").name("IRRBB Report").frequency("QUARTERLY")
                    .dueDate(q4End).nextDue(q4End).status("SUBMITTED").build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(quarterlyReturn));
            when(regulatoryReturnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int count = almService.advanceSubmittedReturnDates();

            assertThat(count).isEqualTo(1);
            assertThat(quarterlyReturn.getStatus()).isEqualTo("DRAFT");
            assertThat(quarterlyReturn.getDueDate().getMonthValue()).isEqualTo(3); // March
            assertThat(quarterlyReturn.getNextDue().getMonthValue()).isEqualTo(6); // June
        }

        @Test
        @DisplayName("Does not advance non-SUBMITTED returns")
        void advanceReturn_skipsNonSubmitted() {
            AlmRegulatoryReturn draftReturn = AlmRegulatoryReturn.builder()
                    .id(1L).code("LCR").name("LCR Return").frequency("DAILY")
                    .dueDate(LocalDate.now()).nextDue(LocalDate.now()).status("DRAFT").build();
            when(regulatoryReturnRepository.findAllByOrderByNextDueAsc()).thenReturn(List.of(draftReturn));

            int count = almService.advanceSubmittedReturnDates();

            assertThat(count).isEqualTo(0);
            assertThat(draftReturn.getStatus()).isEqualTo("DRAFT");
        }
    }

    // ===================================================================
    // Stress Testing Tests
    // ===================================================================

    @Nested
    @DisplayName("Stress Testing")
    class StressTestingTests {

        @Test
        @DisplayName("Run stress scenario produces waterfall, EVE, capital, and breach data")
        void runStressScenario() {
            AlmScenario scenario = AlmScenario.builder()
                    .id(1L).scenarioName("Parallel Up 200")
                    .scenarioType("PARALLEL_UP")
                    .shiftBps(Map.of("1Y", 200, "2Y", 200, "5Y", 200, "10Y", 200))
                    .build();
            when(scenarioRepository.findById(1L)).thenReturn(Optional.of(scenario));
            when(currentActorProvider.getCurrentActor()).thenReturn("tester");
            when(stressTestRunRepository.save(any())).thenAnswer(inv -> { StressTestRun r = inv.getArgument(0); r.setId(1L); return r; });

            AlmGapReport report = AlmGapReport.builder()
                    .niiBase(new BigDecimal("5000000000"))
                    .eveBase(new BigDecimal("2000000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .durationGap(new BigDecimal("1.2"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.runStressScenario(1L);

            assertThat(result).containsKeys("scenarioId", "scenarioName", "avgShockBps",
                    "niiWaterfall", "eveBreakdown", "capitalAdequacy", "balanceSheetProjection",
                    "limitBreaches", "niiImpact", "eveImpact", "runAt");
            assertThat((int) result.get("avgShockBps")).isEqualTo(200);
            assertThat((String) result.get("scenarioName")).isEqualTo("Parallel Up 200");
        }

        @Test
        @DisplayName("Historical replay returns path with monthly PnL")
        void historicalReplay() {
            AlmGapReport report = AlmGapReport.builder()
                    .niiBase(new BigDecimal("5000000000"))
                    .totalRsa(new BigDecimal("80000000000"))
                    .totalRsl(new BigDecimal("75000000000"))
                    .build();
            when(gapReportRepository.findAll()).thenReturn(List.of(report));

            Map<String, Object> result = almService.historicalReplay("GFC_2008");

            assertThat(result.get("crisisName")).isEqualTo("GFC_2008");
            assertThat((int) result.get("totalMonths")).isEqualTo(13);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> path = (List<Map<String, Object>>) result.get("path");
            assertThat(path).hasSize(13);
            assertThat(path.get(0).get("rateBps")).isEqualTo(0);
        }

        @Test
        @DisplayName("Compare scenarios returns results for all requested IDs")
        void compareScenarios() {
            AlmScenario s1 = AlmScenario.builder().id(1L).scenarioName("Up").scenarioType("PARALLEL_UP")
                    .shiftBps(Map.of("1Y", 100)).build();
            AlmScenario s2 = AlmScenario.builder().id(2L).scenarioName("Down").scenarioType("PARALLEL_DOWN")
                    .shiftBps(Map.of("1Y", -100)).build();
            when(scenarioRepository.findById(1L)).thenReturn(Optional.of(s1));
            when(scenarioRepository.findById(2L)).thenReturn(Optional.of(s2));
            when(currentActorProvider.getCurrentActor()).thenReturn("tester");
            when(stressTestRunRepository.save(any())).thenAnswer(inv -> { StressTestRun r = inv.getArgument(0); r.setId(99L); return r; });
            when(gapReportRepository.findAll()).thenReturn(List.of(
                    AlmGapReport.builder().niiBase(new BigDecimal("5000000000"))
                            .eveBase(new BigDecimal("2000000000"))
                            .totalRsa(new BigDecimal("80000000000"))
                            .totalRsl(new BigDecimal("75000000000"))
                            .durationGap(new BigDecimal("1.2")).build()));

            Map<String, Object> result = almService.compareScenarios(List.of(1L, 2L));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> scenarios = (List<Map<String, Object>>) result.get("scenarios");
            assertThat(scenarios).hasSize(2);
            assertThat(result).containsKey("comparedAt");
        }
    }
}
