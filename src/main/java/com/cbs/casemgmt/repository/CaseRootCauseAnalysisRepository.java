package com.cbs.casemgmt.repository;

import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CaseRootCauseAnalysisRepository extends JpaRepository<CaseRootCauseAnalysis, Long> {
    Optional<CaseRootCauseAnalysis> findByRcaCode(String rcaCode);
    List<CaseRootCauseAnalysis> findByCaseId(Long caseId);
    List<CaseRootCauseAnalysis> findByStatus(String status);
    List<CaseRootCauseAnalysis> findByRootCauseCategory(String rootCauseCategory);

    /** Find RCAs with analysis date within the given range */
    @Query("""
            SELECT r FROM CaseRootCauseAnalysis r
            WHERE r.analysisDate IS NOT NULL
            AND r.analysisDate >= :fromDate
            AND r.analysisDate <= :toDate
            """)
    List<CaseRootCauseAnalysis> findByAnalysisDateBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
