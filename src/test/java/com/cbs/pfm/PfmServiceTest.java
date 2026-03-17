package com.cbs.pfm;

import com.cbs.pfm.entity.*;
import com.cbs.pfm.repository.*;
import com.cbs.pfm.service.PfmService;
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

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PfmServiceTest {

    @Mock private PfmSpendingCategoryRepository categoryRepository;
    @Mock private PfmBudgetRepository budgetRepository;
    @Mock private PfmFinancialHealthRepository healthRepository;
    @InjectMocks private PfmService pfmService;

    @Test @DisplayName("Budget utilization calculated correctly")
    void budgetUtilization() {
        PfmBudget budget = PfmBudget.builder().customerId(1L).categoryId(1L)
                .budgetMonth(LocalDate.of(2026, 3, 1))
                .budgetAmount(new BigDecimal("50000")).spentAmount(new BigDecimal("42000"))
                .alertThresholdPct(80).alertSent(false).build();

        assertThat(budget.getUtilizationPct()).isGreaterThan(new BigDecimal("80"));
        // 42000/50000 = 84%
        assertThat(budget.getUtilizationPct().intValue()).isEqualTo(84);
    }

    @Test @DisplayName("Financial health score reflects savings and debt ratios")
    void healthScoring() {
        when(healthRepository.save(any())).thenAnswer(inv -> { PfmFinancialHealth h = inv.getArgument(0); h.setId(1L); return h; });

        PfmFinancialHealth health = pfmService.assessFinancialHealth(1L,
                new BigDecimal("20"), // savings ratio 20%
                new BigDecimal("35"), // debt-to-income 35%
                new BigDecimal("3.0"), // 3 months emergency fund
                new BigDecimal("40"), // 40% credit utilization
                new BigDecimal("95"), // 95% payment consistency
                new BigDecimal("85")); // 85% income stability

        assertThat(health.getOverallScore()).isBetween(50, 90);
        assertThat(health.getRiskLevel()).isIn("LOW", "MEDIUM");
    }

    @Test @DisplayName("High debt-to-income produces lower health score")
    void highDebtLowerScore() {
        when(healthRepository.save(any())).thenAnswer(inv -> { PfmFinancialHealth h = inv.getArgument(0); h.setId(1L); return h; });

        PfmFinancialHealth healthy = pfmService.assessFinancialHealth(1L,
                new BigDecimal("25"), new BigDecimal("20"), new BigDecimal("6"),
                new BigDecimal("20"), new BigDecimal("98"), new BigDecimal("90"));

        PfmFinancialHealth stressed = pfmService.assessFinancialHealth(2L,
                new BigDecimal("5"), new BigDecimal("60"), new BigDecimal("0.5"),
                new BigDecimal("85"), new BigDecimal("70"), new BigDecimal("50"));

        assertThat(healthy.getOverallScore()).isGreaterThan(stressed.getOverallScore());
    }
}
