package com.cbs.orderexecution.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import com.cbs.orderexecution.entity.ExecutionQuality;
import com.cbs.orderexecution.entity.OrderExecution;
import com.cbs.orderexecution.repository.ExecutionQualityRepository;
import com.cbs.orderexecution.repository.OrderExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrderExecutionService {

    private final OrderExecutionRepository executionRepository;
    private final ExecutionQualityRepository qualityRepository;
    private final MarketOrderRepository orderRepository;

    @Transactional
    public OrderExecution recordExecution(OrderExecution execution) {
        execution.setExecutionRef("EX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Update parent order
        MarketOrder order = orderRepository.findById(execution.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("MarketOrder", "id", execution.getOrderId()));

        BigDecimal newFilledQty = order.getFilledQuantity().add(execution.getExecutionQuantity());
        BigDecimal newFilledAmt = order.getFilledAmount().add(execution.getExecutionAmount());
        order.setFilledQuantity(newFilledQty);
        order.setFilledAmount(newFilledAmt);

        // Recalc avg filled price
        if (newFilledQty.compareTo(BigDecimal.ZERO) > 0) {
            order.setAvgFilledPrice(newFilledAmt.divide(newFilledQty, 8, RoundingMode.HALF_UP));
        }

        order.setRemainingQuantity(order.getQuantity().subtract(newFilledQty));

        if (newFilledQty.compareTo(order.getQuantity()) >= 0) {
            order.setStatus("FILLED");
            order.setFilledAt(Instant.now());
        } else {
            order.setStatus("PARTIALLY_FILLED");
        }

        orderRepository.save(order);
        return executionRepository.save(execution);
    }

    @Transactional
    public OrderExecution bustExecution(String executionRef) {
        OrderExecution execution = executionRepository.findByExecutionRef(executionRef)
                .orElseThrow(() -> new ResourceNotFoundException("OrderExecution", "executionRef", executionRef));
        execution.setStatus("BUSTED");
        return executionRepository.save(execution);
    }

    @Transactional
    public ExecutionQuality analyzeExecutionQuality(ExecutionQuality quality) {
        // Calc slippageBps = (avgExecPrice - benchmarkPrice) / benchmarkPrice x 10000
        if (quality.getBenchmarkPrice() != null && quality.getBenchmarkPrice().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal slippage = quality.getAvgExecutionPrice().subtract(quality.getBenchmarkPrice())
                    .divide(quality.getBenchmarkPrice(), 8, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("10000"))
                    .setScale(2, RoundingMode.HALF_UP);
            quality.setSlippageBps(slippage);

            // implementationShortfall = slippageBps x totalAmount / 10000
            MarketOrder order = orderRepository.findById(quality.getOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("MarketOrder", "id", quality.getOrderId()));
            if (order.getFilledAmount() != null && order.getFilledAmount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal implShortfall = slippage.multiply(order.getFilledAmount())
                        .divide(new BigDecimal("10000"), 4, RoundingMode.HALF_UP);
                quality.setImplementationShortfall(implShortfall);
            }
        }

        return qualityRepository.save(quality);
    }

    public List<OrderExecution> getExecutionsByOrder(Long orderId) {
        return executionRepository.findByOrderIdOrderByExecutedAtDesc(orderId);
    }

    public List<ExecutionQuality> getBestExecutionReport(Long orderId) {
        return qualityRepository.findByOrderIdOrderByAnalysisDateDesc(orderId);
    }

    public List<ExecutionQuality> getAllQualityReports() { return qualityRepository.findAll(); }
}
