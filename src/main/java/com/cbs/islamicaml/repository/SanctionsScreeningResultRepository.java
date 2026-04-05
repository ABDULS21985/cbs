package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.SanctionsDispositionStatus;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.entity.SanctionsScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SanctionsScreeningResultRepository extends JpaRepository<SanctionsScreeningResult, Long>,
        JpaSpecificationExecutor<SanctionsScreeningResult> {

    Optional<SanctionsScreeningResult> findByScreeningRef(String screeningRef);

    List<SanctionsScreeningResult> findByCustomerId(Long customerId);

    List<SanctionsScreeningResult> findByOverallResult(SanctionsOverallResult overallResult);

    List<SanctionsScreeningResult> findByDispositionStatus(SanctionsDispositionStatus dispositionStatus);

    long countByOverallResult(SanctionsOverallResult overallResult);

    @Query("SELECT COUNT(r) FROM SanctionsScreeningResult r WHERE r.screeningTimestamp >= :from AND r.screeningTimestamp < :to")
    long countByScreeningTimestampBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(r) FROM SanctionsScreeningResult r WHERE r.overallResult = :result AND r.screeningTimestamp >= :from AND r.screeningTimestamp < :to")
    long countByOverallResultAndScreeningTimestampBetween(@Param("result") SanctionsOverallResult result,
                                                          @Param("from") LocalDateTime from,
                                                          @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(r) FROM SanctionsScreeningResult r WHERE r.dispositionStatus = :status AND r.screeningTimestamp >= :from AND r.screeningTimestamp < :to")
    long countByDispositionStatusAndScreeningTimestampBetween(@Param("status") SanctionsDispositionStatus status,
                                                              @Param("from") LocalDateTime from,
                                                              @Param("to") LocalDateTime to);

    @Query("SELECT r FROM SanctionsScreeningResult r WHERE r.overallResult = :result AND r.screeningTimestamp >= :from ORDER BY r.screeningTimestamp DESC")
    List<SanctionsScreeningResult> findByOverallResultAndScreeningTimestampAfter(@Param("result") SanctionsOverallResult result,
                                                                                 @Param("from") LocalDateTime from);
}
