package com.cbs.investportfolio.repository;

import com.cbs.investportfolio.entity.PortfolioHolding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PortfolioHoldingRepository extends JpaRepository<PortfolioHolding, Long> {
    List<PortfolioHolding> findByPortfolioIdOrderByWeightPctDesc(Long portfolioId);
    List<PortfolioHolding> findByPortfolioIdAndAssetClass(Long portfolioId, String assetClass);
}
