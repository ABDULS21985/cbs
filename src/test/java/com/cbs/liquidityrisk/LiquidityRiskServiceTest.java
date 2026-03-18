package com.cbs.liquidityrisk;

import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import com.cbs.liquidityrisk.service.LiquidityRiskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LiquidityRiskServiceTest {

    @Mock private LiquidityMetricRepository metricRepository;
    @InjectMocks private LiquidityRiskService service;

    @Test @DisplayName("LCR above 100% = no breach")
    void lcrNoBreach() {
        when(metricRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        LiquidityMetric m = LiquidityMetric.builder().metricDate(LocalDate.now())
                .hqlaLevel1(new BigDecimal("500000000"))
                .hqlaLevel2a(new BigDecimal("100000000"))
                .hqlaLevel2b(new BigDecimal("50000000"))
                .netCashOutflows30d(new BigDecimal("400000000"))
                .availableStableFunding(new BigDecimal("800000000"))
                .requiredStableFunding(new BigDecimal("700000000")).build();
        LiquidityMetric result = service.calculateMetrics(m);
        assertThat(result.getLcrRatio()).isGreaterThan(new BigDecimal("100"));
        assertThat(result.getLcrBreach()).isFalse();
        assertThat(result.getNsfrRatio()).isGreaterThan(new BigDecimal("100"));
    }

    @Test @DisplayName("Low HQLA triggers LCR breach")
    void lcrBreach() {
        when(metricRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        LiquidityMetric m = LiquidityMetric.builder().metricDate(LocalDate.now())
                .hqlaLevel1(new BigDecimal("200000000"))
                .hqlaLevel2a(new BigDecimal("20000000"))
                .hqlaLevel2b(new BigDecimal("10000000"))
                .netCashOutflows30d(new BigDecimal("400000000"))
                .availableStableFunding(BigDecimal.ZERO)
                .requiredStableFunding(BigDecimal.ZERO).build();
        LiquidityMetric result = service.calculateMetrics(m);
        assertThat(result.getLcrRatio()).isLessThan(new BigDecimal("100"));
        assertThat(result.getLcrBreach()).isTrue();
    }
}
