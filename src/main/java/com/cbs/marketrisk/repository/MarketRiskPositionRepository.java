package com.cbs.marketrisk.repository;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface MarketRiskPositionRepository extends JpaRepository<MarketRiskPosition, Long> {
    List<MarketRiskPosition> findByPositionDateOrderByRiskTypeAscPortfolioAsc(LocalDate date);
    List<MarketRiskPosition> findByPositionDateAndRiskTypeOrderByPortfolioAsc(LocalDate date, String riskType);
    List<MarketRiskPosition> findByLimitBreachTrueOrderByPositionDateDesc();
}
