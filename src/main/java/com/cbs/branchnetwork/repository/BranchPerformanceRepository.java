package com.cbs.branchnetwork.repository;

import com.cbs.branchnetwork.entity.BranchPerformance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BranchPerformanceRepository extends JpaRepository<BranchPerformance, Long> {
    List<BranchPerformance> findByBranchId(Long branchId);
    List<BranchPerformance> findByPeriodDateAndPeriodType(LocalDate periodDate, String periodType);
    List<BranchPerformance> findByPeriodDateAndPeriodTypeOrderByRankingAsc(LocalDate periodDate, String periodType);
    Optional<BranchPerformance> findByBranchIdAndPeriodDateAndPeriodType(Long branchId, LocalDate periodDate, String periodType);
}
