package com.cbs.casemgmt.repository;

import com.cbs.casemgmt.entity.CasePatternInsight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CasePatternInsightRepository extends JpaRepository<CasePatternInsight, Long> {
    List<CasePatternInsight> findByStatus(String status);
    List<CasePatternInsight> findByPatternType(String patternType);
    List<CasePatternInsight> findByRootCauseCategory(String rootCauseCategory);
}
