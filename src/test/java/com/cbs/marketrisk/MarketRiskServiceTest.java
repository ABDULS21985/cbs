package com.cbs.marketrisk;

import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import com.cbs.marketrisk.service.MarketRiskService;
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
class MarketRiskServiceTest {

    @Mock private MarketRiskPositionRepository positionRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private MarketRiskService service;

    @Test @DisplayName("10-day VaR = 1-day VaR × sqrt(10)")
    void var10dScaling() {
        when(positionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        MarketRiskPosition pos = MarketRiskPosition.builder().positionDate(LocalDate.now())
                .riskType("INTEREST_RATE").portfolio("BANKING_BOOK")
                .var1d99(new BigDecimal("1000000")).varLimit(new BigDecimal("5000000")).build();
        MarketRiskPosition result = service.recordPosition(pos);
        // sqrt(10) ≈ 3.162
        assertThat(result.getVar10d99().doubleValue()).isCloseTo(3162277.66, org.assertj.core.data.Offset.offset(1.0));
        assertThat(result.getLimitBreach()).isFalse();
    }

    @Test @DisplayName("VaR exceeding limit triggers breach")
    void varBreach() {
        when(positionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        MarketRiskPosition pos = MarketRiskPosition.builder().positionDate(LocalDate.now())
                .riskType("FX").portfolio("TRADING_BOOK")
                .var1d99(new BigDecimal("6000000")).varLimit(new BigDecimal("5000000")).build();
        MarketRiskPosition result = service.recordPosition(pos);
        assertThat(result.getLimitBreach()).isTrue();
        assertThat(result.getVarUtilizationPct()).isGreaterThan(new BigDecimal("100"));
    }
}
