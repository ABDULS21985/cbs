package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.IslamicAmlDashboard;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.IslamicAmlAlertStatus;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.repository.CombinedScreeningAuditLogRepository;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicStrSarRepository;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicAmlDashboardServiceTest {

    @Mock private IslamicAmlAlertRepository alertRepository;
    @Mock private SanctionsScreeningResultRepository screeningResultRepository;
    @Mock private IslamicStrSarRepository sarRepository;
    @Mock private ShariahScreeningResultRepository shariahScreeningResultRepository;
    @Mock private CombinedScreeningAuditLogRepository combinedScreeningAuditLogRepository;

    @InjectMocks private IslamicAmlDashboardService service;

    @Test
    @DisplayName("Alert summary aggregates counts by status and rule code")
    void getAlertSummary_aggregatesCounts() {
        when(alertRepository.countByCreatedAtBetween(any(Instant.class), any(Instant.class))).thenReturn(12L);
        when(alertRepository.countByStatusAndCreatedAtBetween(
                org.mockito.ArgumentMatchers.eq(IslamicAmlAlertStatus.NEW), any(Instant.class), any(Instant.class)))
                .thenReturn(4L);
        when(alertRepository.countByStatusAndCreatedAtBetween(
                org.mockito.ArgumentMatchers.eq(IslamicAmlAlertStatus.UNDER_INVESTIGATION), any(Instant.class), any(Instant.class)))
                .thenReturn(3L);
        when(alertRepository.countByStatusAndCreatedAtBetween(
                org.mockito.ArgumentMatchers.eq(IslamicAmlAlertStatus.ESCALATED), any(Instant.class), any(Instant.class)))
                .thenReturn(2L);
        when(alertRepository.countOverdueAlerts()).thenReturn(1L);
        when(alertRepository.countGroupByRuleCode(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(new Object[]{"IAML-TWR-001", 5L}, new Object[]{"IAML-POOL-001", 2L}));

        IslamicAmlDashboard.AlertSummary result =
                service.getAlertSummary(LocalDate.now().minusDays(30), LocalDate.now());

        assertEquals(12L, result.getTotalAlerts());
        assertEquals(4L, result.getNewAlerts());
        assertEquals(3L, result.getUnderInvestigation());
        assertEquals(2L, result.getEscalated());
        assertEquals(1L, result.getOverdueAlerts());
        assertEquals(5L, result.getAlertsByCategory().get("IAML-TWR-001"));
    }

    @Test
    @DisplayName("Combined screening widget counts shariah sanctions and dual blocks")
    void getCombinedScreeningWidget_aggregatesCounts() {
        when(screeningResultRepository.count()).thenReturn(20L);
        when(shariahScreeningResultRepository.count()).thenReturn(15L);
        when(screeningResultRepository.countByOverallResult(SanctionsOverallResult.CONFIRMED_MATCH)).thenReturn(2L);
        when(screeningResultRepository.countByOverallResult(SanctionsOverallResult.POTENTIAL_MATCH)).thenReturn(3L);
        when(screeningResultRepository.countByOverallResult(SanctionsOverallResult.CLEAR)).thenReturn(15L);
        when(shariahScreeningResultRepository.countByOverallResult(ScreeningOverallResult.FAIL)).thenReturn(4L);
        when(shariahScreeningResultRepository.countByOverallResult(ScreeningOverallResult.PASS)).thenReturn(11L);
        when(combinedScreeningAuditLogRepository.countByOutcomeAndCreatedAtBetween(
                org.mockito.ArgumentMatchers.eq(CombinedScreeningOutcome.DUAL_BLOCKED),
                any(Instant.class), any(Instant.class))).thenReturn(2L);

        IslamicAmlDashboard.CombinedScreeningWidget result =
                service.getCombinedScreeningWidget(LocalDate.now().minusDays(7), LocalDate.now());

        assertNotNull(result);
        assertEquals(35L, result.getTotalCombinedScreenings());
        assertEquals(4L, result.getShariahBlocked());
        assertEquals(5L, result.getSanctionsBlocked());
        assertEquals(2L, result.getDualBlocked());
        assertEquals(26L, result.getClearCount());
    }
}
