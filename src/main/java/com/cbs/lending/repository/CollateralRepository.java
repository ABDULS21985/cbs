package com.cbs.lending.repository;

import com.cbs.lending.entity.Collateral;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollateralRepository extends JpaRepository<Collateral, Long> {

    Optional<Collateral> findByCollateralNumber(String collateralNumber);

    Page<Collateral> findByCustomerId(Long customerId, Pageable pageable);

    @Query(value = "SELECT nextval('cbs.collateral_seq')", nativeQuery = true)
    Long getNextCollateralSequence();

    @Query("SELECT COALESCE(SUM(c.marketValue), 0) FROM Collateral c JOIN LoanCollateralLink l ON l.collateral.id = c.id WHERE l.loanAccount.id = :loanId")
    java.math.BigDecimal getTotalCollateralValueForLoan(@Param("loanId") Long loanId);
}
