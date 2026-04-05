package com.cbs.guidelinecompliance.repository;

import com.cbs.guidelinecompliance.entity.ComplianceGapAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ComplianceGapAnalysisRepository extends JpaRepository<ComplianceGapAnalysis, Long> {
    Optional<ComplianceGapAnalysis> findByAnalysisCode(String analysisCode);
    List<ComplianceGapAnalysis> findByStatus(String status);
    List<ComplianceGapAnalysis> findByAssessmentId(Long assessmentId);
    List<ComplianceGapAnalysis> findByGapSeverity(String gapSeverity);
    List<ComplianceGapAnalysis> findByGapCategory(String gapCategory);
    List<ComplianceGapAnalysis> findByRemediationTargetDateBeforeAndStatusNotIn(LocalDate date, List<String> excludedStatuses);
}
