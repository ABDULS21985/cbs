package com.cbs.traderposition.service;

import com.cbs.common.exception.BusinessException;
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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TraderPositionService {

    private final TraderPositionRepository positionRepository;
    private final TraderPositionLimitRepository limitRepository;

    @Transactional
    public TraderPosition updatePosition(String dealerId, TraderPosition position) {
        position.setPositionRef("TP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        position.setDealerId(dealerId);
        position.setStatus("OPEN");

        BigDecimal longQty = position.getLongQuantity() != null ? position.getLongQuantity() : BigDecimal.ZERO;
        BigDecimal shortQty = position.getShortQuantity() != null ? position.getShortQuantity() : BigDecimal.ZERO;
        position.setNetQuantity(longQty.subtract(shortQty));

        BigDecimal marketPrice = position.getMarketPrice() != null ? position.getMarketPrice() : BigDecimal.ZERO;
        BigDecimal avgCostLong = position.getAvgCostLong() != null ? position.getAvgCostLong() : BigDecimal.ZERO;
        BigDecimal avgCostShort = position.getAvgCostShort() != null ? position.getAvgCostShort() : BigDecimal.ZERO;

        BigDecimal unrealizedPnl = marketPrice.subtract(avgCostLong).multiply(longQty)
                .add(avgCostShort.subtract(marketPrice).multiply(shortQty));
        position.setUnrealizedPnl(unrealizedPnl);

        BigDecimal netValue = position.getNetQuantity().multiply(marketPrice).abs();
        if (position.getTraderPositionLimit() != null && position.getTraderPositionLimit().compareTo(BigDecimal.ZERO) > 0) {
            position.setLimitUtilizationPct(netValue.divide(position.getTraderPositionLimit(), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
            position.setLimitBreached(netValue.compareTo(position.getTraderPositionLimit()) > 0);
            if (Boolean.TRUE.equals(position.getLimitBreached())) {
                position.setStatus("LIMIT_BREACH");
            }
        }

        TraderPosition saved = positionRepository.save(position);
        log.info("Position updated: ref={}, dealer={}, net={}, pnl={}", saved.getPositionRef(), dealerId, saved.getNetQuantity(), saved.getUnrealizedPnl());
        return saved;
    }

    @Transactional
    public TraderPositionLimit setLimit(String dealerId, TraderPositionLimit limit) {
        limit.setDealerId(dealerId);
        limit.setStatus("ACTIVE");
        TraderPositionLimit saved = limitRepository.save(limit);
        log.info("Limit set for dealer {}: type={}, amount={}", dealerId, saved.getLimitType(), saved.getLimitAmount());
        return saved;
    }

    public void checkLimit(String dealerId, BigDecimal proposedAmount) {
        List<TraderPositionLimit> limits = limitRepository.findByDealerIdAndStatus(dealerId, "ACTIVE");
        for (TraderPositionLimit limit : limits) {
            if ("BREACHED".equals(limit.getStatus())) {
                throw new BusinessException("Dealer limit is breached: " + limit.getLimitType());
            }
            if (proposedAmount.compareTo(limit.getLimitAmount()) > 0) {
                throw new BusinessException("Proposed amount exceeds limit: " + limit.getLimitType());
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
}
