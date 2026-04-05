package com.cbs.traderposition.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.traderposition.entity.TraderPosition;
import com.cbs.traderposition.entity.TraderPositionLimit;
import com.cbs.traderposition.repository.TraderPositionLimitRepository;
import com.cbs.traderposition.repository.TraderPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TraderPositionService {

    private final TraderPositionRepository positionRepository;
    private final TraderPositionLimitRepository limitRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TraderPosition updatePosition(String dealerId, TraderPosition position) {
        // Fix: aggregate with existing position for the same instrument/currency instead of always creating new
        Optional<TraderPosition> existingOpt = positionRepository.findByDealerIdAndInstrumentCodeAndCurrencyAndStatus(
                dealerId, position.getInstrumentCode(), position.getCurrency(), "OPEN");

        TraderPosition target;
        if (existingOpt.isPresent()) {
            target = existingOpt.get();
            // Aggregate quantities
            BigDecimal incomingLong = position.getLongQuantity() != null ? position.getLongQuantity() : BigDecimal.ZERO;
            BigDecimal incomingShort = position.getShortQuantity() != null ? position.getShortQuantity() : BigDecimal.ZERO;
            BigDecimal existingLong = target.getLongQuantity() != null ? target.getLongQuantity() : BigDecimal.ZERO;
            BigDecimal existingShort = target.getShortQuantity() != null ? target.getShortQuantity() : BigDecimal.ZERO;
            target.setLongQuantity(existingLong.add(incomingLong));
            target.setShortQuantity(existingShort.add(incomingShort));
            // Update market price and avg cost if provided
            if (position.getMarketPrice() != null) target.setMarketPrice(position.getMarketPrice());
            if (position.getAvgCostLong() != null) target.setAvgCostLong(position.getAvgCostLong());
            if (position.getAvgCostShort() != null) target.setAvgCostShort(position.getAvgCostShort());
        } else {
            target = position;
            target.setPositionRef("TP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
            target.setDealerId(dealerId);
            target.setStatus("OPEN");
        }

        BigDecimal longQty = target.getLongQuantity() != null ? target.getLongQuantity() : BigDecimal.ZERO;
        BigDecimal shortQty = target.getShortQuantity() != null ? target.getShortQuantity() : BigDecimal.ZERO;
        target.setNetQuantity(longQty.subtract(shortQty));

        BigDecimal marketPrice = target.getMarketPrice() != null ? target.getMarketPrice() : BigDecimal.ZERO;
        BigDecimal avgCostLong = target.getAvgCostLong() != null ? target.getAvgCostLong() : BigDecimal.ZERO;
        BigDecimal avgCostShort = target.getAvgCostShort() != null ? target.getAvgCostShort() : BigDecimal.ZERO;

        BigDecimal unrealizedPnl = marketPrice.subtract(avgCostLong).multiply(longQty)
                .add(avgCostShort.subtract(marketPrice).multiply(shortQty));
        target.setUnrealizedPnl(unrealizedPnl);
        target.setLastTradeAt(Instant.now());

        BigDecimal netValue = target.getNetQuantity().multiply(marketPrice).abs();
        if (target.getTraderPositionLimit() != null && target.getTraderPositionLimit().compareTo(BigDecimal.ZERO) > 0) {
            target.setLimitUtilizationPct(netValue.divide(target.getTraderPositionLimit(), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
            target.setLimitBreached(netValue.compareTo(target.getTraderPositionLimit()) > 0);
            if (Boolean.TRUE.equals(target.getLimitBreached())) {
                target.setStatus("LIMIT_BREACH");
            }
        }

        TraderPosition saved = positionRepository.save(target);
        log.info("AUDIT: Position updated: ref={}, dealer={}, net={}, pnl={}, actor={}",
                saved.getPositionRef(), dealerId, saved.getNetQuantity(), saved.getUnrealizedPnl(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TraderPosition closePosition(String positionRef) {
        TraderPosition position = positionRepository.findByPositionRef(positionRef)
                .orElseThrow(() -> new ResourceNotFoundException("TraderPosition", "positionRef", positionRef));
        if (!"OPEN".equals(position.getStatus()) && !"LIMIT_BREACH".equals(position.getStatus())) {
            throw new BusinessException("Position must be OPEN or LIMIT_BREACH to close; current: " + position.getStatus(),
                    "INVALID_POSITION_STATUS");
        }
        // Realize PnL
        position.setRealizedPnlToday(position.getUnrealizedPnl());
        position.setUnrealizedPnl(BigDecimal.ZERO);
        position.setLongQuantity(BigDecimal.ZERO);
        position.setShortQuantity(BigDecimal.ZERO);
        position.setNetQuantity(BigDecimal.ZERO);
        position.setStatus("CLOSED");
        position.setLastTradeAt(Instant.now());

        TraderPosition saved = positionRepository.save(position);
        log.info("AUDIT: Position closed: ref={}, realizedPnl={}, actor={}",
                positionRef, saved.getRealizedPnlToday(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TraderPositionLimit setLimit(String dealerId, TraderPositionLimit limit) {
        limit.setDealerId(dealerId);
        limit.setStatus("ACTIVE");
        TraderPositionLimit saved = limitRepository.save(limit);
        log.info("AUDIT: Limit set for dealer {}: type={}, amount={}, actor={}",
                dealerId, saved.getLimitType(), saved.getLimitAmount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public void checkLimit(String dealerId, BigDecimal proposedAmount) {
        List<TraderPositionLimit> limits = limitRepository.findByDealerIdAndStatus(dealerId, "ACTIVE");
        for (TraderPositionLimit limit : limits) {
            if (proposedAmount.compareTo(limit.getLimitAmount()) > 0) {
                // Fix: actually set the limit to BREACHED status
                limit.setStatus("BREACHED");
                limit.setLastBreachDate(java.time.LocalDate.now());
                limit.setBreachCount((limit.getBreachCount() != null ? limit.getBreachCount() : 0) + 1);
                limitRepository.save(limit);
                log.info("AUDIT: Limit breached: dealer={}, type={}, proposed={}, limit={}, actor={}",
                        dealerId, limit.getLimitType(), proposedAmount, limit.getLimitAmount(),
                        currentActorProvider.getCurrentActor());
                throw new BusinessException("Proposed amount " + proposedAmount + " exceeds limit " + limit.getLimitAmount()
                        + " (" + limit.getLimitType() + ")", "LIMIT_BREACHED");
            }
        }
    }

    public List<TraderPosition> getTraderPositions(String dealerId) {
        return positionRepository.findByDealerIdAndStatus(dealerId, "OPEN");
    }

    public List<TraderPositionLimit> getLimitBreaches(LocalDate from, LocalDate to) {
        return limitRepository.findBreachedLimitsInRange(from, to);
    }

    public List<TraderPosition> getOvernightPositions(Long deskId) {
        return positionRepository.findLatestByDeskId(deskId);
    }

    public List<TraderPosition> getAllPositions() { return positionRepository.findAll(); }
    public List<TraderPositionLimit> getAllLimits() { return limitRepository.findAll(); }
}
