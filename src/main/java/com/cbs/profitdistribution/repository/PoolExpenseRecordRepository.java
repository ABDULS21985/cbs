package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.PoolExpenseRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PoolExpenseRecordRepository extends JpaRepository<PoolExpenseRecord, Long> {

    List<PoolExpenseRecord> findByPoolId(Long poolId);

    List<PoolExpenseRecord> findByPoolIdAndExpenseType(Long poolId, com.cbs.profitdistribution.entity.ExpenseType expenseType);

    @Query("""
            SELECT e FROM PoolExpenseRecord e
            WHERE e.poolId = :poolId
            AND e.periodFrom >= :periodFrom
            AND e.periodTo <= :periodTo
            """)
    List<PoolExpenseRecord> findByPoolIdAndPeriodFromAndPeriodTo(
            @Param("poolId") Long poolId,
            @Param("periodFrom") LocalDate periodFrom,
            @Param("periodTo") LocalDate periodTo);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0)
            FROM PoolExpenseRecord e
            WHERE e.poolId = :poolId
            AND e.periodFrom >= :periodFrom
            AND e.periodTo <= :periodTo
            """)
    BigDecimal sumExpensesByPoolAndPeriod(
            @Param("poolId") Long poolId,
            @Param("periodFrom") LocalDate periodFrom,
            @Param("periodTo") LocalDate periodTo);

    @Query("""
            SELECT e FROM PoolExpenseRecord e
            WHERE e.poolId = :poolId
            AND e.expenseDate BETWEEN :from AND :to
            """)
    List<PoolExpenseRecord> findByPoolIdAndExpenseDateBetween(
            @Param("poolId") Long poolId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
