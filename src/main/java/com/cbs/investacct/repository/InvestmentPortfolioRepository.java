package com.cbs.investacct.repository;

import com.cbs.investacct.entity.InvestmentPortfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface InvestmentPortfolioRepository extends JpaRepository<InvestmentPortfolio, Long> {
    Optional<InvestmentPortfolio> findByPortfolioCode(String code);
    List<InvestmentPortfolio> findByIsActiveTrueOrderByPortfolioNameAsc();
}
