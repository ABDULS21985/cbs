package com.cbs.branchnetwork.service;

import com.cbs.branchnetwork.entity.BranchPerformance;
import com.cbs.branchnetwork.repository.BranchPerformanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BranchPerformanceService {

    private final BranchPerformanceRepository repository;

    @Transactional
    public BranchPerformance recordPerformance(BranchPerformance performance) {
        performance.setStatus("CALCULATED");
        BranchPerformance saved = repository.save(performance);
        log.info("Branch performance recorded: branchId={}, period={} {}", saved.getBranchId(), saved.getPeriodType(), saved.getPeriodDate());
        return saved;
    }

    public List<BranchPerformance> getBranchRanking(LocalDate periodDate, String periodType) {
        return repository.findByPeriodDateAndPeriodTypeOrderByRankingAsc(periodDate, periodType);
    }

    public Map<String, BigDecimal> getRegionalSummary(LocalDate periodDate, String periodType) {
        // This would ideally join with branch table for region; simplified here
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(p -> p.getTotalRevenue() != null)
                .collect(Collectors.groupingBy(
                        p -> "branch_" + p.getBranchId(),
                        Collectors.reducing(BigDecimal.ZERO, BranchPerformance::getTotalRevenue, BigDecimal::add)));
    }

    public List<BranchPerformance> getUnderperformers(LocalDate periodDate, String periodType, BigDecimal maxCostToIncome) {
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(p -> p.getCostToIncomeRatio() != null && p.getCostToIncomeRatio().compareTo(maxCostToIncome) > 0)
                .toList();
    }

    public List<BranchPerformance> getDigitalMigrationReport(LocalDate periodDate, String periodType) {
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(p -> p.getDigitalAdoptionPct() != null)
                .sorted(Comparator.comparing(BranchPerformance::getDigitalAdoptionPct).reversed())
                .toList();
    }

    public List<BranchPerformance> getByBranch(Long branchId) {
        return repository.findByBranchId(branchId);
    }
}
