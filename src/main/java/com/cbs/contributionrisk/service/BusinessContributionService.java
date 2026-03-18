package com.cbs.contributionrisk.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.contributionrisk.entity.BusinessContribution;
import com.cbs.contributionrisk.repository.BusinessContributionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BusinessContributionService {

    private final BusinessContributionRepository repository;

    @Transactional
    public BusinessContribution calculate(BusinessContribution contribution) {
        contribution.setReportCode("BC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Auto-calculate derived ratios
        if (contribution.getTotalCost() != null && contribution.getTotalRevenue() != null
                && contribution.getTotalRevenue().compareTo(BigDecimal.ZERO) != 0) {
            contribution.setCostToIncomeRatio(
                    contribution.getTotalCost()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(contribution.getTotalRevenue(), 4, RoundingMode.HALF_UP));
        }

        if (contribution.getNetProfit() != null && contribution.getRwaAmount() != null
                && contribution.getRwaAmount().compareTo(BigDecimal.ZERO) != 0) {
            contribution.setReturnOnRwa(
                    contribution.getNetProfit()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(contribution.getRwaAmount(), 4, RoundingMode.HALF_UP));
        }

        // Calculate contribution percentages relative to bank total
        List<BusinessContribution> peers = repository.findByPeriodDateAndPeriodType(
                contribution.getPeriodDate(), contribution.getPeriodType());
        BigDecimal bankTotalRevenue = peers.stream()
                .map(BusinessContribution::getTotalRevenue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(contribution.getTotalRevenue() != null ? contribution.getTotalRevenue() : BigDecimal.ZERO);

        if (bankTotalRevenue.compareTo(BigDecimal.ZERO) != 0 && contribution.getTotalRevenue() != null) {
            contribution.setRevenueContributionPct(
                    contribution.getTotalRevenue()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(bankTotalRevenue, 4, RoundingMode.HALF_UP));
        }

        BigDecimal bankTotalProfit = peers.stream()
                .map(BusinessContribution::getNetProfit)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(contribution.getNetProfit() != null ? contribution.getNetProfit() : BigDecimal.ZERO);

        if (bankTotalProfit.compareTo(BigDecimal.ZERO) != 0 && contribution.getNetProfit() != null) {
            contribution.setProfitContributionPct(
                    contribution.getNetProfit()
                            .multiply(BigDecimal.valueOf(100))
                            .divide(bankTotalProfit, 4, RoundingMode.HALF_UP));
        }

        contribution.setStatus("CALCULATED");
        BusinessContribution saved = repository.save(contribution);
        log.info("Business contribution calculated: code={}, BU={}, revenue={}", saved.getReportCode(), saved.getBusinessUnit(), saved.getTotalRevenue());
        return saved;
    }

    public List<BusinessContribution> getByBusinessUnit(String businessUnit) {
        return repository.findByBusinessUnit(businessUnit);
    }

    public List<BusinessContribution> getByProduct(String productFamily) {
        return repository.findByProductFamily(productFamily);
    }

    public List<BusinessContribution> getByRegion(String region) {
        return repository.findByRegion(region);
    }

    public List<BusinessContribution> getTopContributors(LocalDate periodDate, String periodType, int limit) {
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(c -> c.getNetProfit() != null)
                .sorted(Comparator.comparing(BusinessContribution::getNetProfit).reversed())
                .limit(limit)
                .toList();
    }

    public List<BusinessContribution> getUnderperformers(LocalDate periodDate, String periodType, BigDecimal minRaroc) {
        return repository.findByPeriodDateAndPeriodType(periodDate, periodType).stream()
                .filter(c -> c.getReturnOnRwa() != null && c.getReturnOnRwa().compareTo(minRaroc) < 0)
                .toList();
    }

    public BusinessContribution getByCode(String code) {
        return repository.findByReportCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessContribution", "reportCode", code));
    }
}
