package com.cbs.secposition.service;

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
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SecuritiesPositionService {
    private final SecuritiesPositionRepository positionRepository;
    private final SecuritiesMovementRepository movementRepository;

    @Transactional
    public SecuritiesPosition record(SecuritiesPosition pos) {
        pos.setPositionId("SP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
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
        return positionRepository.save(pos);
    }

    @Transactional
    public SecuritiesMovement recordMovement(SecuritiesMovement movement) {
        movement.setMovementRef("SM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return movementRepository.save(movement);
    }

    public List<SecuritiesPosition> getByPortfolio(String portfolioCode) {
        return positionRepository.findByPortfolioCodeOrderByMarketValueDesc(portfolioCode);
    }

    public List<SecuritiesMovement> getMovements(String positionId) {
        return movementRepository.findByPositionIdOrderByTradeDateDesc(positionId);
    }

    public List<SecuritiesPosition> getAll() { return positionRepository.findAll(); }

    public List<SecuritiesMovement> getAllMovements() { return movementRepository.findAll(); }
}
