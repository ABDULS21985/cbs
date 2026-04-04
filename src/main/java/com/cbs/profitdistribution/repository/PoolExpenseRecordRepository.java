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

    List<PoolExpenseRecord> findByPoolIdAndPeriodFromAndPeriodTo(Long poolId, LocalDate periodFrom, LocalDate periodTo);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM PoolExpenseRecord e " +
           "WHERE e.poolId = :poolId AND e.periodFrom = :periodFrom AND e.periodTo = :periodTo")
    BigDecimal sumExpensesByPoolAndPeriod(@Param("poolId") Long poolId,
                                          @Param("periodFrom") LocalDate periodFrom,
                                          @Param("periodTo") LocalDate periodTo);
}
