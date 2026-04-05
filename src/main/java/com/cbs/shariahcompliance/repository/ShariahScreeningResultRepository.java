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

    @Query("SELECT r FROM ShariahScreeningResult r WHERE r.overallResult = :result AND r.screenedAt >= :from ORDER BY r.screenedAt DESC")
    List<ShariahScreeningResult> findByOverallResultAndScreenedAtAfter(@Param("result") ScreeningOverallResult result,
                                                                       @Param("from") LocalDateTime from);

    @Query(value = "SELECT DISTINCT r.contract_ref FROM cbs.shariah_screening_result r " +
            "WHERE r.contract_type_code = :contractType AND r.screened_at BETWEEN :from AND :to " +
            "AND r.contract_ref IS NOT NULL ORDER BY r.screened_at DESC LIMIT :limit",
            nativeQuery = true)
    List<String> findRecentContractRefs(@Param("contractType") String contractType,
                                       @Param("from") java.time.LocalDate from,
                                       @Param("to") java.time.LocalDate to,
                                       @Param("limit") int limit);
}
