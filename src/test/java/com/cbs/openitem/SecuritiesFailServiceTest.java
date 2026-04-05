package com.cbs.openitem;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.openitem.entity.SecuritiesFail;
import com.cbs.openitem.repository.SecuritiesFailRepository;
import com.cbs.openitem.service.SecuritiesFailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecuritiesFailServiceTest {

    @Mock private SecuritiesFailRepository repository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private SecuritiesFailService service;

    // ── recordFail ──────────────────────────────────────────────────────

    @Test
    @DisplayName("recordFail - sets ref starting with SF-, status=OPEN, escalationLevel=OPERATIONS")
    void recordFail_setsRefStatusAndEscalation() {
        when(repository.save(any(SecuritiesFail.class))).thenAnswer(inv -> {
            SecuritiesFail f = inv.getArgument(0);
            f.setId(1L);
            return f;
        });

        SecuritiesFail fail = new SecuritiesFail();
        fail.setFailType("DELIVERY_FAIL");
        fail.setInstrumentCode("BOND-001");
        fail.setAmount(new BigDecimal("500000"));
        fail.setFailStartDate(LocalDate.now());

        SecuritiesFail result = service.recordFail(fail);

        assertThat(result.getFailRef()).startsWith("SF-");
        assertThat(result.getFailRef()).hasSize(13); // "SF-" + 10 chars
        assertThat(result.getStatus()).isEqualTo("OPEN");
        assertThat(result.getEscalationLevel()).isEqualTo("OPERATIONS");
        assertThat(result.getPenaltyAccrued()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(repository).save(fail);
    }

    // ── escalateFail ────────────────────────────────────────────────────

    @Test
    @DisplayName("escalateFail - escalates to DESK_HEAD after >3 days")
    void escalateFail_escalatesToDeskHead_after3Days() {
        SecuritiesFail fail = buildFail(1L, LocalDate.now().minusDays(5));

        when(repository.findById(1L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SecuritiesFail result = service.escalateFail(1L);

        assertThat(result.getEscalationLevel()).isEqualTo("DESK_HEAD");
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getAgingDays()).isEqualTo(5);
    }

    @Test
    @DisplayName("escalateFail - escalates to COMPLIANCE after >7 days")
    void escalateFail_escalatesToCompliance_after7Days() {
        SecuritiesFail fail = buildFail(2L, LocalDate.now().minusDays(10));

        when(repository.findById(2L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SecuritiesFail result = service.escalateFail(2L);

        assertThat(result.getEscalationLevel()).isEqualTo("COMPLIANCE");
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getAgingDays()).isEqualTo(10);
    }

    @Test
    @DisplayName("escalateFail - escalates to SENIOR_MANAGEMENT after >14 days")
    void escalateFail_escalatesToSeniorManagement_after14Days() {
        SecuritiesFail fail = buildFail(3L, LocalDate.now().minusDays(20));

        when(repository.findById(3L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SecuritiesFail result = service.escalateFail(3L);

        assertThat(result.getEscalationLevel()).isEqualTo("SENIOR_MANAGEMENT");
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getAgingDays()).isEqualTo(20);
    }

    // ── initiateBuyIn ───────────────────────────────────────────────────

    @Test
    @DisplayName("initiateBuyIn - sets buyInEligible=true, deadline=now+4d, status=BUY_IN_INITIATED")
    void initiateBuyIn_setsBuyInEligibleAndDeadline() {
        SecuritiesFail fail = buildFail(4L, LocalDate.now().minusDays(8));

        when(repository.findById(4L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SecuritiesFail result = service.initiateBuyIn(4L);

        assertThat(result.getBuyInEligible()).isTrue();
        assertThat(result.getBuyInDeadline()).isEqualTo(LocalDate.now().plusDays(4));
        assertThat(result.getStatus()).isEqualTo("BUY_IN_INITIATED");
    }

    // ── calculatePenalty ────────────────────────────────────────────────

    @Test
    @DisplayName("calculatePenalty - applies CSDR formula: amount * dailyRate * agingDays / 10000")
    void calculatePenalty_appliesCSDRFormula() {
        SecuritiesFail fail = new SecuritiesFail();
        fail.setId(5L);
        fail.setFailRef("SF-PENALTY");
        fail.setFailType("DELIVERY_FAIL");
        fail.setFailStartDate(LocalDate.now().minusDays(10));
        fail.setAmount(new BigDecimal("100000"));
        fail.setPenaltyAccrued(BigDecimal.ZERO);

        when(repository.findById(5L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // penalty = 100000 * 0.5 * 10 / 10000 = 50.0000
        SecuritiesFail result = service.calculatePenalty(5L, new BigDecimal("0.5"));

        assertThat(result.getPenaltyAccrued()).isEqualByComparingTo(new BigDecimal("50.0000"));
        assertThat(result.getAgingDays()).isEqualTo(10);
    }

    // ── resolveFail ─────────────────────────────────────────────────────

    @Test
    @DisplayName("resolveFail - sets resolutionAction, notes, resolvedAt, status=RESOLVED")
    void resolveFail_setsResolutionAndStatus() {
        SecuritiesFail fail = buildFail(6L, LocalDate.now().minusDays(3));

        when(repository.findById(6L)).thenReturn(Optional.of(fail));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SecuritiesFail result = service.resolveFail(6L, "MANUAL_SETTLEMENT", "Settled via bilateral agreement");

        assertThat(result.getResolutionAction()).isEqualTo("MANUAL_SETTLEMENT");
        assertThat(result.getResolutionNotes()).isEqualTo("Settled via bilateral agreement");
        assertThat(result.getResolvedAt()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("RESOLVED");
    }

    // ── getByRef ────────────────────────────────────────────────────────

    @Test
    @DisplayName("getByRef - throws ResourceNotFoundException when ref not found")
    void getByRef_throwsWhenNotFound() {
        when(repository.findByFailRef("SF-MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByRef("SF-MISSING"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("SecuritiesFail")
                .hasMessageContaining("SF-MISSING");
    }

    // ── dashboard ───────────────────────────────────────────────────────

    @Test
    @DisplayName("dashboard - aggregates totalFails, openFails count, and byType grouping")
    @SuppressWarnings("unchecked")
    void dashboard_aggregatesCorrectly() {
        SecuritiesFail open1 = new SecuritiesFail();
        open1.setFailType("DELIVERY_FAIL");
        open1.setStatus("OPEN");
        open1.setPenaltyAccrued(new BigDecimal("100"));
        open1.setAgingBucket("1_TO_3_DAYS");

        SecuritiesFail open2 = new SecuritiesFail();
        open2.setFailType("DELIVERY_FAIL");
        open2.setStatus("ESCALATED");
        open2.setPenaltyAccrued(new BigDecimal("200"));
        open2.setAgingBucket("4_TO_7_DAYS");

        SecuritiesFail resolved = new SecuritiesFail();
        resolved.setFailType("CASH_SHORTFALL");
        resolved.setStatus("RESOLVED");
        resolved.setPenaltyAccrued(new BigDecimal("50"));
        resolved.setAgingBucket("8_TO_14_DAYS");

        when(repository.findAll()).thenReturn(List.of(open1, open2, resolved));

        Map<String, Object> dashboard = service.getFailsDashboard();

        assertThat(dashboard.get("totalFails")).isEqualTo(3);
        assertThat(dashboard.get("openFails")).isEqualTo(2L); // OPEN + ESCALATED (not RESOLVED)

        Map<String, Long> byType = (Map<String, Long>) dashboard.get("byType");
        assertThat(byType.get("DELIVERY_FAIL")).isEqualTo(2L);
        assertThat(byType.get("CASH_SHORTFALL")).isEqualTo(1L);

        assertThat(dashboard.get("totalPenalty"))
                .isEqualTo(new BigDecimal("350")); // 100 + 200 + 50
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private SecuritiesFail buildFail(Long id, LocalDate failStartDate) {
        SecuritiesFail fail = new SecuritiesFail();
        fail.setId(id);
        fail.setFailRef("SF-TEST" + id);
        fail.setFailType("DELIVERY_FAIL");
        fail.setFailStartDate(failStartDate);
        fail.setAmount(new BigDecimal("500000"));
        fail.setPenaltyAccrued(BigDecimal.ZERO);
        fail.setAgingDays(0);
        fail.setEscalationLevel("OPERATIONS");
        fail.setStatus("OPEN");
        return fail;
    }
}
