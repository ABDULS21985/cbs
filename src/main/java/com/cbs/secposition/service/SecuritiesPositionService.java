package com.cbs.secposition.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.secposition.entity.SecuritiesMovement;
import com.cbs.secposition.entity.SecuritiesPosition;
import com.cbs.secposition.repository.SecuritiesMovementRepository;
import com.cbs.secposition.repository.SecuritiesPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SecuritiesPositionService {

    private final SecuritiesPositionRepository positionRepository;
    private final SecuritiesMovementRepository movementRepository;
    private final CurrentActorProvider actorProvider;

    @Transactional
    public SecuritiesPosition record(SecuritiesPosition pos) {
        validatePosition(pos);

        pos.setPositionId("SP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        recalculateDerivedFields(pos);

        SecuritiesPosition saved = positionRepository.save(pos);
        log.info("Position recorded by {}: id={}, instrument={}, qty={}, marketValue={}",
                actorProvider.getCurrentActor(), saved.getPositionId(), saved.getInstrumentCode(),
                saved.getQuantity(), saved.getMarketValue());
        return saved;
    }

    /**
     * Records a securities movement and updates the parent position accordingly.
     * Supports BUY, SELL, TRANSFER_IN, TRANSFER_OUT movement types.
     */
    @Transactional
    public SecuritiesMovement recordMovement(SecuritiesMovement movement) {
        validateMovement(movement);

        movement.setMovementRef("SM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Fetch and update the parent position
        SecuritiesPosition position = positionRepository.findByPositionId(movement.getPositionId())
                .orElseThrow(() -> new ResourceNotFoundException("SecuritiesPosition", "positionId", movement.getPositionId()));

        BigDecimal movementQty = movement.getQuantity();
        BigDecimal movementPrice = movement.getPrice() != null ? movement.getPrice() : BigDecimal.ZERO;
        String type = movement.getMovementType().toUpperCase();

        switch (type) {
            case "BUY", "TRANSFER_IN" -> {
                // Increase position quantity and update average cost
                BigDecimal currentQty = position.getQuantity() != null ? position.getQuantity() : BigDecimal.ZERO;
                BigDecimal currentCostBasis = position.getCostBasis() != null ? position.getCostBasis() : BigDecimal.ZERO;
                BigDecimal addedCost = movementQty.multiply(movementPrice);

                BigDecimal newQty = currentQty.add(movementQty);
                BigDecimal newCostBasis = currentCostBasis.add(addedCost);
                position.setQuantity(newQty);
                position.setCostBasis(newCostBasis);

                if (newQty.signum() > 0) {
                    position.setAvgCost(newCostBasis.divide(newQty, 6, RoundingMode.HALF_UP));
                }

                // Calculate settlement amount
                if (movement.getSettlementAmount() == null) {
                    movement.setSettlementAmount(addedCost);
                }
            }
            case "SELL", "TRANSFER_OUT" -> {
                // Decrease position quantity
                BigDecimal currentQty = position.getQuantity() != null ? position.getQuantity() : BigDecimal.ZERO;
                if (movementQty.compareTo(currentQty) > 0) {
                    throw new BusinessException("Insufficient quantity: available=" + currentQty + ", requested=" + movementQty);
                }

                BigDecimal avgCost = position.getAvgCost() != null ? position.getAvgCost() : BigDecimal.ZERO;
                BigDecimal removedCost = movementQty.multiply(avgCost);

                BigDecimal newQty = currentQty.subtract(movementQty);
                BigDecimal newCostBasis = (position.getCostBasis() != null ? position.getCostBasis() : BigDecimal.ZERO)
                        .subtract(removedCost);
                position.setQuantity(newQty);
                position.setCostBasis(newCostBasis.signum() >= 0 ? newCostBasis : BigDecimal.ZERO);

                if (movement.getSettlementAmount() == null) {
                    movement.setSettlementAmount(movementQty.multiply(movementPrice));
                }
            }
            default -> throw new BusinessException("Unsupported movement type: " + type
                    + ". Supported: BUY, SELL, TRANSFER_IN, TRANSFER_OUT");
        }

        // Recalculate derived fields on the position
        recalculateDerivedFields(position);
        positionRepository.save(position);

        movement.setStatus("SETTLED");
        SecuritiesMovement saved = movementRepository.save(movement);

        log.info("Movement recorded by {}: ref={}, type={}, positionId={}, qty={}, price={}",
                actorProvider.getCurrentActor(), saved.getMovementRef(), type,
                movement.getPositionId(), movementQty, movementPrice);
        return saved;
    }

    /**
     * Reconciles a position by recalculating all derived fields from its movement history.
     * Returns the reconciled position with any discrepancies logged.
     */
    @Transactional
    public Map<String, Object> reconcilePosition(String positionId) {
        SecuritiesPosition position = positionRepository.findByPositionId(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("SecuritiesPosition", "positionId", positionId));

        List<SecuritiesMovement> movements = movementRepository.findByPositionIdOrderByTradeDateDesc(positionId);

        // Recalculate quantity and cost basis from movements
        BigDecimal reconciledQty = BigDecimal.ZERO;
        BigDecimal reconciledCostBasis = BigDecimal.ZERO;

        for (SecuritiesMovement m : movements) {
            if (!"SETTLED".equals(m.getStatus()) && !"PENDING".equals(m.getStatus())) continue;
            BigDecimal qty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
            BigDecimal price = m.getPrice() != null ? m.getPrice() : BigDecimal.ZERO;
            String type = m.getMovementType() != null ? m.getMovementType().toUpperCase() : "";

            if ("BUY".equals(type) || "TRANSFER_IN".equals(type)) {
                reconciledQty = reconciledQty.add(qty);
                reconciledCostBasis = reconciledCostBasis.add(qty.multiply(price));
            } else if ("SELL".equals(type) || "TRANSFER_OUT".equals(type)) {
                reconciledQty = reconciledQty.subtract(qty);
                // Use average cost for cost basis reduction
                if (reconciledQty.signum() > 0 && reconciledCostBasis.signum() > 0) {
                    BigDecimal avgCost = reconciledCostBasis.divide(reconciledQty.add(qty), 6, RoundingMode.HALF_UP);
                    reconciledCostBasis = reconciledCostBasis.subtract(qty.multiply(avgCost));
                }
            }
        }

        BigDecimal qtyDiff = position.getQuantity().subtract(reconciledQty);
        BigDecimal costDiff = (position.getCostBasis() != null ? position.getCostBasis() : BigDecimal.ZERO)
                .subtract(reconciledCostBasis);

        boolean hasDiscrepancy = qtyDiff.signum() != 0 || costDiff.signum() != 0;

        if (hasDiscrepancy) {
            log.warn("Position reconciliation discrepancy found by {}: positionId={}, qtyDiff={}, costDiff={}",
                    actorProvider.getCurrentActor(), positionId, qtyDiff, costDiff);
            // Auto-correct the position
            position.setQuantity(reconciledQty);
            position.setCostBasis(reconciledCostBasis);
            if (reconciledQty.signum() > 0) {
                position.setAvgCost(reconciledCostBasis.divide(reconciledQty, 6, RoundingMode.HALF_UP));
            }
            recalculateDerivedFields(position);
            positionRepository.save(position);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("positionId", positionId);
        result.put("movementCount", movements.size());
        result.put("reconciledQuantity", reconciledQty);
        result.put("reconciledCostBasis", reconciledCostBasis);
        result.put("hasDiscrepancy", hasDiscrepancy);
        result.put("quantityDifference", qtyDiff);
        result.put("costBasisDifference", costDiff);
        return result;
    }

    public SecuritiesPosition getByPositionId(String positionId) {
        return positionRepository.findByPositionId(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("SecuritiesPosition", "positionId", positionId));
    }

    public List<SecuritiesPosition> getByPortfolio(String portfolioCode) {
        return positionRepository.findByPortfolioCodeOrderByMarketValueDesc(portfolioCode);
    }

    public List<SecuritiesMovement> getMovements(String positionId) {
        return movementRepository.findByPositionIdOrderByTradeDateDesc(positionId);
    }

    public List<SecuritiesPosition> getAll() {
        return positionRepository.findAll();
    }

    public List<SecuritiesMovement> getAllMovements() {
        return movementRepository.findAll();
    }

    // ---- private helpers ----

    private void validatePosition(SecuritiesPosition pos) {
        if (pos.getInstrumentCode() == null || pos.getInstrumentCode().isBlank()) {
            throw new BusinessException("Instrument code is required");
        }
        if (pos.getInstrumentName() == null || pos.getInstrumentName().isBlank()) {
            throw new BusinessException("Instrument name is required");
        }
        if (pos.getCurrency() == null || pos.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
        if (pos.getPositionDate() == null) {
            throw new BusinessException("Position date is required");
        }
        if (pos.getQuantity() != null && pos.getQuantity().signum() < 0) {
            throw new BusinessException("Position quantity cannot be negative");
        }
    }

    private void validateMovement(SecuritiesMovement movement) {
        if (movement.getPositionId() == null || movement.getPositionId().isBlank()) {
            throw new BusinessException("Position ID is required for movement");
        }
        if (movement.getMovementType() == null || movement.getMovementType().isBlank()) {
            throw new BusinessException("Movement type is required");
        }
        if (movement.getQuantity() == null || movement.getQuantity().signum() <= 0) {
            throw new BusinessException("Movement quantity must be positive");
        }
        if (movement.getTradeDate() == null) {
            throw new BusinessException("Trade date is required");
        }
        if (movement.getPrice() != null && movement.getPrice().signum() < 0) {
            throw new BusinessException("Price cannot be negative");
        }
    }

    private void recalculateDerivedFields(SecuritiesPosition pos) {
        if (pos.getQuantity() != null && pos.getAvgCost() != null) {
            pos.setCostBasis(pos.getQuantity().multiply(pos.getAvgCost()));
        }
        if (pos.getQuantity() != null && pos.getCurrentPrice() != null) {
            pos.setMarketValue(pos.getQuantity().multiply(pos.getCurrentPrice()));
            if (pos.getCostBasis() != null) {
                pos.setUnrealizedGainLoss(pos.getMarketValue().subtract(pos.getCostBasis()));
            }
        }
        if (pos.getQuantity() != null && pos.getPledgedQuantity() != null) {
            pos.setAvailableQuantity(pos.getQuantity().subtract(pos.getPledgedQuantity()));
        }
    }
}
