package com.cbs.alm.service;

import com.cbs.alm.entity.*;
import com.cbs.alm.repository.*;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AlmService {

    private final AlmGapReportRepository gapReportRepository;
    private final AlmScenarioRepository scenarioRepository;
    private final SecurityHoldingRepository holdingRepository;
    private final CurrentActorProvider currentActorProvider;

    /**
     * Generates ALM gap report with:
     * - Time bucket analysis (RSA vs RSL per bucket)
     * - NII simulation (base, +100bp, -100bp)
     * - EVE sensitivity (base, +200bp, -200bp)
     * - Duration gap
     */
    @Transactional
    public AlmGapReport generateGapReport(LocalDate reportDate, String currencyCode,
                                             BigDecimal totalRsa, BigDecimal totalRsl,
                                             List<Map<String, Object>> buckets,
                                             BigDecimal avgAssetDuration, BigDecimal avgLiabDuration) {

        BigDecimal cumulativeGap = totalRsa.subtract(totalRsl);
        BigDecimal gapRatio = totalRsl.compareTo(BigDecimal.ZERO) != 0 ?
                totalRsa.divide(totalRsl, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // NII simulation: deltaNII ≈ gap × rate_change
        BigDecimal niiBase = estimateNii(totalRsa, totalRsl, BigDecimal.ZERO);
        BigDecimal niiUp100 = estimateNii(totalRsa, totalRsl, new BigDecimal("0.01"));
        BigDecimal niiDown100 = estimateNii(totalRsa, totalRsl, new BigDecimal("-0.01"));
        BigDecimal niiSensitivity = niiUp100.subtract(niiBase);

        // EVE: deltaEVE ≈ -(duration_gap × equity × rate_change)
        BigDecimal equity = totalRsa.subtract(totalRsl);
        BigDecimal durationGap = avgAssetDuration != null && avgLiabDuration != null ?
                avgAssetDuration.subtract(avgLiabDuration.multiply(totalRsl.divide(totalRsa.max(BigDecimal.ONE), 4, RoundingMode.HALF_UP))) :
                BigDecimal.ZERO;
        BigDecimal eveBase = equity;
        BigDecimal eveUp200 = equity.subtract(durationGap.multiply(equity).multiply(new BigDecimal("0.02")));
        BigDecimal eveDown200 = equity.add(durationGap.multiply(equity).multiply(new BigDecimal("0.02")));
        BigDecimal eveSensitivity = eveUp200.subtract(eveBase);

        String generatedBy = currentActorProvider.getCurrentActor();
        AlmGapReport report = AlmGapReport.builder()
                .reportDate(reportDate).currencyCode(currencyCode)
                .buckets(buckets).totalRsa(totalRsa).totalRsl(totalRsl)
                .cumulativeGap(cumulativeGap).gapRatio(gapRatio)
                .niiBase(niiBase).niiUp100bp(niiUp100).niiDown100bp(niiDown100).niiSensitivity(niiSensitivity)
                .eveBase(eveBase).eveUp200bp(eveUp200).eveDown200bp(eveDown200).eveSensitivity(eveSensitivity)
                .weightedAvgDurationAssets(avgAssetDuration).weightedAvgDurationLiabs(avgLiabDuration)
                .durationGap(durationGap)
                .generatedBy(generatedBy).status("DRAFT").build();

        AlmGapReport saved = gapReportRepository.save(report);
        log.info("ALM gap report generated: date={}, ccy={}, gap={}, niiSensitivity={}, durationGap={}",
                reportDate, currencyCode, cumulativeGap, niiSensitivity, durationGap);
        return saved;
    }

    /**
     * Simplified NII estimation: NII = RSA × (base_rate + shift) - RSL × (base_rate + shift)
     * In production: each bucket reprices at different speeds.
     */
    private BigDecimal estimateNii(BigDecimal rsa, BigDecimal rsl, BigDecimal rateShift) {
        BigDecimal baseRate = new BigDecimal("0.05"); // 5% simplified
        BigDecimal assetIncome = rsa.multiply(baseRate.add(rateShift));
        BigDecimal liabCost = rsl.multiply(baseRate.add(rateShift).multiply(new BigDecimal("0.80"))); // Liab reprices at 80% of shift
        return assetIncome.subtract(liabCost).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public AlmGapReport approveReport(Long reportId) {
        AlmGapReport report = gapReportRepository.findById(reportId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("AlmGapReport", "id", reportId));
        report.setStatus("FINAL");
        report.setApprovedBy(currentActorProvider.getCurrentActor());
        return gapReportRepository.save(report);
    }

    public List<AlmGapReport> getReportsForDate(LocalDate date) {
        return gapReportRepository.findByReportDateOrderByCurrencyCodeAsc(date);
    }

    // Scenario management
    @Transactional
    public AlmScenario createScenario(AlmScenario scenario) { return scenarioRepository.save(scenario); }
    public List<AlmScenario> getActiveScenarios() { return scenarioRepository.findByIsActiveTrueOrderByScenarioNameAsc(); }
    public List<AlmScenario> getRegulatoryScenarios() { return scenarioRepository.findByIsRegulatoryTrueAndIsActiveTrue(); }

    /**
     * Calculate portfolio duration from securities.
     */
    public BigDecimal calculatePortfolioDuration(String portfolioCode, BigDecimal yieldRate) {
        List<SecurityHolding> holdings = holdingRepository.findByPortfolioCodeAndStatus(portfolioCode, "ACTIVE");
        if (holdings.isEmpty()) return BigDecimal.ZERO;

        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal weightedDuration = BigDecimal.ZERO;
        for (SecurityHolding h : holdings) {
            BigDecimal value = h.getMtmValue() != null ? h.getMtmValue() : h.totalCost();
            BigDecimal duration = h.calculateModifiedDuration(yieldRate);
            weightedDuration = weightedDuration.add(duration.multiply(value));
            totalValue = totalValue.add(value);
        }
        return totalValue.compareTo(BigDecimal.ZERO) > 0 ?
                weightedDuration.divide(totalValue, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }
}
