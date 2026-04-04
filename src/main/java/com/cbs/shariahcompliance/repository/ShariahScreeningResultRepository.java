package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ShariahScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahScreeningResultRepository extends JpaRepository<ShariahScreeningResult, Long> {

    Optional<ShariahScreeningResult> findByScreeningRef(String screeningRef);

    List<ShariahScreeningResult> findByTransactionRef(String transactionRef);

    List<ShariahScreeningResult> findByOverallResult(ScreeningOverallResult overallResult);

    long countByOverallResult(ScreeningOverallResult overallResult);

    @Query("SELECT COUNT(r) FROM ShariahScreeningResult r WHERE r.screenedAt BETWEEN :from AND :to")
    long countByScreenedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
