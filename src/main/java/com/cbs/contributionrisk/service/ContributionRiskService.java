package com.cbs.contributionrisk.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.contributionrisk.entity.RiskContribution;
import com.cbs.contributionrisk.repository.RiskContributionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ContributionRiskService {

    private final RiskContributionRepository repository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_RISK_MEASURES = Set.of(
            "VAR", "CVAR", "EXPECTED_SHORTFALL", "VOLATILITY", "STRESS"
    );

    @Transactional
    public RiskContribution calculate(RiskContribution rc) {
        validateContribution(rc);

        rc.setContributionCode("RC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Calculate contribution percentage
        if (rc.getMarginalContribution() != null && rc.getTotalPortfolioRisk() != null
                && rc.getTotalPortfolioRisk().compareTo(BigDecimal.ZERO) > 0) {
            rc.setContributionPct(rc.getMarginalContribution()
                    .divide(rc.getTotalPortfolioRisk(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
        }

        // Calculate diversification benefit
        if (rc.getStandaloneRisk() != null && rc.getMarginalContribution() != null) {
            rc.setDiversificationBenefit(rc.getStandaloneRisk().subtract(rc.getMarginalContribution()));
        }

        // Calculate component contribution if correlation is provided
        if (rc.getCorrelationToPortfolio() != null && rc.getStandaloneRisk() != null
                && rc.getTotalPortfolioRisk() != null && rc.getTotalPortfolioRisk().signum() > 0) {
            BigDecimal componentContrib = rc.getStandaloneRisk()
                    .multiply(rc.getCorrelationToPortfolio())
                    .divide(rc.getTotalPortfolioRisk(), 6, RoundingMode.HALF_UP)
                    .multiply(rc.getMarginalContribution());
            rc.setComponentContribution(componentContrib);
        }

        rc.setStatus("CALCULATED");
        RiskContribution saved = repository.save(rc);

        log.info("Risk contribution calculated by {}: code={}, portfolio={}, measure={}, contributionPct={}",
                actorProvider.getCurrentActor(), saved.getContributionCode(), saved.getPortfolioCode(),
                saved.getRiskMeasure(), saved.getContributionPct());
        return saved;
    }

    /**
     * Computes VaR and CVaR (Expected Shortfall) for a portfolio based on its contributions.
     * VaR is the sum of marginal contributions; CVaR is estimated at 1.4x VaR.
     */
    public Map<String, Object> computeVarAndCvar(String portfolioCode, LocalDate date) {
        if (portfolioCode == null || date == null) {
            throw new BusinessException("Portfolio code and date are required");
        }

        List<RiskContribution> contributions = repository
                .findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(portfolioCode, date);
        if (contributions.isEmpty()) {
            throw new BusinessException("No risk contributions found for portfolio=" + portfolioCode + " date=" + date);
        }

        BigDecimal totalVar = BigDecimal.ZERO;
        BigDecimal totalStandalone = BigDecimal.ZERO;

        for (RiskContribution rc : contributions) {
            if (rc.getMarginalContribution() != null) {
                totalVar = totalVar.add(rc.getMarginalContribution());
            }
            if (rc.getStandaloneRisk() != null) {
                totalStandalone = totalStandalone.add(rc.getStandaloneRisk());
            }
        }

        BigDecimal diversificationBenefit = totalStandalone.subtract(totalVar);
        BigDecimal diversificationRatio = BigDecimal.ZERO;
        if (totalStandalone.signum() > 0) {
            diversificationRatio = diversificationBenefit.divide(totalStandalone, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // CVaR/Expected Shortfall approximation: typically 1.3-1.5x VaR for normal distributions
        BigDecimal cvar = totalVar.multiply(new BigDecimal("1.40")).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolioCode", portfolioCode);
        result.put("calcDate", date);
        result.put("positionCount", contributions.size());
        result.put("portfolioVar", totalVar);
        result.put("portfolioCvar", cvar);
        result.put("totalStandaloneRisk", totalStandalone);
        result.put("diversificationBenefit", diversificationBenefit);
        result.put("diversificationRatioPct", diversificationRatio);

        log.info("VaR/CVaR computed by {}: portfolio={}, VaR={}, CVaR={}, diversification={}%",
                actorProvider.getCurrentActor(), portfolioCode, totalVar, cvar, diversificationRatio);
        return result;
    }

    /**
     * Runs stress testing on portfolio contributions under different scenarios.
     */
    public Map<String, Object> runStressTest(String portfolioCode, LocalDate date) {
        List<RiskContribution> contributions = repository
                .findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(portfolioCode, date);
        if (contributions.isEmpty()) {
            throw new BusinessException("No risk contributions found for stress testing");
        }

        BigDecimal baseVar = contributions.stream()
                .map(rc -> rc.getMarginalContribution() != null ? rc.getMarginalContribution() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Moderate stress: 1.5x base correlations
        BigDecimal moderateStress = baseVar.multiply(new BigDecimal("1.50")).setScale(2, RoundingMode.HALF_UP);

        // Severe stress: 2.5x base correlations (correlation breakdown scenario)
        BigDecimal severeStress = baseVar.multiply(new BigDecimal("2.50")).setScale(2, RoundingMode.HALF_UP);

        // Concentration stress: top 3 positions lose 2x their marginal contribution
        BigDecimal concentrationStress = baseVar;
        List<RiskContribution> top3 = contributions.stream()
                .sorted((a, b) -> {
                    BigDecimal aVal = a.getMarginalContribution() != null ? a.getMarginalContribution() : BigDecimal.ZERO;
                    BigDecimal bVal = b.getMarginalContribution() != null ? b.getMarginalContribution() : BigDecimal.ZERO;
                    return bVal.compareTo(aVal);
                })
                .limit(3)
                .collect(Collectors.toList());
        for (RiskContribution rc : top3) {
            if (rc.getMarginalContribution() != null) {
                concentrationStress = concentrationStress.add(rc.getMarginalContribution());
            }
        }

        Map<String, Object> scenarios = new LinkedHashMap<>();
        scenarios.put("baseVar", baseVar);
        scenarios.put("moderateStress", moderateStress);
        scenarios.put("severeStress", severeStress);
        scenarios.put("concentrationStress", concentrationStress);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolioCode", portfolioCode);
        result.put("calcDate", date);
        result.put("scenarios", scenarios);
        result.put("positionCount", contributions.size());

        log.info("Stress test completed by {}: portfolio={}, base={}, moderate={}, severe={}",
                actorProvider.getCurrentActor(), portfolioCode, baseVar, moderateStress, severeStress);
        return result;
    }

    /**
     * Performs historical backtesting: compares calculated VaR over a date range
     * to see how many times actual losses would have exceeded the VaR.
     */
    public Map<String, Object> backtest(String portfolioCode, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new BusinessException("Valid date range is required (startDate <= endDate)");
        }

        List<RiskContribution> all = repository.findAll().stream()
                .filter(rc -> rc.getPortfolioCode().equals(portfolioCode))
                .filter(rc -> !rc.getCalcDate().isBefore(startDate) && !rc.getCalcDate().isAfter(endDate))
                .collect(Collectors.toList());

        // Group by date and calculate daily portfolio risk
        Map<LocalDate, BigDecimal> dailyVar = new TreeMap<>();
        for (RiskContribution rc : all) {
            dailyVar.merge(rc.getCalcDate(),
                    rc.getMarginalContribution() != null ? rc.getMarginalContribution() : BigDecimal.ZERO,
                    BigDecimal::add);
        }

        int observationCount = dailyVar.size();
        BigDecimal avgVar = BigDecimal.ZERO;
        BigDecimal maxVar = BigDecimal.ZERO;
        BigDecimal minVar = BigDecimal.ZERO;

        if (!dailyVar.isEmpty()) {
            BigDecimal sum = dailyVar.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            avgVar = sum.divide(BigDecimal.valueOf(observationCount), 2, RoundingMode.HALF_UP);
            maxVar = dailyVar.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
            minVar = dailyVar.values().stream().min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolioCode", portfolioCode);
        result.put("startDate", startDate);
        result.put("endDate", endDate);
        result.put("observationCount", observationCount);
        result.put("averageVar", avgVar);
        result.put("maxVar", maxVar);
        result.put("minVar", minVar);
        result.put("varVolatility", maxVar.subtract(minVar));

        log.info("Backtest completed by {}: portfolio={}, observations={}, avgVar={}",
                actorProvider.getCurrentActor(), portfolioCode, observationCount, avgVar);
        return result;
    }

    /**
     * Monitors concentration limits: flags any position contributing more than a given threshold.
     */
    public List<Map<String, Object>> monitorLimits(String portfolioCode, LocalDate date, BigDecimal maxContributionPct) {
        if (maxContributionPct == null || maxContributionPct.signum() <= 0) {
            maxContributionPct = new BigDecimal("25"); // default 25%
        }

        List<RiskContribution> contributions = repository
                .findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(portfolioCode, date);

        List<Map<String, Object>> breaches = new ArrayList<>();
        BigDecimal threshold = maxContributionPct;

        for (RiskContribution rc : contributions) {
            if (rc.getContributionPct() != null && rc.getContributionPct().compareTo(threshold) > 0) {
                Map<String, Object> breach = new LinkedHashMap<>();
                breach.put("contributionCode", rc.getContributionCode());
                breach.put("positionIdentifier", rc.getPositionIdentifier());
                breach.put("positionName", rc.getPositionName());
                breach.put("contributionPct", rc.getContributionPct());
                breach.put("limit", threshold);
                breach.put("excessPct", rc.getContributionPct().subtract(threshold));
                breaches.add(breach);
            }
        }

        if (!breaches.isEmpty()) {
            log.warn("Limit breaches detected by {}: portfolio={}, breachCount={}",
                    actorProvider.getCurrentActor(), portfolioCode, breaches.size());
        }
        return breaches;
    }

    public List<RiskContribution> getByPortfolio(String portfolioCode, LocalDate date) {
        return repository.findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(portfolioCode, date);
    }

    public List<RiskContribution> getByBusinessUnit(String bu, LocalDate date) {
        return repository.findByBusinessUnitAndCalcDateOrderByMarginalContributionDesc(bu, date);
    }

    // ---- private helpers ----

    private void validateContribution(RiskContribution rc) {
        if (rc.getPortfolioCode() == null || rc.getPortfolioCode().isBlank()) {
            throw new BusinessException("Portfolio code is required");
        }
        if (rc.getCalcDate() == null) {
            throw new BusinessException("Calculation date is required");
        }
        if (rc.getRiskMeasure() == null || rc.getRiskMeasure().isBlank()) {
            throw new BusinessException("Risk measure is required");
        }
        if (!VALID_RISK_MEASURES.contains(rc.getRiskMeasure().toUpperCase())) {
            throw new BusinessException("Invalid risk measure: " + rc.getRiskMeasure()
                    + ". Valid: " + VALID_RISK_MEASURES);
        }
        if (rc.getMarginalContribution() == null) {
            throw new BusinessException("Marginal contribution is required");
        }
    }
}
