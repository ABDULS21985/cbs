package com.cbs.fees.repository;

import com.cbs.fees.entity.FeeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeeDefinitionRepository extends JpaRepository<FeeDefinition, Long> {

    Optional<FeeDefinition> findByFeeCode(String feeCode);

    @Query("SELECT f FROM FeeDefinition f WHERE f.triggerEvent = :event AND f.isActive = true " +
           "AND f.effectiveFrom <= :date AND (f.effectiveTo IS NULL OR f.effectiveTo >= :date)")
    List<FeeDefinition> findByTriggerEvent(@Param("event") String event, @Param("date") LocalDate date);

    List<FeeDefinition> findByIsActiveTrueOrderByFeeCategoryAscFeeNameAsc();
}
