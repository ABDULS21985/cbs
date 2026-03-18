package com.cbs.dealerdesk;

import com.cbs.common.exception.BusinessException;
import com.cbs.dealerdesk.entity.DealingDesk;
import com.cbs.dealerdesk.entity.DeskDealer;
import com.cbs.dealerdesk.entity.DeskPnl;
import com.cbs.dealerdesk.repository.DealingDeskRepository;
import com.cbs.dealerdesk.repository.DeskDealerRepository;
import com.cbs.dealerdesk.repository.DeskPnlRepository;
import com.cbs.dealerdesk.service.DealerDeskService;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DealerDeskServiceTest {

    @Mock
    private DealingDeskRepository deskRepository;

    @Mock
    private DeskDealerRepository dealerRepository;

    @Mock
    private DeskPnlRepository pnlRepository;

    @InjectMocks
    private DealerDeskService service;

    @Test
    @DisplayName("PnL recording calculates totalPnl = realized + unrealized")
    void pnlRecordingCalculatesTotalPnl() {
        DealingDesk desk = new DealingDesk();
        desk.setId(1L);
        desk.setDeskCode("DSK-TEST");
        desk.setDailyVarLimit(new BigDecimal("1000000"));
        desk.setStopLossLimit(new BigDecimal("500000"));

        DeskPnl pnl = new DeskPnl();
        pnl.setPnlDate(LocalDate.now());
        pnl.setCurrency("USD");
        pnl.setRealizedPnl(new BigDecimal("150000"));
        pnl.setUnrealizedPnl(new BigDecimal("75000"));

        when(deskRepository.findById(1L)).thenReturn(Optional.of(desk));
        when(pnlRepository.save(any(DeskPnl.class))).thenAnswer(i -> i.getArgument(0));

        DeskPnl result = service.recordDailyPnl(1L, pnl);

        assertThat(result.getTotalPnl()).isEqualByComparingTo(new BigDecimal("225000"));
    }

    @Test
    @DisplayName("Stop-loss breach detected when |unrealizedPnl| > stopLossLimit")
    void stopLossBreachDetected() {
        DealingDesk desk = new DealingDesk();
        desk.setId(1L);
        desk.setDeskCode("DSK-TEST");
        desk.setDailyVarLimit(new BigDecimal("1000000"));
        desk.setStopLossLimit(new BigDecimal("500000"));

        DeskPnl pnl = new DeskPnl();
        pnl.setPnlDate(LocalDate.now());
        pnl.setCurrency("USD");
        pnl.setRealizedPnl(new BigDecimal("100000"));
        pnl.setUnrealizedPnl(new BigDecimal("-600000"));

        when(deskRepository.findById(1L)).thenReturn(Optional.of(desk));
        when(pnlRepository.save(any(DeskPnl.class))).thenAnswer(i -> i.getArgument(0));

        DeskPnl result = service.recordDailyPnl(1L, pnl);

        assertThat(result.getStopLossBreached()).isTrue();
    }

    @Test
    @DisplayName("Dealer authority check rejects over-limit trade")
    void dealerAuthorityRejectsOverLimit() {
        DeskDealer dealer = new DeskDealer();
        dealer.setId(1L);
        dealer.setStatus("ACTIVE");
        dealer.setSingleTradeLimit(new BigDecimal("1000000"));
        dealer.setAuthorizedInstruments(List.of("FX_SPOT", "FX_FORWARD"));

        when(dealerRepository.findById(1L)).thenReturn(Optional.of(dealer));

        assertThatThrownBy(() -> service.checkDealerAuthority(1L, new BigDecimal("2000000"), "FX_SPOT"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds");
    }
}
