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
import java.util.List;
import java.util.Optional;

@Repository
public interface EclCalculationRepository extends JpaRepository<EclCalculation, Long> {
    Page<EclCalculation> findByCalculationDateOrderByEclWeightedDesc(LocalDate date, Pageable pageable);
    Optional<EclCalculation> findTopByLoanAccountIdOrderByCalculationDateDesc(Long loanAccountId);
    @Query("SELECT SUM(e.eclWeighted) FROM EclCalculation e WHERE e.calculationDate = :date")
    BigDecimal totalEclForDate(@Param("date") LocalDate date);
    @Query("SELECT SUM(e.eclWeighted) FROM EclCalculation e WHERE e.calculationDate = :date AND e.currentStage = :stage")
    BigDecimal totalEclByStage(@Param("date") LocalDate date, @Param("stage") int stage);

    @Query("SELECT e.currentStage AS stage, COUNT(e) AS cnt, SUM(e.eclWeighted) AS total " +
           "FROM EclCalculation e WHERE e.calculationDate = :date GROUP BY e.currentStage ORDER BY e.currentStage")
    List<Object[]> stageDistribution(@Param("date") LocalDate date);

    @Query("SELECT e.previousStage AS fromStage, e.currentStage AS toStage, SUM(e.eclWeighted) AS amount " +
           "FROM EclCalculation e WHERE e.calculationDate = :date AND e.previousStage IS NOT NULL AND e.previousStage <> e.currentStage " +
           "GROUP BY e.previousStage, e.currentStage ORDER BY e.previousStage, e.currentStage")
    List<Object[]> stageMigration(@Param("date") LocalDate date);

    @Query("SELECT e.segment AS seg, SUM(e.ead) AS totalEad " +
           "FROM EclCalculation e WHERE e.calculationDate = :date GROUP BY e.segment ORDER BY totalEad DESC")
    List<Object[]> eadBySegment(@Param("date") LocalDate date);

    Page<EclCalculation> findByCurrentStage(int stage, Pageable pageable);
}
