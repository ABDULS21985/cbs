package com.cbs.investacct.repository;

import com.cbs.investacct.entity.InvestmentValuation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Repository
public interface InvestmentValuationRepository extends JpaRepository<InvestmentValuation, Long> {
    Page<InvestmentValuation> findByValuationDateAndPortfolioCodeOrderByCarryingAmountDesc(LocalDate date, String portfolioCode, Pageable pageable);
    Optional<InvestmentValuation> findTopByHoldingIdOrderByValuationDateDesc(Long holdingId);
    @Query("SELECT SUM(v.carryingAmount) FROM InvestmentValuation v WHERE v.portfolioCode = :code AND v.valuationDate = :date")
    BigDecimal totalCarryingAmount(@Param("code") String portfolioCode, @Param("date") LocalDate date);
    @Query("SELECT SUM(v.eclAmount) FROM InvestmentValuation v WHERE v.portfolioCode = :code AND v.valuationDate = :date")
    BigDecimal totalEclByPortfolio(@Param("code") String portfolioCode, @Param("date") LocalDate date);
}
