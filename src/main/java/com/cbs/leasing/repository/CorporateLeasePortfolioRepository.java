package com.cbs.leasing.repository;

import com.cbs.leasing.entity.CorporateLeasePortfolio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorporateLeasePortfolioRepository extends JpaRepository<CorporateLeasePortfolio, Long> {
    Optional<CorporateLeasePortfolio> findFirstByCorporateCustomerIdOrderByAsOfDateDesc(Long corporateCustomerId);
    List<CorporateLeasePortfolio> findByCorporateCustomerId(Long corporateCustomerId);
}
