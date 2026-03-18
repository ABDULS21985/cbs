package com.cbs.openitem;

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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecuritiesFailServiceTest {

    @Mock
    private SecuritiesFailRepository repository;

    @InjectMocks
    private SecuritiesFailService service;

    @Test
    @DisplayName("Auto-escalation: >7 aging days escalates to COMPLIANCE")
    void escalateFailAutoEscalatesByAgingDays() {
        SecuritiesFail fail = new SecuritiesFail();
        fail.setId(1L);
        fail.setFailRef("SF-TEST00001");
        fail.setFailType("DELIVERY_FAIL");
        fail.setFailStartDate(LocalDate.now().minusDays(10));
        fail.setAgingDays(0);
        fail.setEscalationLevel("OPERATIONS");
        fail.setStatus("OPEN");
        fail.setPenaltyAccrued(BigDecimal.ZERO);
        fail.setAmount(new BigDecimal("500000"));

        when(repository.findById(1L)).thenReturn(Optional.of(fail));
        when(repository.save(any(SecuritiesFail.class))).thenAnswer(i -> i.getArgument(0));

        SecuritiesFail result = service.escalateFail(1L);

        assertThat(result.getEscalationLevel()).isEqualTo("COMPLIANCE");
        assertThat(result.getAgingDays()).isEqualTo(10);
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
    }

    @Test
    @DisplayName("Penalty accrual: amount × dailyRate × agingDays / 10000")
    void calculatePenaltyAccruesCorrectly() {
        SecuritiesFail fail = new SecuritiesFail();
        fail.setId(2L);
        fail.setFailRef("SF-TEST00002");
        fail.setFailType("CASH_SHORTFALL");
        fail.setFailStartDate(LocalDate.now().minusDays(5));
        fail.setAmount(new BigDecimal("1000000"));
        fail.setPenaltyAccrued(BigDecimal.ZERO);

        when(repository.findById(2L)).thenReturn(Optional.of(fail));
        when(repository.save(any(SecuritiesFail.class))).thenAnswer(i -> i.getArgument(0));

        // dailyRate = 1 bps = 1.0
        SecuritiesFail result = service.calculatePenalty(2L, new BigDecimal("1.0"));

        // penalty = 1,000,000 × 1.0 × 5 / 10000 = 500.0000
        assertThat(result.getPenaltyAccrued()).isEqualByComparingTo(new BigDecimal("500.0000"));
        assertThat(result.getAgingDays()).isEqualTo(5);
    }
}
