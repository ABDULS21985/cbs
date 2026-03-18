package com.cbs.marketrisk.service;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MarketRiskService {
    private final MarketRiskPositionRepository positionRepository;
    @Transactional
    public MarketRiskPosition recordPosition(MarketRiskPosition pos) {
        if (pos.getVarLimit() != null && pos.getVar1d99() != null && pos.getVarLimit().signum() > 0) {
            pos.setVarUtilizationPct(pos.getVar1d99().divide(pos.getVarLimit(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
            pos.setLimitBreach(pos.getVar1d99().compareTo(pos.getVarLimit()) > 0);
        }
        if (pos.getVar1d99() != null) pos.setVar10d99(pos.getVar1d99().multiply(BigDecimal.valueOf(Math.sqrt(10))));
        MarketRiskPosition saved = positionRepository.save(pos);
        if (saved.getLimitBreach()) log.warn("VaR limit breach: type={}, portfolio={}, VaR={}, limit={}", pos.getRiskType(), pos.getPortfolio(), pos.getVar1d99(), pos.getVarLimit());
        return saved;
    }
    public List<MarketRiskPosition> getByDate(LocalDate date) { return positionRepository.findByPositionDateOrderByRiskTypeAscPortfolioAsc(date); }
    public List<MarketRiskPosition> getBreaches() { return positionRepository.findByLimitBreachTrueOrderByPositionDateDesc(); }
}
