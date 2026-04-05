package com.cbs.traderposition;

import com.cbs.common.exception.BusinessException;
import com.cbs.traderposition.entity.TraderPosition;
import com.cbs.traderposition.entity.TraderPositionLimit;
import com.cbs.traderposition.repository.TraderPositionLimitRepository;
import com.cbs.traderposition.repository.TraderPositionRepository;
import com.cbs.traderposition.service.TraderPositionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TraderPositionServiceTest {

    @Mock
    private TraderPositionRepository positionRepository;

    @Mock
    private TraderPositionLimitRepository limitRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private TraderPositionService service;

    @Test
    @DisplayName("Net quantity = long - short; unrealizedPnl calculated correctly")
    void netQuantityAndUnrealizedPnl() {
        TraderPosition position = new TraderPosition();
        position.setDealerName("John Doe");
        position.setDeskId(1L);
        position.setInstrumentType("FX_SPOT");
        position.setInstrumentCode("EURUSD");
        position.setCurrency("USD");
        position.setPositionDate(LocalDate.now());
        position.setLongQuantity(new BigDecimal("1000000"));
        position.setShortQuantity(new BigDecimal("400000"));
        position.setAvgCostLong(new BigDecimal("1.10000000"));
        position.setAvgCostShort(new BigDecimal("1.12000000"));
        position.setMarketPrice(new BigDecimal("1.11000000"));

        when(positionRepository.save(any(TraderPosition.class))).thenAnswer(i -> i.getArgument(0));

        TraderPosition result = service.updatePosition("D001", position);

        assertThat(result.getNetQuantity()).isEqualByComparingTo(new BigDecimal("600000"));
        // unrealizedPnl = (1.11 - 1.10) * 1000000 + (1.12 - 1.11) * 400000 = 10000 + 4000 = 14000
        assertThat(result.getUnrealizedPnl()).isEqualByComparingTo(new BigDecimal("14000"));
    }

    @Test
    @DisplayName("Limit breach detected when |net value| > limit")
    void limitBreachDetected() {
        TraderPosition position = new TraderPosition();
        position.setDealerName("John Doe");
        position.setDeskId(1L);
        position.setInstrumentType("FX_SPOT");
        position.setInstrumentCode("EURUSD");
        position.setCurrency("USD");
        position.setPositionDate(LocalDate.now());
        position.setLongQuantity(new BigDecimal("5000000"));
        position.setShortQuantity(new BigDecimal("0"));
        position.setAvgCostLong(new BigDecimal("1.10000000"));
        position.setAvgCostShort(BigDecimal.ZERO);
        position.setMarketPrice(new BigDecimal("1.10000000"));
        position.setTraderPositionLimit(new BigDecimal("1000000"));

        when(positionRepository.save(any(TraderPosition.class))).thenAnswer(i -> i.getArgument(0));

        TraderPosition result = service.updatePosition("D001", position);

        assertThat(result.getLimitBreached()).isTrue();
        assertThat(result.getStatus()).isEqualTo("LIMIT_BREACH");
    }

    @Test
    @DisplayName("Pre-trade limit check throws BusinessException when breached")
    void preTradeLimitCheckThrowsWhenExceeded() {
        TraderPositionLimit limit = new TraderPositionLimit();
        limit.setDealerId("D001");
        limit.setLimitType("NET_POSITION");
        limit.setLimitAmount(new BigDecimal("1000000"));
        limit.setStatus("ACTIVE");

        when(limitRepository.findByDealerIdAndStatus("D001", "ACTIVE")).thenReturn(List.of(limit));

        assertThatThrownBy(() -> service.checkLimit("D001", new BigDecimal("2000000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds");
    }
}
