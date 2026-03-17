package com.cbs.limits.repository;

import com.cbs.limits.entity.LimitScope;
import com.cbs.limits.entity.LimitType;
import com.cbs.limits.entity.TransactionLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionLimitRepository extends JpaRepository<TransactionLimit, Long> {

    @Query("SELECT l FROM TransactionLimit l WHERE l.limitType = :type AND l.scope = :scope " +
           "AND (l.scopeRefId = :refId OR l.scopeRefId IS NULL) AND l.isActive = true " +
           "AND l.effectiveFrom <= :date AND (l.effectiveTo IS NULL OR l.effectiveTo >= :date) " +
           "ORDER BY l.scope DESC")
    List<TransactionLimit> findApplicableLimits(@Param("type") LimitType type, @Param("scope") LimitScope scope,
                                                  @Param("refId") Long refId, @Param("date") LocalDate date);

    List<TransactionLimit> findByLimitTypeAndIsActiveTrue(LimitType type);

    List<TransactionLimit> findByScopeAndScopeRefIdAndIsActiveTrue(LimitScope scope, Long scopeRefId);
}
