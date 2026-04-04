package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PoolProfitAllocationRepository extends JpaRepository<PoolProfitAllocation, Long> {

    List<PoolProfitAllocation> findByPoolIdAndPeriodFromAndPeriodTo(Long poolId, LocalDate periodFrom, LocalDate periodTo);

    List<PoolProfitAllocation> findByPoolIdAndDistributionStatus(Long poolId, ProfitAllocationStatus status);

    List<PoolProfitAllocation> findByAccountIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqual(Long accountId, LocalDate from, LocalDate to);

    @Query("SELECT pa FROM PoolProfitAllocation pa WHERE pa.accountId = :accountId ORDER BY pa.periodFrom DESC")
    List<PoolProfitAllocation> findByAccountIdOrderByPeriodDesc(@Param("accountId") Long accountId);

    @Query("SELECT COALESCE(SUM(pa.customerProfitShare), 0) FROM PoolProfitAllocation pa WHERE pa.poolId = :poolId AND pa.periodFrom = :from AND pa.periodTo = :to")
    BigDecimal sumCustomerProfitByPeriod(@Param("poolId") Long poolId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
