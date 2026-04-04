package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PoolProfitCalculationRepository extends JpaRepository<PoolProfitCalculation, Long> {

    Optional<PoolProfitCalculation> findByCalculationRef(String calculationRef);

    Optional<PoolProfitCalculation> findByPoolIdAndPeriodFromAndPeriodTo(Long poolId, LocalDate periodFrom, LocalDate periodTo);

    List<PoolProfitCalculation> findByPoolIdAndCalculationStatus(Long poolId, CalculationStatus calculationStatus);

    @Query("SELECT p FROM PoolProfitCalculation p " +
           "WHERE p.poolId = :poolId AND p.periodFrom = :periodFrom AND p.periodTo = :periodTo " +
           "AND p.calculationStatus = 'APPROVED'")
    Optional<PoolProfitCalculation> findApproved(@Param("poolId") Long poolId,
                                                  @Param("periodFrom") LocalDate periodFrom,
                                                  @Param("periodTo") LocalDate periodTo);

    List<PoolProfitCalculation> findByPoolIdOrderByPeriodFromDesc(Long poolId);
}
