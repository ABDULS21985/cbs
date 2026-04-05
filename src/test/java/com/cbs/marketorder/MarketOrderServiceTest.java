package com.cbs.marketorder;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import com.cbs.marketorder.service.MarketOrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketOrderServiceTest {

    @Mock
    private MarketOrderRepository repository;
    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private MarketOrderService service;

    @Test
    @DisplayName("Submit sets remainingQuantity equal to quantity")
    void submitSetsRemainingQuantity() {
        MarketOrder order = new MarketOrder();
        order.setOrderSource("CLIENT");
        order.setOrderType("MARKET");
        order.setSide("BUY");
        order.setInstrumentType("EQUITY");
        order.setInstrumentCode("DANGCEM");
        order.setCurrency("NGN");
        order.setQuantity(new BigDecimal("1000"));

        when(repository.save(any(MarketOrder.class))).thenAnswer(i -> i.getArgument(0));

        MarketOrder result = service.submitOrder(order);

        assertThat(result.getOrderRef()).startsWith("MO-");
        assertThat(result.getRemainingQuantity()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(result.getStatus()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("Cancel rejects already-FILLED order")
    void cancelRejectsFilledOrder() {
        MarketOrder order = new MarketOrder();
        order.setId(1L);
        order.setOrderRef("MO-TEST00001");
        order.setStatus("FILLED");

        when(repository.findByOrderRef("MO-TEST00001")).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancelOrder("MO-TEST00001", "Client request"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already FILLED");
    }
}
