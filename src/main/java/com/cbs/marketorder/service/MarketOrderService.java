package com.cbs.marketorder.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.repository.MarketOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketOrderService {

    private static final Set<String> SUPPORTED_ORDER_TYPES = Set.of("MARKET", "LIMIT", "STOP", "STOP_LIMIT");
    private static final BigDecimal DAILY_TRADING_LIMIT = new BigDecimal("1000000");

    private final MarketOrderRepository repository;
    private final AccountRepository accountRepository;

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
        Map<String, Object> errors = new LinkedHashMap<>();

        // 1. Validate order type is supported
        if (order.getOrderType() == null || !SUPPORTED_ORDER_TYPES.contains(order.getOrderType().toUpperCase())) {
            errors.put("orderType", "Unsupported order type: " + order.getOrderType()
                    + ". Supported types: " + SUPPORTED_ORDER_TYPES);
        }

        // 2. Check quantity > 0
        if (order.getQuantity() == null || order.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            errors.put("quantity", "Order quantity must be greater than zero");
        }

        // 3. Check price > 0 for limit/stop-limit orders
        if (order.getOrderType() != null
                && ("LIMIT".equalsIgnoreCase(order.getOrderType()) || "STOP_LIMIT".equalsIgnoreCase(order.getOrderType()))) {
            if (order.getLimitPrice() == null || order.getLimitPrice().compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("limitPrice", "Limit price must be greater than zero for " + order.getOrderType() + " orders");
            }
        }

        // 4. Check stop price for stop/stop-limit orders
        if (order.getOrderType() != null
                && ("STOP".equalsIgnoreCase(order.getOrderType()) || "STOP_LIMIT".equalsIgnoreCase(order.getOrderType()))) {
            if (order.getStopPrice() == null || order.getStopPrice().compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("stopPrice", "Stop price must be greater than zero for " + order.getOrderType() + " orders");
            }
        }

        // 5. For BUY orders, check customer has sufficient balance/margin
        if ("BUY".equalsIgnoreCase(order.getSide()) && order.getCustomerId() != null) {
            BigDecimal estimatedCost = order.getQuantity() != null
                    ? order.getQuantity().multiply(
                        order.getLimitPrice() != null ? order.getLimitPrice() : BigDecimal.ZERO)
                    : BigDecimal.ZERO;
            BigDecimal availableBalance = accountRepository.sumAvailableBalanceByCustomerId(order.getCustomerId());
            if (availableBalance == null || availableBalance.compareTo(estimatedCost) < 0) {
                errors.put("balance", "Insufficient balance for buy order. Required: " + estimatedCost
                        + ", available: " + (availableBalance != null ? availableBalance : BigDecimal.ZERO));
            }
        }

        // 6. For SELL orders, check customer holds sufficient securities
        if ("SELL".equalsIgnoreCase(order.getSide()) && order.getCustomerId() != null) {
            BigDecimal heldQuantity = getHeldSecuritiesQuantity(order.getCustomerId(), order.getInstrumentCode());
            if (heldQuantity.compareTo(order.getQuantity() != null ? order.getQuantity() : BigDecimal.ZERO) < 0) {
                errors.put("holdings", "Insufficient securities holdings for sell order. Required: "
                        + order.getQuantity() + ", held: " + heldQuantity);
            }
        }

        // 7. Check daily trading limits
        if (order.getCustomerId() != null) {
            BigDecimal todayVolume = calculateDailyTradingVolume(order.getCustomerId());
            BigDecimal orderValue = order.getQuantity() != null
                    ? order.getQuantity().multiply(
                        order.getLimitPrice() != null ? order.getLimitPrice() : BigDecimal.ZERO)
                    : BigDecimal.ZERO;
            if (todayVolume.add(orderValue).compareTo(DAILY_TRADING_LIMIT) > 0) {
                errors.put("dailyLimit", "Daily trading limit would be exceeded. Limit: " + DAILY_TRADING_LIMIT
                        + ", today's volume: " + todayVolume + ", this order: " + orderValue);
            }
        }

        if (!errors.isEmpty()) {
            order.setValidationErrors(errors);
            order.setStatus("REJECTED");
            log.warn("Order validation failed: orderRef={}, errors={}", orderRef, errors);
            return repository.save(order);
        }

        order.setValidationErrors(null);
        order.setStatus("VALIDATED");
        log.info("Order validated: orderRef={}, side={}, qty={}, type={}",
                orderRef, order.getSide(), order.getQuantity(), order.getOrderType());
        return repository.save(order);
    }

    private BigDecimal getHeldSecuritiesQuantity(Long customerId, String instrumentCode) {
        // Calculate net held quantity from filled buy orders minus filled sell orders for this instrument
        List<MarketOrder> filledOrders = repository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .filter(o -> instrumentCode.equals(o.getInstrumentCode()))
                .filter(o -> "FILLED".equals(o.getStatus()) || "PARTIALLY_FILLED".equals(o.getStatus()))
                .toList();

        BigDecimal netQuantity = BigDecimal.ZERO;
        for (MarketOrder o : filledOrders) {
            BigDecimal filled = o.getFilledQuantity() != null ? o.getFilledQuantity() : BigDecimal.ZERO;
            if ("BUY".equalsIgnoreCase(o.getSide())) {
                netQuantity = netQuantity.add(filled);
            } else if ("SELL".equalsIgnoreCase(o.getSide())) {
                netQuantity = netQuantity.subtract(filled);
            }
        }
        return netQuantity.max(BigDecimal.ZERO);
    }

    private BigDecimal calculateDailyTradingVolume(Long customerId) {
        LocalDate today = LocalDate.now();
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .filter(o -> o.getCreatedAt() != null
                        && o.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate().equals(today))
                .filter(o -> !"CANCELLED".equals(o.getStatus()) && !"REJECTED".equals(o.getStatus()))
                .map(o -> {
                    BigDecimal qty = o.getQuantity() != null ? o.getQuantity() : BigDecimal.ZERO;
                    BigDecimal price = o.getLimitPrice() != null ? o.getLimitPrice() : BigDecimal.ZERO;
                    return qty.multiply(price);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
        return repository.findAll();
    }

}
