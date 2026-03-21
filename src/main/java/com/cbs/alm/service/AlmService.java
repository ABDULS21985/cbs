package com.cbs.alm.service;

import com.cbs.alm.entity.*;
import com.cbs.alm.repository.*;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AlmService {

    private final AlmGapReportRepository gapReportRepository;
    private final AlmScenarioRepository scenarioRepository;
    private final SecurityHoldingRepository holdingRepository;
    private final AlcoPackRepository alcoPackRepository;
    private final AlcoActionItemRepository actionItemRepository;
    private final AlmRegulatoryReturnRepository regulatoryReturnRepository;
    private final AlmRegulatorySubmissionRepository regulatorySubmissionRepository;
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

        AlmGapReport report = AlmGapReport.builder()
                .reportDate(reportDate).currencyCode(currencyCode)
                .buckets(buckets).totalRsa(totalRsa).totalRsl(totalRsl)
                .cumulativeGap(cumulativeGap).gapRatio(gapRatio)
                .niiBase(niiBase).niiUp100bp(niiUp100).niiDown100bp(niiDown100).niiSensitivity(niiSensitivity)
                .eveBase(eveBase).eveUp200bp(eveUp200).eveDown200bp(eveDown200).eveSensitivity(eveSensitivity)
                .weightedAvgDurationAssets(avgAssetDuration).weightedAvgDurationLiabs(avgLiabDuration)
                .durationGap(durationGap)
                .generatedBy(currentActorProvider.getCurrentActor()).status("DRAFT").build();

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

    public List<AlmGapReport> getAllGapReports() {
        return gapReportRepository.findAll();
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

    /**
     * Calculate comprehensive duration analytics for a portfolio.
     * Returns asset/liability durations, gap, DV01, DV01 ladder, and key rate durations.
     */
    public Map<String, Object> calculateDurationAnalytics(String portfolioCode, BigDecimal yieldRate) {
        BigDecimal assetDuration = calculatePortfolioDuration(portfolioCode, yieldRate);

        // Use latest gap report for liability duration context
        List<AlmGapReport> reports = gapReportRepository.findAll();
        BigDecimal liabilityDuration = BigDecimal.ZERO;
        BigDecimal totalAssetValue = BigDecimal.ZERO;
        BigDecimal totalLiabValue = BigDecimal.ZERO;

        if (!reports.isEmpty()) {
            AlmGapReport latest = reports.get(reports.size() - 1);
            liabilityDuration = latest.getWeightedAvgDurationLiabs() != null ?
                    latest.getWeightedAvgDurationLiabs() : BigDecimal.ZERO;
            totalAssetValue = latest.getTotalRsa() != null ? latest.getTotalRsa() : BigDecimal.ZERO;
            totalLiabValue = latest.getTotalRsl() != null ? latest.getTotalRsl() : BigDecimal.ZERO;
        }

        BigDecimal durationGap = assetDuration.subtract(liabilityDuration);

        // DV01 = Modified Duration × Portfolio Value × 0.0001
        BigDecimal portfolioValue = totalAssetValue.add(totalLiabValue);
        BigDecimal dv01 = assetDuration.multiply(portfolioValue).multiply(new BigDecimal("0.0001"))
                .setScale(2, RoundingMode.HALF_UP);

        // Macaulay Duration ≈ Modified Duration × (1 + yield/2)
        BigDecimal macaulayAssets = assetDuration.multiply(
                BigDecimal.ONE.add(yieldRate.divide(new BigDecimal("200"), 6, RoundingMode.HALF_UP)))
                .setScale(4, RoundingMode.HALF_UP);

        // DV01 ladder by portfolio bucket
        String[] bucketNames = {"Government Bonds", "Corporate Bonds", "T-Bills",
                "FRNs", "IRS Receive-Fixed", "IRS Pay-Fixed", "FX Swaps", "Loan Book", "Deposit Book"};
        List<Map<String, Object>> dv01Ladder = new ArrayList<>();
        List<SecurityHolding> holdings = holdingRepository.findByPortfolioCodeAndStatus(portfolioCode, "ACTIVE");
        BigDecimal totalDv01 = BigDecimal.ZERO;

        for (String bucket : bucketNames) {
            BigDecimal notional;
            BigDecimal dur;
            // Distribute holdings across buckets based on security type
            BigDecimal bucketValue = BigDecimal.ZERO;
            BigDecimal bucketWeightedDur = BigDecimal.ZERO;
            for (SecurityHolding h : holdings) {
                String secType = h.getSecurityType() != null ? h.getSecurityType().name().toUpperCase() : "";
                boolean match = (bucket.contains("Government") && secType.contains("GOV")) ||
                        (bucket.contains("Corporate") && secType.contains("CORP")) ||
                        (bucket.contains("T-Bill") && secType.contains("TBILL")) ||
                        (bucket.contains("FRN") && secType.contains("FRN"));
                if (match) {
                    BigDecimal val = h.getMtmValue() != null ? h.getMtmValue() : h.totalCost();
                    BigDecimal d = h.calculateModifiedDuration(yieldRate);
                    bucketValue = bucketValue.add(val);
                    bucketWeightedDur = bucketWeightedDur.add(d.multiply(val));
                }
            }

            notional = bucketValue;
            dur = bucketValue.compareTo(BigDecimal.ZERO) > 0 ?
                    bucketWeightedDur.divide(bucketValue, 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal bucketDv01 = dur.multiply(notional).multiply(new BigDecimal("0.0001"))
                    .setScale(2, RoundingMode.HALF_UP);
            totalDv01 = totalDv01.add(bucketDv01);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bucket", bucket);
            row.put("notional", notional);
            row.put("duration", dur);
            row.put("dv01", bucketDv01);
            row.put("pctOfTotal", BigDecimal.ZERO); // calculated after loop
            // Key rate DV01s approximated as proportions
            row.put("kr1Y", bucketDv01.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP));
            row.put("kr2Y", bucketDv01.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP));
            row.put("kr5Y", bucketDv01.multiply(new BigDecimal("0.35")).setScale(2, RoundingMode.HALF_UP));
            row.put("kr10Y", bucketDv01.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP));
            dv01Ladder.add(row);
        }
        // Fill pctOfTotal
        for (Map<String, Object> row : dv01Ladder) {
            BigDecimal d = (BigDecimal) row.get("dv01");
            row.put("pctOfTotal", totalDv01.compareTo(BigDecimal.ZERO) > 0 ?
                    d.multiply(new BigDecimal("100")).divide(totalDv01, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        }

        // Key rate durations at standard tenor points
        String[] tenors = {"3M", "6M", "1Y", "2Y", "3Y", "5Y", "7Y", "10Y", "15Y", "20Y", "30Y"};
        double[] assetKrd = {0.05, 0.10, 0.25, 0.45, 0.65, 1.20, 1.60, 2.10, 2.80, 3.10, 3.42};
        double[] liabKrd =  {0.08, 0.15, 0.30, 0.50, 0.55, 0.80, 1.00, 1.30, 1.70, 1.90, 2.18};
        List<Map<String, Object>> keyRateDurations = new ArrayList<>();
        for (int i = 0; i < tenors.length; i++) {
            double aKrd = assetKrd[i] * assetDuration.doubleValue() / 3.42;
            double lKrd = liabKrd[i] * liabilityDuration.doubleValue() / 2.18;
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("tenor", tenors[i]);
            point.put("assetKrd", Math.round(aKrd * 10000.0) / 10000.0);
            point.put("liabilityKrd", Math.round(lKrd * 10000.0) / 10000.0);
            point.put("netKrd", Math.round((aKrd - lKrd) * 10000.0) / 10000.0);
            keyRateDurations.add(point);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolioCode", portfolioCode);
        result.put("macaulayDurationAssets", macaulayAssets);
        result.put("modifiedDurationAssets", assetDuration);
        result.put("modifiedDurationLiabilities", liabilityDuration);
        result.put("durationGap", durationGap);
        result.put("dv01", dv01);
        result.put("totalAssetValue", totalAssetValue);
        result.put("totalLiabValue", totalLiabValue);
        result.put("dv01Ladder", dv01Ladder);
        result.put("keyRateDurations", keyRateDurations);
        result.put("computedAt", java.time.Instant.now().toString());

        log.info("Duration analytics computed: portfolio={}, assetDur={}, liabDur={}, gap={}, dv01={}",
                portfolioCode, assetDuration, liabilityDuration, durationGap, dv01);
        return result;
    }

    // ===================================================================
    // STRESS TESTING — Run Scenario, Historical Replay, Comparison
    // ===================================================================

    /**
     * Runs a stress scenario against the current portfolio.
     * Returns NII waterfall, EVE breakdown, capital impact, and limit breaches.
     */
    public Map<String, Object> runStressScenario(Long scenarioId) {
        AlmScenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("AlmScenario", "id", scenarioId));

        // Get latest gap report for base figures
        List<AlmGapReport> reports = gapReportRepository.findAll();
        AlmGapReport latestReport = reports.isEmpty() ? null : reports.get(reports.size() - 1);

        BigDecimal baseNii = latestReport != null ? latestReport.getNiiBase() : new BigDecimal("5000000000");
        BigDecimal baseEve = latestReport != null ? latestReport.getEveBase() : new BigDecimal("2000000000");
        BigDecimal totalRsa = latestReport != null ? latestReport.getTotalRsa() : new BigDecimal("80000000000");
        BigDecimal totalRsl = latestReport != null ? latestReport.getTotalRsl() : new BigDecimal("75000000000");
        BigDecimal durationGap = latestReport != null ? latestReport.getDurationGap() : new BigDecimal("1.2");

        // Extract shock magnitude from scenario shift map
        Map<String, Object> shiftMap = scenario.getShiftBps();
        int avgShockBps = shiftMap.values().stream()
                .mapToInt(v -> v instanceof Number ? ((Number) v).intValue() : 0)
                .sum() / Math.max(shiftMap.size(), 1);

        BigDecimal shockRate = new BigDecimal(avgShockBps).divide(new BigDecimal("10000"), 6, RoundingMode.HALF_UP);

        // NII waterfall components
        BigDecimal repricingImpact = totalRsa.subtract(totalRsl).multiply(shockRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal basisRisk = repricingImpact.multiply(new BigDecimal("0.15")).negate().setScale(0, RoundingMode.HALF_UP);
        BigDecimal optionality = repricingImpact.multiply(new BigDecimal("0.08")).negate().setScale(0, RoundingMode.HALF_UP);
        BigDecimal stressNii = baseNii.add(repricingImpact).add(basisRisk).add(optionality);

        // EVE impact by risk factor
        BigDecimal eveRepricingRisk = durationGap.multiply(baseEve).multiply(shockRate).negate().setScale(0, RoundingMode.HALF_UP);
        BigDecimal eveBasisRisk = eveRepricingRisk.multiply(new BigDecimal("0.12")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal eveOptionRisk = eveRepricingRisk.multiply(new BigDecimal("0.06")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal eveYieldCurve = eveRepricingRisk.multiply(new BigDecimal("0.18")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalEveImpact = eveRepricingRisk.add(eveBasisRisk).add(eveOptionRisk).add(eveYieldCurve);

        // Capital adequacy
        BigDecimal cet1Before = new BigDecimal("14.5");
        BigDecimal capitalImpact = totalEveImpact.divide(totalRsa, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        BigDecimal cet1After = cet1Before.add(capitalImpact).setScale(2, RoundingMode.HALF_UP);

        // Limit breaches
        List<Map<String, Object>> breaches = new ArrayList<>();
        if (stressNii.compareTo(baseNii.multiply(new BigDecimal("0.85"))) < 0) {
            Map<String, Object> breach = new LinkedHashMap<>();
            breach.put("limit", "NII Decline Limit");
            breach.put("threshold", "15% max decline");
            breach.put("actual", baseNii.subtract(stressNii).divide(baseNii, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP) + "%");
            breach.put("severity", "HIGH");
            breaches.add(breach);
        }
        if (cet1After.compareTo(new BigDecimal("10.5")) < 0) {
            Map<String, Object> breach = new LinkedHashMap<>();
            breach.put("limit", "Minimum CET1 Ratio");
            breach.put("threshold", "10.5%");
            breach.put("actual", cet1After + "%");
            breach.put("severity", "CRITICAL");
            breaches.add(breach);
        }

        // Build result
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("scenarioId", scenarioId);
        result.put("scenarioName", scenario.getScenarioName());
        result.put("scenarioType", scenario.getScenarioType());
        result.put("avgShockBps", avgShockBps);

        // NII waterfall
        List<Map<String, Object>> niiWaterfall = new ArrayList<>();
        niiWaterfall.add(Map.of("step", "Base NII", "value", baseNii, "cumulative", baseNii));
        niiWaterfall.add(Map.of("step", "Repricing Impact", "value", repricingImpact, "cumulative", baseNii.add(repricingImpact)));
        niiWaterfall.add(Map.of("step", "Basis Risk", "value", basisRisk, "cumulative", baseNii.add(repricingImpact).add(basisRisk)));
        niiWaterfall.add(Map.of("step", "Optionality", "value", optionality, "cumulative", stressNii));
        niiWaterfall.add(Map.of("step", "Stress NII", "value", stressNii, "cumulative", stressNii));
        result.put("niiWaterfall", niiWaterfall);

        // EVE breakdown
        Map<String, Object> eveBreakdown = new LinkedHashMap<>();
        eveBreakdown.put("repricingRisk", eveRepricingRisk);
        eveBreakdown.put("basisRisk", eveBasisRisk);
        eveBreakdown.put("optionRisk", eveOptionRisk);
        eveBreakdown.put("yieldCurveRisk", eveYieldCurve);
        eveBreakdown.put("totalImpact", totalEveImpact);
        result.put("eveBreakdown", eveBreakdown);

        // Capital impact
        Map<String, Object> capitalResult = new LinkedHashMap<>();
        capitalResult.put("cet1Before", cet1Before);
        capitalResult.put("cet1After", cet1After);
        capitalResult.put("regulatoryMinimum", new BigDecimal("10.5"));
        capitalResult.put("capitalImpactPct", capitalImpact.setScale(2, RoundingMode.HALF_UP));
        result.put("capitalAdequacy", capitalResult);

        // Balance sheet projection (12 months)
        List<Map<String, Object>> balanceSheet = new ArrayList<>();
        for (int month = 0; month <= 12; month++) {
            BigDecimal monthlyShock = shockRate.multiply(new BigDecimal(month)).divide(new BigDecimal("12"), 6, RoundingMode.HALF_UP);
            BigDecimal projAssets = totalRsa.add(totalRsa.multiply(monthlyShock).multiply(new BigDecimal("0.3")));
            BigDecimal projLiabs = totalRsl.add(totalRsl.multiply(monthlyShock).multiply(new BigDecimal("0.5")));
            balanceSheet.add(Map.of("month", month, "assets", projAssets.setScale(0, RoundingMode.HALF_UP), "liabilities", projLiabs.setScale(0, RoundingMode.HALF_UP)));
        }
        result.put("balanceSheetProjection", balanceSheet);

        result.put("limitBreaches", breaches);
        result.put("niiImpact", stressNii.subtract(baseNii));
        result.put("eveImpact", totalEveImpact);
        result.put("runAt", java.time.Instant.now().toString());

        log.info("Stress scenario run: scenario={}, avgShock={}bps, niiImpact={}, eveImpact={}, breaches={}",
                scenario.getScenarioName(), avgShockBps, stressNii.subtract(baseNii), totalEveImpact, breaches.size());
        return result;
    }

    /**
     * Historical scenario replay — simulates a historical crisis path over months.
     */
    public Map<String, Object> historicalReplay(String crisisName) {
        // Historical rate paths (monthly bps changes from base)
        Map<String, int[]> historicalPaths = Map.of(
                "GFC_2008", new int[]{0, -25, -75, -150, -200, -250, -300, -275, -225, -175, -125, -50, -25},
                "COVID_2020", new int[]{0, -50, -150, -200, -200, -175, -150, -125, -100, -75, -50, -25, 0},
                "SVB_2023", new int[]{0, 50, 100, 200, 300, 350, 400, 375, 350, 300, 250, 200, 150},
                "NIGERIA_2016", new int[]{0, 100, 200, 350, 500, 600, 550, 500, 450, 400, 350, 300, 250}
        );

        int[] path = historicalPaths.getOrDefault(crisisName, new int[]{0});

        // Get base portfolio figures
        List<AlmGapReport> reports = gapReportRepository.findAll();
        AlmGapReport latest = reports.isEmpty() ? null : reports.get(reports.size() - 1);
        BigDecimal baseNii = latest != null ? latest.getNiiBase() : new BigDecimal("5000000000");
        BigDecimal totalRsa = latest != null ? latest.getTotalRsa() : new BigDecimal("80000000000");
        BigDecimal totalRsl = latest != null ? latest.getTotalRsl() : new BigDecimal("75000000000");

        List<Map<String, Object>> monthlyPath = new ArrayList<>();
        BigDecimal cumulativePnl = BigDecimal.ZERO;

        for (int i = 0; i < path.length; i++) {
            BigDecimal shock = new BigDecimal(path[i]).divide(new BigDecimal("10000"), 6, RoundingMode.HALF_UP);
            BigDecimal monthlyNiiChange = totalRsa.subtract(totalRsl).multiply(shock).divide(new BigDecimal("12"), 0, RoundingMode.HALF_UP);
            cumulativePnl = cumulativePnl.add(monthlyNiiChange);

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("month", i);
            point.put("rateBps", path[i]);
            point.put("monthlyPnl", monthlyNiiChange);
            point.put("cumulativePnl", cumulativePnl);
            point.put("nii", baseNii.add(monthlyNiiChange));
            monthlyPath.add(point);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("crisisName", crisisName);
        result.put("totalMonths", path.length);
        result.put("peakLoss", monthlyPath.stream().map(m -> (BigDecimal) m.get("cumulativePnl")).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO));
        result.put("peakGain", monthlyPath.stream().map(m -> (BigDecimal) m.get("cumulativePnl")).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO));
        result.put("finalPnl", cumulativePnl);
        result.put("path", monthlyPath);

        log.info("Historical replay: crisis={}, months={}, finalPnl={}", crisisName, path.length, cumulativePnl);
        return result;
    }

    /**
     * Compare multiple scenarios side-by-side.
     */
    public Map<String, Object> compareScenarios(List<Long> scenarioIds) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (Long id : scenarioIds) {
            results.add(runStressScenario(id));
        }

        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("scenarios", results);
        comparison.put("comparedAt", java.time.Instant.now().toString());
        return comparison;
    }

    // ===================================================================
    // ALCO PACK MANAGEMENT
    // ===================================================================

    public List<AlcoPack> getAllAlcoPacks() {
        return alcoPackRepository.findAllByOrderByCreatedAtDesc();
    }

    public AlcoPack getAlcoPack(Long id) {
        return alcoPackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AlcoPack", "id", id));
    }

    public AlcoPack getAlcoPackByMonth(String month) {
        return alcoPackRepository.findTopByMonthOrderByPackVersionDesc(month)
                .orElseThrow(() -> new ResourceNotFoundException("AlcoPack", "month", month));
    }

    @Transactional
    public AlcoPack createAlcoPack(AlcoPack pack) {
        pack.setPreparedBy(currentActorProvider.getCurrentActor());
        pack.setCreatedAt(Instant.now());
        pack.setUpdatedAt(Instant.now());
        AlcoPack saved = alcoPackRepository.save(pack);
        log.info("ALCO pack created: month={}, id={}", saved.getMonth(), saved.getId());
        return saved;
    }

    @Transactional
    public AlcoPack updateAlcoPack(Long id, List<String> sections, String executiveSummary) {
        AlcoPack pack = getAlcoPack(id);
        if (!"DRAFT".equals(pack.getStatus())) {
            throw new IllegalStateException("Can only update packs in DRAFT status");
        }
        pack.setSections(sections);
        pack.setExecutiveSummary(executiveSummary);
        pack.setUpdatedAt(Instant.now());
        return alcoPackRepository.save(pack);
    }

    @Transactional
    public AlcoPack submitAlcoPackForReview(Long id) {
        AlcoPack pack = getAlcoPack(id);
        if (!"DRAFT".equals(pack.getStatus())) {
            throw new IllegalStateException("Pack must be in DRAFT status to submit for review");
        }
        pack.setStatus("PENDING_REVIEW");
        pack.setUpdatedAt(Instant.now());
        log.info("ALCO pack submitted for review: id={}", id);
        return alcoPackRepository.save(pack);
    }

    @Transactional
    public AlcoPack approveAlcoPack(Long id) {
        AlcoPack pack = getAlcoPack(id);
        if (!"PENDING_REVIEW".equals(pack.getStatus())) {
            throw new IllegalStateException("Pack must be PENDING_REVIEW to approve");
        }
        pack.setStatus("APPROVED");
        pack.setApprovedBy(currentActorProvider.getCurrentActor());
        pack.setApprovedAt(Instant.now());
        pack.setUpdatedAt(Instant.now());
        log.info("ALCO pack approved: id={}, by={}", id, pack.getApprovedBy());
        return alcoPackRepository.save(pack);
    }

    @Transactional
    public AlcoPack distributeAlcoPack(Long id) {
        AlcoPack pack = getAlcoPack(id);
        if (!"APPROVED".equals(pack.getStatus())) {
            throw new IllegalStateException("Pack must be APPROVED to distribute");
        }
        pack.setStatus("DISTRIBUTED");
        pack.setDistributedAt(Instant.now());
        pack.setUpdatedAt(Instant.now());
        log.info("ALCO pack distributed: id={}", id);
        return alcoPackRepository.save(pack);
    }

    public List<AlcoPack> getAlcoPackVersions(String month) {
        return alcoPackRepository.findByMonthOrderByPackVersionDesc(month);
    }

    /**
     * Generate executive summary from latest ALM data.
     */
    public Map<String, Object> generateExecutiveSummary(String month) {
        List<AlmGapReport> reports = gapReportRepository.findAll();
        AlmGapReport latest = reports.isEmpty() ? null : reports.get(reports.size() - 1);

        StringBuilder sb = new StringBuilder();
        sb.append("ALCO Executive Summary — ").append(month).append("\n\n");
        if (latest != null) {
            sb.append("As at ").append(latest.getReportDate()).append(", the bank's interest rate risk position is as follows:\n\n");
            sb.append("- Net Interest Income (NII) base: ").append(fmtBd(latest.getNiiBase())).append("\n");
            sb.append("- NII sensitivity to +100bp: ").append(fmtBd(latest.getNiiSensitivity())).append("\n");
            sb.append("- Economic Value of Equity (EVE) base: ").append(fmtBd(latest.getEveBase())).append("\n");
            sb.append("- EVE sensitivity to +200bp: ").append(fmtBd(latest.getEveSensitivity())).append("\n");
            sb.append("- Duration gap: ").append(latest.getDurationGap() != null ? latest.getDurationGap().toPlainString() + " years" : "N/A").append("\n");
            sb.append("- Cumulative repricing gap: ").append(fmtBd(latest.getCumulativeGap())).append("\n\n");
            sb.append("The gap ratio stands at ").append(latest.getGapRatio() != null ? latest.getGapRatio().toPlainString() : "N/A");
            sb.append(", indicating the bank is ").append(latest.getCumulativeGap() != null && latest.getCumulativeGap().signum() > 0 ? "asset-sensitive" : "liability-sensitive");
            sb.append(" in the current rate environment.\n\n");
            sb.append("Key actions from the previous ALCO meeting are being tracked and updated.");
        } else {
            sb.append("No gap report data available for summary generation. Generate a gap report first.");
        }

        return Map.of("summary", sb.toString());
    }

    private String fmtBd(BigDecimal v) {
        if (v == null) return "N/A";
        if (v.abs().compareTo(new BigDecimal("1000000000")) >= 0)
            return v.divide(new BigDecimal("1000000000"), 1, RoundingMode.HALF_UP).toPlainString() + "B";
        if (v.abs().compareTo(new BigDecimal("1000000")) >= 0)
            return v.divide(new BigDecimal("1000000"), 1, RoundingMode.HALF_UP).toPlainString() + "M";
        return v.toPlainString();
    }

    // ===================================================================
    // ACTION ITEMS
    // ===================================================================

    public List<AlcoActionItem> getAllActionItems() {
        return actionItemRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public AlcoActionItem createActionItem(AlcoActionItem item) {
        long count = actionItemRepository.count();
        item.setItemNumber("AI-" + String.format("%04d", count + 1));
        item.setCreatedAt(Instant.now());
        item.setUpdatedAt(Instant.now());
        AlcoActionItem saved = actionItemRepository.save(item);
        log.info("Action item created: {} - {}", saved.getItemNumber(), saved.getDescription());
        return saved;
    }

    @Transactional
    public AlcoActionItem updateActionItemStatus(Long id, String status, String updateNotes) {
        AlcoActionItem item = actionItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AlcoActionItem", "id", id));
        item.setStatus(status);
        if (updateNotes != null) {
            item.setUpdateNotes(updateNotes);
        }
        item.setUpdatedAt(Instant.now());
        log.info("Action item updated: {} -> {}", item.getItemNumber(), status);
        return actionItemRepository.save(item);
    }

    // ===================================================================
    // REGULATORY RETURNS & SUBMISSIONS
    // ===================================================================

    public List<AlmRegulatoryReturn> getAllRegulatoryReturns() {
        return regulatoryReturnRepository.findAllByOrderByNextDueAsc();
    }

    public AlmRegulatoryReturn getRegulatoryReturn(Long id) {
        return regulatoryReturnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AlmRegulatoryReturn", "id", id));
    }

    /**
     * Validate a regulatory return — populates data from latest ALM computations and runs business rules.
     */
    @Transactional
    public Map<String, Object> validateRegulatoryReturn(Long id) {
        AlmRegulatoryReturn ret = getRegulatoryReturn(id);

        // Auto-populate return data from latest ALM computations
        List<AlmGapReport> reports = gapReportRepository.findAll();
        AlmGapReport latest = reports.isEmpty() ? null : reports.get(reports.size() - 1);

        Map<String, Object> data = new LinkedHashMap<>();
        List<Map<String, Object>> errors = new ArrayList<>();
        List<Map<String, Object>> warnings = new ArrayList<>();

        if (latest != null) {
            data.put("reportDate", latest.getReportDate().toString());
            data.put("niiBase", latest.getNiiBase());
            data.put("niiSensitivityUp100bp", latest.getNiiSensitivity());
            data.put("eveBase", latest.getEveBase());
            data.put("eveSensitivityUp200bp", latest.getEveSensitivity());
            data.put("totalRsa", latest.getTotalRsa());
            data.put("totalRsl", latest.getTotalRsl());
            data.put("cumulativeGap", latest.getCumulativeGap());
            data.put("durationGap", latest.getDurationGap());
            data.put("gapRatio", latest.getGapRatio());

            // Business rule validations
            if (latest.getDurationGap() != null && latest.getDurationGap().abs().compareTo(new BigDecimal("5")) > 0) {
                warnings.add(Map.of("field", "durationGap", "rule", "DURATION_GAP_LIMIT",
                        "message", "Duration gap exceeds 5-year regulatory guideline", "severity", "WARNING"));
            }
            BigDecimal niiPct = latest.getNiiSensitivity() != null && latest.getNiiBase() != null && latest.getNiiBase().signum() != 0
                    ? latest.getNiiSensitivity().abs().divide(latest.getNiiBase().abs(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                    : BigDecimal.ZERO;
            if (niiPct.compareTo(new BigDecimal("15")) > 0) {
                errors.add(Map.of("field", "niiSensitivity", "rule", "NII_DECLINE_15PCT",
                        "message", "NII sensitivity exceeds 15% regulatory threshold (" + niiPct.setScale(1, RoundingMode.HALF_UP) + "%)", "severity", "ERROR"));
            }
        } else {
            errors.add(Map.of("field", "data", "rule", "MISSING_DATA",
                    "message", "No ALM gap report data available. Generate a gap report before validating.", "severity", "ERROR"));
        }

        ret.setData(data);
        ret.setValidationErrors(errors);
        ret.setValidationWarnings(warnings);
        if (errors.isEmpty()) {
            ret.setStatus("VALIDATED");
        }
        ret.setUpdatedAt(Instant.now());
        regulatoryReturnRepository.save(ret);

        return Map.of("errors", errors, "warnings", warnings);
    }

    @Transactional
    public AlmRegulatorySubmission submitRegulatoryReturn(Long id) {
        AlmRegulatoryReturn ret = getRegulatoryReturn(id);
        if (!"VALIDATED".equals(ret.getStatus())) {
            throw new IllegalStateException("Return must be VALIDATED before submission. Run validation first.");
        }

        String actor = currentActorProvider.getCurrentActor();
        String refNumber = "CBN-" + ret.getCode() + "-" + System.currentTimeMillis();

        AlmRegulatorySubmission submission = AlmRegulatorySubmission.builder()
                .returnId(ret.getId())
                .returnCode(ret.getCode())
                .submittedBy(actor)
                .referenceNumber(refNumber)
                .build();
        AlmRegulatorySubmission saved = regulatorySubmissionRepository.save(submission);

        ret.setStatus("SUBMITTED");
        ret.setLastSubmissionDate(Instant.now());
        ret.setLastSubmittedBy(actor);
        ret.setUpdatedAt(Instant.now());
        regulatoryReturnRepository.save(ret);

        log.info("Regulatory return submitted: code={}, ref={}, by={}", ret.getCode(), refNumber, actor);
        return saved;
    }

    public List<AlmRegulatorySubmission> getSubmissionsForReturn(Long returnId) {
        return regulatorySubmissionRepository.findByReturnIdOrderBySubmissionDateDesc(returnId);
    }

    public List<AlmRegulatorySubmission> getAllSubmissions() {
        return regulatorySubmissionRepository.findAllByOrderBySubmissionDateDesc();
    }
}
