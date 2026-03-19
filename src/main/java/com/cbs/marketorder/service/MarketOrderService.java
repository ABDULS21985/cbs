package com.cbs.marketorder.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketOrderService {

    private final MarketOrderRepository repository;

    @Transactional
    public MarketOrder submitOrder(MarketOrder order) {
        order.setOrderRef("MO-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        order.setRemainingQuantity(order.getQuantity());
        order.setStatus("NEW");
        return repository.save(order);
    }

    @Transactional
    public MarketOrder validateOrder(String orderRef) {
        MarketOrder order = getByRef(orderRef);
        // Basic validation — in production this would check limits, suitability etc.
        order.setStatus("VALIDATED");
        return repository.save(order);
    }

    @Transactional
    public MarketOrder routeOrder(String orderRef, String destination) {
        MarketOrder order = getByRef(orderRef);
        order.setRoutedTo(destination);
        order.setRoutedAt(Instant.now());
        order.setStatus("ROUTED");
        return repository.save(order);
    }

    @Transactional
    public MarketOrder cancelOrder(String orderRef, String reason) {
        MarketOrder order = getByRef(orderRef);
        if ("FILLED".equals(order.getStatus())) {
            throw new BusinessException("Order " + orderRef + " is already FILLED and cannot be cancelled");
        }
        order.setStatus("CANCELLED");
        order.setCancelledReason(reason);
        return repository.save(order);
    }

    public MarketOrder getOrderStatus(String orderRef) {
        return getByRef(orderRef);
    }

    public List<MarketOrder> getOpenOrders() {
        return repository.findByStatusInOrderByCreatedAtDesc(List.of("NEW", "VALIDATED", "ROUTED", "PARTIALLY_FILLED"));
    }

    public List<MarketOrder> getOrdersByCustomer(Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<MarketOrder> getOrdersByDesk(Long deskId) {
        return repository.findByDeskIdOrderByCreatedAtDesc(deskId);
    }

    private MarketOrder getByRef(String ref) {
        return repository.findByOrderRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("MarketOrder", "orderRef", ref));
    }

    public java.util.List<MarketOrder> getAllOrders() {
        return orderRepository.findAll();
    }

}
