package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.PoolIncomeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PoolIncomeRecordRepository extends JpaRepository<PoolIncomeRecord, Long> {

    List<PoolIncomeRecord> findByPoolId(Long poolId);

    @Query("""
            SELECT i FROM PoolIncomeRecord i
            WHERE i.poolId = :poolId
            AND i.periodFrom >= :periodFrom
            AND i.periodTo <= :periodTo
            """)
    List<PoolIncomeRecord> findByPoolIdAndPeriodFromAndPeriodTo(
            @Param("poolId") Long poolId,
            @Param("periodFrom") LocalDate periodFrom,
            @Param("periodTo") LocalDate periodTo);

    @Query("""
            SELECT COALESCE(SUM(i.amount), 0)
            FROM PoolIncomeRecord i
            WHERE i.poolId = :poolId
            AND i.isCharityIncome = true
            AND i.periodFrom >= :periodFrom
            AND i.periodTo <= :periodTo
            """)
    BigDecimal sumCharityIncome(
            @Param("poolId") Long poolId,
            @Param("periodFrom") LocalDate periodFrom,
            @Param("periodTo") LocalDate periodTo);

    @Query("""
            SELECT i FROM PoolIncomeRecord i
            WHERE i.poolId = :poolId
            AND i.incomeDate BETWEEN :from AND :to
            """)
    List<PoolIncomeRecord> findByPoolIdAndIncomeDateBetween(
            @Param("poolId") Long poolId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
