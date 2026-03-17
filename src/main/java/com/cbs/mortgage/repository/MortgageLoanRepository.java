package com.cbs.mortgage.repository;

import com.cbs.mortgage.entity.MortgageLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface MortgageLoanRepository extends JpaRepository<MortgageLoan, Long> {
    Optional<MortgageLoan> findByMortgageNumber(String mortgageNumber);
    List<MortgageLoan> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<MortgageLoan> findByStatusOrderByCreatedAtDesc(String status);
    @Query("SELECT m FROM MortgageLoan m WHERE m.currentLtv > :maxLtv AND m.status = 'ACTIVE'")
    List<MortgageLoan> findHighLtvMortgages(BigDecimal maxLtv);
    @Query("SELECT m FROM MortgageLoan m WHERE m.fixedRateEndDate <= CURRENT_DATE AND m.status = 'ACTIVE'")
    List<MortgageLoan> findFixedRateExpiring();
}
