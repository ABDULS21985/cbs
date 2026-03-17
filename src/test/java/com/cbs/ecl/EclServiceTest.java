package com.cbs.ecl;

import com.cbs.ecl.entity.*;
import com.cbs.ecl.repository.*;
import com.cbs.ecl.service.EclService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EclServiceTest {

    @Mock private EclModelParameterRepository paramRepository;
    @Mock private EclCalculationRepository calcRepository;

    @InjectMocks private EclService eclService;

    @Test
    @DisplayName("Stage 1: performing loan (DPD=0) uses 12-month PD")
    void stage1_PerformingLoan() {
        EclModelParameter baseParam = EclModelParameter.builder()
                .segment("RETAIL").stage(1).macroScenario("BASE")
                .pd12Month(new BigDecimal("0.02")).pdLifetime(new BigDecimal("0.08"))
                .lgdRate(new BigDecimal("0.45")).eadCcf(BigDecimal.ONE)
                .scenarioWeight(new BigDecimal("0.50")).macroAdjustment(BigDecimal.ZERO).build();
        EclModelParameter optParam = EclModelParameter.builder()
                .segment("RETAIL").stage(1).macroScenario("OPTIMISTIC")
                .pd12Month(new BigDecimal("0.015")).lgdRate(new BigDecimal("0.40"))
                .scenarioWeight(new BigDecimal("0.25")).macroAdjustment(new BigDecimal("-0.01")).build();
        EclModelParameter pessParam = EclModelParameter.builder()
                .segment("RETAIL").stage(1).macroScenario("PESSIMISTIC")
                .pd12Month(new BigDecimal("0.03")).lgdRate(new BigDecimal("0.50"))
                .scenarioWeight(new BigDecimal("0.25")).macroAdjustment(new BigDecimal("0.02")).build();

        when(paramRepository.findActiveParams("RETAIL", 1, LocalDate.now())).thenReturn(List.of(baseParam, optParam, pessParam));
        when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(1L)).thenReturn(Optional.empty());
        when(calcRepository.save(any())).thenAnswer(inv -> { EclCalculation c = inv.getArgument(0); c.setId(1L); return c; });

        EclCalculation result = eclService.calculateEcl(1L, 100L, "RETAIL", "PL-001",
                new BigDecimal("1000000"), null, 0, false);

        assertThat(result.getCurrentStage()).isEqualTo(1);
        assertThat(result.getEad()).isEqualByComparingTo(new BigDecimal("1000000"));
        assertThat(result.getPdUsed()).isEqualByComparingTo(new BigDecimal("0.02")); // 12-month PD
        assertThat(result.getEclWeighted()).isPositive();
        assertThat(result.getPreviousEcl()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Stage 2: significant deterioration (DPD=45) uses lifetime PD")
    void stage2_SignificantDeterioration() {
        EclModelParameter param = EclModelParameter.builder()
                .segment("RETAIL").stage(2).macroScenario("BASE")
                .pd12Month(new BigDecimal("0.05")).pdLifetime(new BigDecimal("0.15"))
                .lgdRate(new BigDecimal("0.50")).eadCcf(BigDecimal.ONE)
                .scenarioWeight(new BigDecimal("0.50")).macroAdjustment(BigDecimal.ZERO).build();

        when(paramRepository.findActiveParams("RETAIL", 2, LocalDate.now())).thenReturn(List.of(param));
        when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(2L)).thenReturn(Optional.empty());
        when(calcRepository.save(any())).thenAnswer(inv -> { EclCalculation c = inv.getArgument(0); c.setId(2L); return c; });

        EclCalculation result = eclService.calculateEcl(2L, 101L, "RETAIL", "PL-001",
                new BigDecimal("500000"), null, 45, false);

        assertThat(result.getCurrentStage()).isEqualTo(2);
        assertThat(result.getPdUsed()).isEqualByComparingTo(new BigDecimal("0.15")); // lifetime PD
    }

    @Test
    @DisplayName("Stage 3: credit-impaired (DPD=95)")
    void stage3_CreditImpaired() {
        EclModelParameter param = EclModelParameter.builder()
                .segment("RETAIL").stage(3).macroScenario("BASE")
                .pd12Month(new BigDecimal("0.80")).pdLifetime(new BigDecimal("1.00"))
                .lgdRate(new BigDecimal("0.65")).eadCcf(BigDecimal.ONE)
                .scenarioWeight(new BigDecimal("0.50")).macroAdjustment(BigDecimal.ZERO).build();

        when(paramRepository.findActiveParams("RETAIL", 3, LocalDate.now())).thenReturn(List.of(param));
        when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(3L)).thenReturn(Optional.empty());
        when(calcRepository.save(any())).thenAnswer(inv -> { EclCalculation c = inv.getArgument(0); c.setId(3L); return c; });

        EclCalculation result = eclService.calculateEcl(3L, 102L, "RETAIL", "PL-001",
                new BigDecimal("200000"), null, 95, false);

        assertThat(result.getCurrentStage()).isEqualTo(3);
        assertThat(result.getStageReason()).contains("Credit-impaired");
    }

    @Test
    @DisplayName("ECL movement tracks delta from previous calculation")
    void eclMovement() {
        EclModelParameter param = EclModelParameter.builder()
                .segment("RETAIL").stage(1).macroScenario("BASE")
                .pd12Month(new BigDecimal("0.02")).lgdRate(new BigDecimal("0.45"))
                .scenarioWeight(new BigDecimal("0.50")).macroAdjustment(BigDecimal.ZERO).build();

        EclCalculation previous = EclCalculation.builder().eclWeighted(new BigDecimal("5000")).currentStage(1).build();

        when(paramRepository.findActiveParams("RETAIL", 1, LocalDate.now())).thenReturn(List.of(param));
        when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(4L)).thenReturn(Optional.of(previous));
        when(calcRepository.save(any())).thenAnswer(inv -> { EclCalculation c = inv.getArgument(0); c.setId(4L); return c; });

        EclCalculation result = eclService.calculateEcl(4L, 103L, "RETAIL", "PL-001",
                new BigDecimal("1000000"), null, 0, false);

        assertThat(result.getPreviousEcl()).isEqualByComparingTo(new BigDecimal("5000"));
        assertThat(result.getEclMovement()).isEqualByComparingTo(result.getEclWeighted().subtract(new BigDecimal("5000")));
    }
}
