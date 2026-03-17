package com.cbs.fixedincome.repository;

import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.entity.SecurityType;
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
public interface SecurityHoldingRepository extends JpaRepository<SecurityHolding, Long> {
    Optional<SecurityHolding> findByHoldingRef(String ref);
    List<SecurityHolding> findByPortfolioCodeAndStatus(String portfolioCode, String status);
    Page<SecurityHolding> findByStatusOrderByMaturityDateAsc(String status, Pageable pageable);
    @Query("SELECT s FROM SecurityHolding s WHERE s.status = 'ACTIVE' AND s.maturityDate <= :date")
    List<SecurityHolding> findMaturedHoldings(@Param("date") LocalDate date);
    @Query("SELECT COALESCE(SUM(s.faceValue), 0) FROM SecurityHolding s WHERE s.portfolioCode = :code AND s.status = 'ACTIVE'")
    BigDecimal totalFaceValueByPortfolio(@Param("code") String portfolioCode);
    @Query("SELECT s FROM SecurityHolding s WHERE s.status = 'ACTIVE' AND s.nextCouponDate = :date")
    List<SecurityHolding> findDueCoupons(@Param("date") LocalDate date);
}
