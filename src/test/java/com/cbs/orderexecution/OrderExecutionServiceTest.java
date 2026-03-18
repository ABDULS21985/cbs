package com.cbs.orderexecution;

import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import com.cbs.orderexecution.entity.ExecutionQuality;
import com.cbs.orderexecution.entity.OrderExecution;
import com.cbs.orderexecution.repository.ExecutionQualityRepository;
import com.cbs.orderexecution.repository.OrderExecutionRepository;
import com.cbs.orderexecution.service.OrderExecutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderExecutionServiceTest {

    @Mock
    private OrderExecutionRepository executionRepository;

    @Mock
    private ExecutionQualityRepository qualityRepository;

    @Mock
    private MarketOrderRepository orderRepository;

    @InjectMocks
    private OrderExecutionService service;

    @Test
    @DisplayName("Execution updates parent order filled quantities and status")
    void executionUpdatesParentOrder() {
        MarketOrder order = new MarketOrder();
        order.setId(1L);
        order.setOrderRef("MO-TEST00001");
        order.setQuantity(new BigDecimal("1000"));
        order.setFilledQuantity(new BigDecimal("400"));
        order.setFilledAmount(new BigDecimal("40000"));
        order.setRemainingQuantity(new BigDecimal("600"));
        order.setStatus("PARTIALLY_FILLED");

        OrderExecution execution = new OrderExecution();
        execution.setOrderId(1L);
        execution.setExecutionType("PARTIAL_FILL");
        execution.setExecutionVenue("NGX");
        execution.setExecutionPrice(new BigDecimal("105.00"));
        execution.setExecutionQuantity(new BigDecimal("600"));
        execution.setExecutionAmount(new BigDecimal("63000"));
        execution.setCurrency("NGN");
        execution.setTradeDate(LocalDate.now());
        execution.setSettlementDate(LocalDate.now().plusDays(2));
        execution.setExecutedAt(Instant.now());

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(MarketOrder.class))).thenAnswer(i -> i.getArgument(0));
        when(executionRepository.save(any(OrderExecution.class))).thenAnswer(i -> i.getArgument(0));

        OrderExecution result = service.recordExecution(execution);

        assertThat(result.getExecutionRef()).startsWith("EX-");
        assertThat(order.getFilledQuantity()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(order.getFilledAmount()).isEqualByComparingTo(new BigDecimal("103000"));
        assertThat(order.getRemainingQuantity()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(order.getStatus()).isEqualTo("FILLED");
    }

    @Test
    @DisplayName("Slippage calculation: (avgExecPrice - benchmarkPrice) / benchmarkPrice × 10000")
    void slippageCalculationCorrect() {
        MarketOrder order = new MarketOrder();
        order.setId(1L);
        order.setFilledAmount(new BigDecimal("100000"));

        ExecutionQuality quality = new ExecutionQuality();
        quality.setOrderId(1L);
        quality.setBenchmarkType("ARRIVAL_PRICE");
        quality.setBenchmarkPrice(new BigDecimal("100.00"));
        quality.setAvgExecutionPrice(new BigDecimal("100.50"));
        quality.setAnalysisDate(LocalDate.now());

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(qualityRepository.save(any(ExecutionQuality.class))).thenAnswer(i -> i.getArgument(0));

        ExecutionQuality result = service.analyzeExecutionQuality(quality);

        // (100.50 - 100.00) / 100.00 × 10000 = 50.00 bps
        assertThat(result.getSlippageBps()).isEqualByComparingTo(new BigDecimal("50.00"));
        // implShortfall = 50.00 × 100000 / 10000 = 500.0000
        assertThat(result.getImplementationShortfall()).isEqualByComparingTo(new BigDecimal("500.0000"));
    }
}
