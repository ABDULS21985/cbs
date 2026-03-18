package com.cbs.casemgmt.repository;

import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseRootCauseAnalysisRepository extends JpaRepository<CaseRootCauseAnalysis, Long> {
    Optional<CaseRootCauseAnalysis> findByRcaCode(String rcaCode);
    List<CaseRootCauseAnalysis> findByCaseId(Long caseId);
    List<CaseRootCauseAnalysis> findByStatus(String status);
    List<CaseRootCauseAnalysis> findByRootCauseCategory(String rootCauseCategory);
}
