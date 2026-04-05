package com.cbs.positionmgmt.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.positionmgmt.entity.FinancialPosition;
import com.cbs.positionmgmt.repository.FinancialPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FinancialPositionService {

    private final FinancialPositionRepository repository;
    private final CurrentActorProvider currentActorProvider;

    // ── Record Position ─────────────────────────────────────────────────────

    @Transactional
    public FinancialPosition record(FinancialPosition pos) {
        // Validation
        if (!StringUtils.hasText(pos.getPositionType())) {
            throw new BusinessException("Position type is required", "MISSING_POSITION_TYPE");
        }
        if (!StringUtils.hasText(pos.getPositionCategory())) {
            throw new BusinessException("Position category is required", "MISSING_POSITION_CATEGORY");
        }
        if (!StringUtils.hasText(pos.getIdentifier())) {
            throw new BusinessException("Identifier is required", "MISSING_IDENTIFIER");
        }
        if (pos.getPositionDate() == null) {
            throw new BusinessException("Position date is required", "MISSING_POSITION_DATE");
        }

        // Null-safe handling
        BigDecimal longPos = pos.getLongPosition() != null ? pos.getLongPosition() : BigDecimal.ZERO;
        BigDecimal shortPos = pos.getShortPosition() != null ? pos.getShortPosition() : BigDecimal.ZERO;
        pos.setLongPosition(longPos);
        pos.setShortPosition(shortPos);

        if (longPos.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Long position cannot be negative", "NEGATIVE_LONG_POSITION");
        }
        if (shortPos.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Short position cannot be negative", "NEGATIVE_SHORT_POSITION");
        }

        // Idempotency: check if a position for same identifier+type+date already exists
        List<FinancialPosition> existing = repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc(
                pos.getPositionType(), pos.getPositionDate());
        boolean duplicate = existing.stream()
                .anyMatch(e -> e.getIdentifier().equals(pos.getIdentifier())
                        && e.getPositionCategory().equals(pos.getPositionCategory()));
        if (duplicate) {
            throw new BusinessException(
                    String.format("Position already recorded for %s/%s/%s on %s",
                            pos.getPositionType(), pos.getPositionCategory(), pos.getIdentifier(), pos.getPositionDate()),
                    "DUPLICATE_POSITION");
        }

        pos.setPositionCode("FP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        pos.setNetPosition(longPos.subtract(shortPos));

        // Limit utilization calculation
        calculateLimitUtilization(pos);

        // P&L calculation
        calculateUnrealizedPnl(pos);

        FinancialPosition saved = repository.save(pos);
        log.info("Position recorded: code={}, type={}, identifier={}, net={}, limitBreach={}, actor={}",
                saved.getPositionCode(), saved.getPositionType(), saved.getIdentifier(),
                saved.getNetPosition(), saved.getLimitBreach(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Update Position ─────────────────────────────────────────────────────

    @Transactional
    public FinancialPosition updatePosition(String positionCode, BigDecimal newLong, BigDecimal newShort) {
        FinancialPosition pos = getByCode(positionCode);

        if (newLong != null) {
            if (newLong.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Long position cannot be negative", "NEGATIVE_LONG_POSITION");
            }
            pos.setLongPosition(newLong);
        }
        if (newShort != null) {
            if (newShort.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Short position cannot be negative", "NEGATIVE_SHORT_POSITION");
            }
            pos.setShortPosition(newShort);
        }

        pos.setNetPosition(pos.getLongPosition().subtract(pos.getShortPosition()));
        calculateLimitUtilization(pos);
        calculateUnrealizedPnl(pos);

        FinancialPosition saved = repository.save(pos);
        log.info("Position updated: code={}, net={}, limitBreach={}, actor={}",
                positionCode, saved.getNetPosition(), saved.getLimitBreach(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Close Position ──────────────────────────────────────────────────────

    @Transactional
    public FinancialPosition closePosition(String positionCode) {
        FinancialPosition pos = getByCode(positionCode);
        pos.setLongPosition(BigDecimal.ZERO);
        pos.setShortPosition(BigDecimal.ZERO);
        pos.setNetPosition(BigDecimal.ZERO);
        pos.setLimitUtilizationPct(BigDecimal.ZERO);
        pos.setLimitBreach(false);

        // Realize P&L: unrealized becomes zero on close
        BigDecimal realizedPnl = pos.getUnrealizedPnl() != null ? pos.getUnrealizedPnl() : BigDecimal.ZERO;
        pos.setUnrealizedPnl(BigDecimal.ZERO);

        FinancialPosition saved = repository.save(pos);
        log.info("Position closed: code={}, realizedPnl={}, actor={}",
                positionCode, realizedPnl, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Mark to Market ──────────────────────────────────────────────────────

    @Transactional
    public FinancialPosition markToMarket(String positionCode, BigDecimal marketPrice) {
        if (marketPrice == null || marketPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Market price must be non-negative", "INVALID_MARKET_PRICE");
        }
        FinancialPosition pos = getByCode(positionCode);
        pos.setMarkToMarket(marketPrice);
        calculateUnrealizedPnl(pos);

        FinancialPosition saved = repository.save(pos);
        log.info("Position marked to market: code={}, mtm={}, unrealizedPnl={}, actor={}",
                positionCode, marketPrice, saved.getUnrealizedPnl(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Aggregation ─────────────────────────────────────────────────────────

    public Map<String, Object> aggregateByInstrument(LocalDate date) {
        List<FinancialPosition> allPositions = new ArrayList<>();
        // Fetch all position types for the date
        for (String type : List.of("FX", "EQUITY", "FIXED_INCOME", "COMMODITY", "DERIVATIVE")) {
            allPositions.addAll(repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc(type, date));
        }

        Map<String, List<FinancialPosition>> byIdentifier = allPositions.stream()
                .collect(Collectors.groupingBy(FinancialPosition::getIdentifier));

        List<Map<String, Object>> aggregated = new ArrayList<>();
        for (Map.Entry<String, List<FinancialPosition>> entry : byIdentifier.entrySet()) {
            BigDecimal totalNet = entry.getValue().stream()
                    .map(FinancialPosition::getNetPosition)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPnl = entry.getValue().stream()
                    .map(p -> p.getUnrealizedPnl() != null ? p.getUnrealizedPnl() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> agg = new LinkedHashMap<>();
            agg.put("identifier", entry.getKey());
            agg.put("positionCount", entry.getValue().size());
            agg.put("totalNetPosition", totalNet);
            agg.put("totalUnrealizedPnl", totalPnl);
            aggregated.add(agg);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date.toString());
        result.put("instrumentCount", aggregated.size());
        result.put("instruments", aggregated);
        return result;
    }

    public Map<String, Object> aggregateByPortfolio(LocalDate date) {
        List<FinancialPosition> allPositions = new ArrayList<>();
        for (String type : List.of("FX", "EQUITY", "FIXED_INCOME", "COMMODITY", "DERIVATIVE")) {
            allPositions.addAll(repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc(type, date));
        }

        Map<String, List<FinancialPosition>> byCategory = allPositions.stream()
                .collect(Collectors.groupingBy(FinancialPosition::getPositionCategory));

        List<Map<String, Object>> aggregated = new ArrayList<>();
        for (Map.Entry<String, List<FinancialPosition>> entry : byCategory.entrySet()) {
            BigDecimal totalNet = entry.getValue().stream()
                    .map(FinancialPosition::getNetPosition)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPnl = entry.getValue().stream()
                    .map(p -> p.getUnrealizedPnl() != null ? p.getUnrealizedPnl() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            boolean anyBreach = entry.getValue().stream().anyMatch(p -> Boolean.TRUE.equals(p.getLimitBreach()));

            Map<String, Object> agg = new LinkedHashMap<>();
            agg.put("portfolio", entry.getKey());
            agg.put("positionCount", entry.getValue().size());
            agg.put("totalNetPosition", totalNet);
            agg.put("totalUnrealizedPnl", totalPnl);
            agg.put("hasLimitBreach", anyBreach);
            aggregated.add(agg);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date.toString());
        result.put("portfolioCount", aggregated.size());
        result.put("portfolios", aggregated);
        return result;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public FinancialPosition getByCode(String code) {
        return repository.findByPositionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("FinancialPosition", "positionCode", code));
    }

    public List<FinancialPosition> getByType(String positionType, LocalDate date) {
        return repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc(positionType, date);
    }

    public List<FinancialPosition> getBreaches() {
        return repository.findByLimitBreachTrueOrderByPositionDateDesc();
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private void calculateLimitUtilization(FinancialPosition pos) {
        if (pos.getPositionLimit() != null && pos.getPositionLimit().compareTo(BigDecimal.ZERO) > 0) {
            pos.setLimitUtilizationPct(pos.getNetPosition().abs()
                    .divide(pos.getPositionLimit(), 2, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
            pos.setLimitBreach(pos.getNetPosition().abs().compareTo(pos.getPositionLimit()) > 0);
        } else {
            pos.setLimitUtilizationPct(null);
            pos.setLimitBreach(false);
        }
    }

    private void calculateUnrealizedPnl(FinancialPosition pos) {
        if (pos.getMarkToMarket() != null && pos.getAvgCost() != null) {
            // P&L = (Market Price - Avg Cost) * Net Position
            BigDecimal priceDiff = pos.getMarkToMarket().subtract(pos.getAvgCost());
            pos.setUnrealizedPnl(priceDiff.multiply(pos.getNetPosition()).setScale(2, RoundingMode.HALF_UP));
        }
    }
}
