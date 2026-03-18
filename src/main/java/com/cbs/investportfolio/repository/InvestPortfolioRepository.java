package com.cbs.investportfolio.repository;

import com.cbs.investportfolio.entity.InvestPortfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvestPortfolioRepository extends JpaRepository<InvestPortfolio, Long> {
    Optional<InvestPortfolio> findByPortfolioCode(String code);
    List<InvestPortfolio> findByCustomerIdAndStatusOrderByPortfolioNameAsc(Long customerId, String status);
    List<InvestPortfolio> findByPortfolioManagerIdAndStatusOrderByPortfolioNameAsc(String managerId, String status);
}
