package com.cbs.ecl.repository;

import com.cbs.ecl.entity.EclCalculation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface EclCalculationRepository extends JpaRepository<EclCalculation, Long> {
    Page<EclCalculation> findByCalculationDateOrderByEclWeightedDesc(LocalDate date, Pageable pageable);
    Optional<EclCalculation> findTopByLoanAccountIdOrderByCalculationDateDesc(Long loanAccountId);
    @Query("SELECT SUM(e.eclWeighted) FROM EclCalculation e WHERE e.calculationDate = :date")
    BigDecimal totalEclForDate(@Param("date") LocalDate date);
    @Query("SELECT SUM(e.eclWeighted) FROM EclCalculation e WHERE e.calculationDate = :date AND e.currentStage = :stage")
    BigDecimal totalEclByStage(@Param("date") LocalDate date, @Param("stage") int stage);
}
