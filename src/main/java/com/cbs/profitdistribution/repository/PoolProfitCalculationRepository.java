package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PoolProfitCalculationRepository extends JpaRepository<PoolProfitCalculation, Long> {

    Optional<PoolProfitCalculation> findByCalculationRef(String calculationRef);

    List<PoolProfitCalculation> findByPoolId(Long poolId);

    List<PoolProfitCalculation> findByPoolIdAndCalculationStatus(Long poolId, CalculationStatus status);

    Optional<PoolProfitCalculation> findByPoolIdAndPeriodFromAndPeriodToAndCalculationStatus(
            Long poolId, LocalDate periodFrom, LocalDate periodTo, CalculationStatus status);
}
