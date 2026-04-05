package com.cbs.branchnetwork.service;

import com.cbs.branchnetwork.entity.BranchPerformance;
import com.cbs.branchnetwork.repository.BranchPerformanceRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public BranchPerformance recordPerformance(BranchPerformance performance) {
        // Validate required fields
        if (performance.getBranchId() == null) {
            throw new BusinessException("Branch ID is required", "MISSING_BRANCH_ID");
        }
        if (performance.getPeriodDate() == null || performance.getPeriodType() == null) {
            throw new BusinessException("Period date and period type are required", "MISSING_PERIOD");
        }
        // Validate numeric fields are non-negative
        if (performance.getTotalRevenue() != null && performance.getTotalRevenue().signum() < 0) {
            throw new BusinessException("Total revenue cannot be negative", "NEGATIVE_REVENUE");
        }
        if (performance.getCostToIncomeRatio() != null && performance.getCostToIncomeRatio().signum() < 0) {
            throw new BusinessException("Cost-to-income ratio cannot be negative", "NEGATIVE_COST_TO_INCOME");
        }
        // Duplicate check: same branch + period
        repository.findByBranchIdAndPeriodDateAndPeriodType(performance.getBranchId(), performance.getPeriodDate(), performance.getPeriodType())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("BranchPerformance", "branchId+period",
                            performance.getBranchId() + "/" + performance.getPeriodDate() + "/" + performance.getPeriodType());
                });
        performance.setStatus("CALCULATED");
        BranchPerformance saved = repository.save(performance);
        log.info("AUDIT: Branch performance recorded: branchId={}, period={} {}, actor={}",
                saved.getBranchId(), saved.getPeriodType(), saved.getPeriodDate(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<BranchPerformance> getBranchRanking(LocalDate periodDate, String periodType) {
        return repository.findByPeriodDateAndPeriodTypeOrderByRankingAsc(periodDate, periodType);
    }

    public Map<String, BigDecimal> getRegionalSummary(LocalDate periodDate, String periodType) {
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(p -> p.getTotalRevenue() != null)
                .collect(Collectors.groupingBy(
                        p -> String.valueOf(p.getBranchId()),
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
