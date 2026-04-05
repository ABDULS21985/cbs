package com.cbs.marketrisk.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
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
public class MarketRiskService {

    private final MarketRiskPositionRepository positionRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_RISK_TYPES = Set.of(
            "INTEREST_RATE", "FX", "EQUITY", "COMMODITY", "CREDIT_SPREAD", "VOLATILITY"
    );

    private static final Set<String> VALID_VAR_METHODS = Set.of(
            "HISTORICAL", "PARAMETRIC", "MONTE_CARLO"
    );

    @Transactional
    public MarketRiskPosition recordPosition(MarketRiskPosition pos) {
        validatePosition(pos);

        // VaR utilization and limit breach calculation
        if (pos.getVarLimit() != null && pos.getVar1d99() != null && pos.getVarLimit().signum() > 0) {
            pos.setVarUtilizationPct(pos.getVar1d99().divide(pos.getVarLimit(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
            pos.setLimitBreach(pos.getVar1d99().compareTo(pos.getVarLimit()) > 0);
        }

        // Scale 1-day VaR to 10-day VaR using square root of time rule
        if (pos.getVar1d99() != null) {
            pos.setVar10d99(pos.getVar1d99().multiply(BigDecimal.valueOf(Math.sqrt(10)))
                    .setScale(2, RoundingMode.HALF_UP));
        }

        // Calculate 95% VaR from 99% VaR if not provided (approximation: VaR99/VaR95 ~ 1.41)
        if (pos.getVar1d95() == null && pos.getVar1d99() != null) {
            pos.setVar1d95(pos.getVar1d99().divide(new BigDecimal("1.41"), 2, RoundingMode.HALF_UP));
        }

        MarketRiskPosition saved = positionRepository.save(pos);

        if (Boolean.TRUE.equals(saved.getLimitBreach())) {
            log.warn("VaR LIMIT BREACH detected by {}: riskType={}, portfolio={}, VaR={}, limit={}, utilization={}%",
                    actorProvider.getCurrentActor(), pos.getRiskType(), pos.getPortfolio(),
                    pos.getVar1d99(), pos.getVarLimit(), pos.getVarUtilizationPct());
        } else {
            log.info("Market risk position recorded by {}: riskType={}, portfolio={}, VaR1d99={}",
                    actorProvider.getCurrentActor(), pos.getRiskType(), pos.getPortfolio(), pos.getVar1d99());
        }
        return saved;
    }

    /**
     * Aggregates VaR across all portfolios for a given date, with optional risk type filter.
     * Applies a diversification factor to avoid simple summation overstatement.
     */
    public Map<String, Object> aggregatePortfolioVar(LocalDate date, String riskType) {
        if (date == null) {
            throw new BusinessException("Position date is required");
        }

        List<MarketRiskPosition> positions;
        if (riskType != null && !riskType.isBlank()) {
            positions = positionRepository.findByPositionDateAndRiskTypeOrderByPortfolioAsc(date, riskType);
        } else {
            positions = positionRepository.findByPositionDateOrderByRiskTypeAscPortfolioAsc(date);
        }

        if (positions.isEmpty()) {
            throw new BusinessException("No market risk positions found for date=" + date);
        }

        BigDecimal sumVar1d99 = BigDecimal.ZERO;
        BigDecimal sumVar1d95 = BigDecimal.ZERO;
        BigDecimal sumVar10d99 = BigDecimal.ZERO;
        BigDecimal totalVarLimit = BigDecimal.ZERO;
        int breachCount = 0;

        Map<String, BigDecimal> varByRiskType = new LinkedHashMap<>();
        Map<String, BigDecimal> varByPortfolio = new LinkedHashMap<>();

        for (MarketRiskPosition pos : positions) {
            BigDecimal v99 = pos.getVar1d99() != null ? pos.getVar1d99() : BigDecimal.ZERO;
            BigDecimal v95 = pos.getVar1d95() != null ? pos.getVar1d95() : BigDecimal.ZERO;
            BigDecimal v10d = pos.getVar10d99() != null ? pos.getVar10d99() : BigDecimal.ZERO;

            sumVar1d99 = sumVar1d99.add(v99);
            sumVar1d95 = sumVar1d95.add(v95);
            sumVar10d99 = sumVar10d99.add(v10d);
            if (pos.getVarLimit() != null) totalVarLimit = totalVarLimit.add(pos.getVarLimit());
            if (Boolean.TRUE.equals(pos.getLimitBreach())) breachCount++;

            varByRiskType.merge(pos.getRiskType(), v99, BigDecimal::add);
            varByPortfolio.merge(pos.getPortfolio(), v99, BigDecimal::add);
        }

        // Apply diversification factor (assumed ~0.7 for a well-diversified portfolio)
        BigDecimal diversificationFactor = new BigDecimal("0.70");
        BigDecimal diversifiedVar1d99 = sumVar1d99.multiply(diversificationFactor).setScale(2, RoundingMode.HALF_UP);

        BigDecimal aggregateUtilization = BigDecimal.ZERO;
        if (totalVarLimit.signum() > 0) {
            aggregateUtilization = diversifiedVar1d99.divide(totalVarLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date);
        result.put("riskTypeFilter", riskType);
        result.put("positionCount", positions.size());
        result.put("undiversifiedVar1d99", sumVar1d99);
        result.put("diversifiedVar1d99", diversifiedVar1d99);
        result.put("diversificationBenefit", sumVar1d99.subtract(diversifiedVar1d99));
        result.put("var1d95", sumVar1d95);
        result.put("var10d99", sumVar10d99);
        result.put("totalVarLimit", totalVarLimit);
        result.put("aggregateUtilizationPct", aggregateUtilization);
        result.put("breachCount", breachCount);
        result.put("varByRiskType", varByRiskType);
        result.put("varByPortfolio", varByPortfolio);

        log.info("Portfolio VaR aggregated by {}: date={}, diversifiedVaR={}, breaches={}",
                actorProvider.getCurrentActor(), date, diversifiedVar1d99, breachCount);
        return result;
    }

    /**
     * Runs stress testing with predefined and custom scenarios.
     * Calculates stressed losses across all positions for a given date.
     */
    public Map<String, Object> runStressTest(LocalDate date) {
        List<MarketRiskPosition> positions = positionRepository.findByPositionDateOrderByRiskTypeAscPortfolioAsc(date);
        if (positions.isEmpty()) {
            throw new BusinessException("No market risk positions found for stress testing on date=" + date);
        }

        BigDecimal totalModerateStressLoss = BigDecimal.ZERO;
        BigDecimal totalSevereStressLoss = BigDecimal.ZERO;
        BigDecimal totalDailyPnl = BigDecimal.ZERO;

        for (MarketRiskPosition pos : positions) {
            if (pos.getStressLossModerate() != null) totalModerateStressLoss = totalModerateStressLoss.add(pos.getStressLossModerate());
            if (pos.getStressLossSevere() != null) totalSevereStressLoss = totalSevereStressLoss.add(pos.getStressLossSevere());
            if (pos.getDailyPnl() != null) totalDailyPnl = totalDailyPnl.add(pos.getDailyPnl());
        }

        // Generate scenario results
        Map<String, Object> baseScenario = new LinkedHashMap<>();
        baseScenario.put("name", "BASE");
        baseScenario.put("description", "Normal market conditions");
        baseScenario.put("estimatedLoss", totalDailyPnl.negate()); // Invert PnL as loss

        Map<String, Object> moderateScenario = new LinkedHashMap<>();
        moderateScenario.put("name", "MODERATE");
        moderateScenario.put("description", "2008-style market correction (-15% equities, +100bp rates)");
        moderateScenario.put("estimatedLoss", totalModerateStressLoss);

        Map<String, Object> severeScenario = new LinkedHashMap<>();
        severeScenario.put("name", "SEVERE");
        severeScenario.put("description", "Extreme tail event (-30% equities, +250bp rates, FX +-20%)");
        severeScenario.put("estimatedLoss", totalSevereStressLoss);

        // Reverse stress: calculate what % move causes VaR limit breach
        BigDecimal totalVarLimit = positions.stream()
                .filter(p -> p.getVarLimit() != null)
                .map(MarketRiskPosition::getVarLimit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalVar = positions.stream()
                .filter(p -> p.getVar1d99() != null)
                .map(MarketRiskPosition::getVar1d99)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> reverseStress = new LinkedHashMap<>();
        reverseStress.put("name", "REVERSE_STRESS");
        reverseStress.put("description", "Conditions that would breach aggregate VaR limit");
        if (totalVar.signum() > 0 && totalVarLimit.signum() > 0) {
            BigDecimal breakpointMultiplier = totalVarLimit.divide(totalVar, 4, RoundingMode.HALF_UP);
            reverseStress.put("breakpointMultiplier", breakpointMultiplier);
        }

        List<Map<String, Object>> scenarios = List.of(baseScenario, moderateScenario, severeScenario, reverseStress);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date);
        result.put("positionCount", positions.size());
        result.put("scenarios", scenarios);
        result.put("totalDailyPnl", totalDailyPnl);

        log.info("Stress test run by {}: date={}, moderateLoss={}, severeLoss={}",
                actorProvider.getCurrentActor(), date, totalModerateStressLoss, totalSevereStressLoss);
        return result;
    }

    /**
     * Compares current risk metrics against historical values.
     */
    public Map<String, Object> getHistoricalComparison(String portfolio, LocalDate currentDate, int lookbackDays) {
        if (lookbackDays <= 0) lookbackDays = 30;

        LocalDate startDate = currentDate.minusDays(lookbackDays);
        List<MarketRiskPosition> allPositions = positionRepository.findAll().stream()
                .filter(p -> p.getPortfolio().equals(portfolio))
                .filter(p -> !p.getPositionDate().isBefore(startDate) && !p.getPositionDate().isAfter(currentDate))
                .sorted(Comparator.comparing(MarketRiskPosition::getPositionDate))
                .collect(Collectors.toList());

        if (allPositions.isEmpty()) {
            throw new BusinessException("No historical data found for portfolio=" + portfolio);
        }

        // Calculate VaR time series
        Map<LocalDate, BigDecimal> varTimeSeries = new TreeMap<>();
        Map<LocalDate, BigDecimal> pnlTimeSeries = new TreeMap<>();

        for (MarketRiskPosition pos : allPositions) {
            varTimeSeries.merge(pos.getPositionDate(),
                    pos.getVar1d99() != null ? pos.getVar1d99() : BigDecimal.ZERO,
                    BigDecimal::add);
            pnlTimeSeries.merge(pos.getPositionDate(),
                    pos.getDailyPnl() != null ? pos.getDailyPnl() : BigDecimal.ZERO,
                    BigDecimal::add);
        }

        BigDecimal avgVar = BigDecimal.ZERO;
        BigDecimal maxVar = BigDecimal.ZERO;
        BigDecimal minVar = new BigDecimal("999999999");
        if (!varTimeSeries.isEmpty()) {
            BigDecimal sum = varTimeSeries.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            avgVar = sum.divide(BigDecimal.valueOf(varTimeSeries.size()), 2, RoundingMode.HALF_UP);
            maxVar = varTimeSeries.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
            minVar = varTimeSeries.values().stream().min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        }

        // Count VaR breaches (days where loss exceeded VaR)
        int varBreaches = 0;
        for (Map.Entry<LocalDate, BigDecimal> entry : pnlTimeSeries.entrySet()) {
            BigDecimal pnl = entry.getValue();
            BigDecimal varForDay = varTimeSeries.getOrDefault(entry.getKey(), BigDecimal.ZERO);
            if (pnl.negate().compareTo(varForDay) > 0) {
                varBreaches++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolio", portfolio);
        result.put("currentDate", currentDate);
        result.put("lookbackDays", lookbackDays);
        result.put("observationDays", varTimeSeries.size());
        result.put("averageVar", avgVar);
        result.put("maxVar", maxVar);
        result.put("minVar", minVar);
        result.put("varBreachCount", varBreaches);
        result.put("varBreachPct", varTimeSeries.isEmpty() ? BigDecimal.ZERO :
                BigDecimal.valueOf(varBreaches).divide(BigDecimal.valueOf(varTimeSeries.size()), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)));

        log.info("Historical comparison by {}: portfolio={}, avgVar={}, breaches={}/{}",
                actorProvider.getCurrentActor(), portfolio, avgVar, varBreaches, varTimeSeries.size());
        return result;
    }

    /**
     * Checks all positions for limit breaches and returns breach details with notification severity.
     */
    public List<Map<String, Object>> checkLimitBreaches(LocalDate date) {
        List<MarketRiskPosition> positions;
        if (date != null) {
            positions = positionRepository.findByPositionDateOrderByRiskTypeAscPortfolioAsc(date);
        } else {
            positions = positionRepository.findByLimitBreachTrueOrderByPositionDateDesc();
        }

        List<Map<String, Object>> breaches = new ArrayList<>();

        for (MarketRiskPosition pos : positions) {
            if (!Boolean.TRUE.equals(pos.getLimitBreach())) continue;

            String severity;
            BigDecimal utilization = pos.getVarUtilizationPct() != null ? pos.getVarUtilizationPct() : BigDecimal.ZERO;
            if (utilization.compareTo(new BigDecimal("150")) >= 0) {
                severity = "CRITICAL";
            } else if (utilization.compareTo(new BigDecimal("120")) >= 0) {
                severity = "HIGH";
            } else {
                severity = "WARNING";
            }

            Map<String, Object> breach = new LinkedHashMap<>();
            breach.put("positionDate", pos.getPositionDate());
            breach.put("riskType", pos.getRiskType());
            breach.put("portfolio", pos.getPortfolio());
            breach.put("var1d99", pos.getVar1d99());
            breach.put("varLimit", pos.getVarLimit());
            breach.put("utilizationPct", utilization);
            breach.put("excessAmount", pos.getVar1d99().subtract(pos.getVarLimit()));
            breach.put("severity", severity);
            breach.put("notificationRequired", true);
            breaches.add(breach);

            log.warn("Limit breach notification [{}]: riskType={}, portfolio={}, VaR={}, limit={}, utilization={}%",
                    severity, pos.getRiskType(), pos.getPortfolio(), pos.getVar1d99(),
                    pos.getVarLimit(), utilization);
        }

        log.info("Limit breach check by {}: date={}, breachCount={}",
                actorProvider.getCurrentActor(), date, breaches.size());
        return breaches;
    }

    public List<MarketRiskPosition> getByDate(LocalDate date) {
        return positionRepository.findByPositionDateOrderByRiskTypeAscPortfolioAsc(date);
    }

    public List<MarketRiskPosition> getBreaches() {
        return positionRepository.findByLimitBreachTrueOrderByPositionDateDesc();
    }

    // ---- private helpers ----

    private void validatePosition(MarketRiskPosition pos) {
        if (pos.getPositionDate() == null) {
            throw new BusinessException("Position date is required");
        }
        if (pos.getRiskType() == null || pos.getRiskType().isBlank()) {
            throw new BusinessException("Risk type is required");
        }
        if (!VALID_RISK_TYPES.contains(pos.getRiskType().toUpperCase())) {
            throw new BusinessException("Invalid risk type: " + pos.getRiskType() + ". Valid: " + VALID_RISK_TYPES);
        }
        if (pos.getPortfolio() == null || pos.getPortfolio().isBlank()) {
            throw new BusinessException("Portfolio is required");
        }
        if (pos.getCurrency() == null || pos.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
        if (pos.getVarMethod() != null && !VALID_VAR_METHODS.contains(pos.getVarMethod().toUpperCase())) {
            throw new BusinessException("Invalid VaR method: " + pos.getVarMethod() + ". Valid: " + VALID_VAR_METHODS);
        }
        if (pos.getVarLimit() != null && pos.getVarLimit().signum() < 0) {
            throw new BusinessException("VaR limit cannot be negative");
        }
    }
}
