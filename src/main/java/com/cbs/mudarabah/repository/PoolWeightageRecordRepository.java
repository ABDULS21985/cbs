package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.PoolWeightageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PoolWeightageRecordRepository extends JpaRepository<PoolWeightageRecord, Long> {

    List<PoolWeightageRecord> findByPoolIdAndRecordDate(Long poolId, LocalDate recordDate);

    List<PoolWeightageRecord> findByPoolIdAndAccountIdAndRecordDateBetween(Long poolId, Long accountId, LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(r.dailyProduct), 0) FROM PoolWeightageRecord r WHERE r.poolId = :poolId AND r.accountId = :accountId AND r.recordDate BETWEEN :from AND :to AND r.isActive = true")
    BigDecimal sumDailyProduct(@Param("poolId") Long poolId, @Param("accountId") Long accountId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COALESCE(SUM(r.dailyProduct), 0) FROM PoolWeightageRecord r WHERE r.poolId = :poolId AND r.recordDate BETWEEN :from AND :to AND r.isActive = true")
    BigDecimal sumPoolDailyProduct(@Param("poolId") Long poolId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT DISTINCT r.accountId FROM PoolWeightageRecord r WHERE r.poolId = :poolId AND r.recordDate BETWEEN :from AND :to AND r.isActive = true")
    List<Long> findActiveAccountIds(@Param("poolId") Long poolId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    boolean existsByPoolIdAndAccountIdAndRecordDate(Long poolId, Long accountId, LocalDate recordDate);

    @Query("SELECT COUNT(DISTINCT r.recordDate) FROM PoolWeightageRecord r WHERE r.poolId = :poolId AND r.recordDate BETWEEN :from AND :to AND r.isActive = true")
    long countDistinctRecordDates(@Param("poolId") Long poolId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
