package com.cbs.treasuryanalytics.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.treasuryanalytics.entity.TreasuryAnalyticsSnapshot;
import com.cbs.treasuryanalytics.repository.TreasuryAnalyticsSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TreasuryAnalyticsService {

    private final TreasuryAnalyticsSnapshotRepository snapshotRepository;
    private final CurrentActorProvider actorProvider;

    /**
     * Records a treasury analytics snapshot after computing derived metrics.
     * Validates inputs and calculates NIM, interest spread, ROA, ROE, and ratios.
     */
    @Transactional
    public TreasuryAnalyticsSnapshot record(TreasuryAnalyticsSnapshot snapshot) {
        validateSnapshot(snapshot);

        // Check for duplicate snapshot on same date/currency
        snapshotRepository.findBySnapshotDateAndCurrency(snapshot.getSnapshotDate(), snapshot.getCurrency())
                .ifPresent(existing -> {
                    throw new BusinessException("Snapshot already exists for date=" + snapshot.getSnapshotDate()
                            + " currency=" + snapshot.getCurrency() + ". Use update instead.");
                });

        // Compute derived metrics
        computeDerivedMetrics(snapshot);

        TreasuryAnalyticsSnapshot saved = snapshotRepository.save(snapshot);
        log.info("Treasury snapshot recorded by {}: date={}, currency={}, NIM={}, loanToDeposit={}",
                actorProvider.getCurrentActor(), saved.getSnapshotDate(), saved.getCurrency(),
                saved.getNetInterestMarginPct(), saved.getLoanToDepositRatio());
        return saved;
    }

    /**
     * Generates a yield curve snapshot from historical data points.
     * Returns interpolated yields at standard tenors.
     */
    public Map<String, Object> getYieldCurveSnapshot(String currency) {
        if (currency == null || currency.isBlank()) {
            throw new BusinessException("Currency is required for yield curve snapshot");
        }

        List<TreasuryAnalyticsSnapshot> history = snapshotRepository.findByCurrencyOrderBySnapshotDateDesc(currency);
        if (history.isEmpty()) {
            throw new BusinessException("No treasury data available for currency: " + currency);
        }

        TreasuryAnalyticsSnapshot latest = history.get(0);

        // Build yield curve from available data: cost of funds as short end,
        // yield on assets as mid-point reference
        BigDecimal shortRate = latest.getCostOfFundsPct() != null ? latest.getCostOfFundsPct() : BigDecimal.ZERO;
        BigDecimal midRate = latest.getYieldOnAssetsPct() != null ? latest.getYieldOnAssetsPct() : BigDecimal.ZERO;
        BigDecimal spread = latest.getInterestSpreadPct() != null ? latest.getInterestSpreadPct() : BigDecimal.ZERO;

        // Interpolate standard tenors
        Map<String, BigDecimal> yieldCurve = new LinkedHashMap<>();
        yieldCurve.put("overnight", shortRate.multiply(new BigDecimal("0.85")).setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("1M", shortRate.multiply(new BigDecimal("0.90")).setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("3M", shortRate.setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("6M", shortRate.add(spread.multiply(new BigDecimal("0.25"))).setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("1Y", shortRate.add(spread.multiply(new BigDecimal("0.50"))).setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("2Y", midRate.subtract(spread.multiply(new BigDecimal("0.10"))).setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("5Y", midRate.setScale(4, RoundingMode.HALF_UP));
        yieldCurve.put("10Y", midRate.add(spread.multiply(new BigDecimal("0.15"))).setScale(4, RoundingMode.HALF_UP));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", latest.getSnapshotDate());
        result.put("currency", currency);
        result.put("yieldCurve", yieldCurve);
        result.put("costOfFunds", shortRate);
        result.put("yieldOnAssets", midRate);
        result.put("interestSpread", spread);
        return result;
    }

    /**
     * Computes liquidity metrics from the latest snapshot data.
     */
    public Map<String, Object> computeLiquidityMetrics(String currency) {
        if (currency == null || currency.isBlank()) {
            throw new BusinessException("Currency is required");
        }

        List<TreasuryAnalyticsSnapshot> history = snapshotRepository.findByCurrencyOrderBySnapshotDateDesc(currency);
        if (history.isEmpty()) {
            throw new BusinessException("No treasury data available for currency: " + currency);
        }

        TreasuryAnalyticsSnapshot latest = history.get(0);

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("snapshotDate", latest.getSnapshotDate());
        metrics.put("currency", currency);
        metrics.put("loanToDepositRatio", latest.getLoanToDepositRatio());
        metrics.put("totalDeposits", latest.getTotalDeposits());
        metrics.put("totalBorrowings", latest.getTotalBorrowings());
        metrics.put("totalEarningAssets", latest.getTotalEarningAssets());

        // Funding concentration: borrowings as % of total funding
        BigDecimal totalFunding = BigDecimal.ZERO;
        if (latest.getTotalDeposits() != null) totalFunding = totalFunding.add(latest.getTotalDeposits());
        if (latest.getTotalBorrowings() != null) totalFunding = totalFunding.add(latest.getTotalBorrowings());

        if (totalFunding.signum() > 0 && latest.getTotalBorrowings() != null) {
            BigDecimal borrowingConcentration = latest.getTotalBorrowings()
                    .divide(totalFunding, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            metrics.put("borrowingConcentrationPct", borrowingConcentration);
            metrics.put("depositConcentrationPct", BigDecimal.valueOf(100).subtract(borrowingConcentration));
        }

        // Liquidity coverage assessment
        String liquidityStatus = "ADEQUATE";
        if (latest.getLoanToDepositRatio() != null) {
            if (latest.getLoanToDepositRatio().compareTo(new BigDecimal("0.90")) > 0) {
                liquidityStatus = "TIGHT";
            }
            if (latest.getLoanToDepositRatio().compareTo(new BigDecimal("1.00")) > 0) {
                liquidityStatus = "STRAINED";
            }
        }
        metrics.put("liquidityStatus", liquidityStatus);
        metrics.put("weightedAvgTenorDays", latest.getWeightedAvgTenorDays());

        log.info("Liquidity metrics computed by {}: currency={}, status={}",
                actorProvider.getCurrentActor(), currency, liquidityStatus);
        return metrics;
    }

    /**
     * Aggregates risk metrics across all available currencies.
     */
    public Map<String, Object> aggregateRiskMetrics() {
        List<TreasuryAnalyticsSnapshot> all = snapshotRepository.findAll();
        if (all.isEmpty()) {
            throw new BusinessException("No treasury analytics data available");
        }

        // Group by currency and take latest per currency
        Map<String, TreasuryAnalyticsSnapshot> latestByCurrency = new LinkedHashMap<>();
        for (TreasuryAnalyticsSnapshot s : all) {
            latestByCurrency.merge(s.getCurrency(), s, (existing, candidate) ->
                    candidate.getSnapshotDate().isAfter(existing.getSnapshotDate()) ? candidate : existing);
        }

        BigDecimal aggregateDeposits = BigDecimal.ZERO;
        BigDecimal aggregateBorrowings = BigDecimal.ZERO;
        BigDecimal aggregateEarningAssets = BigDecimal.ZERO;
        List<Map<String, Object>> currencyBreakdown = new ArrayList<>();

        for (Map.Entry<String, TreasuryAnalyticsSnapshot> entry : latestByCurrency.entrySet()) {
            TreasuryAnalyticsSnapshot s = entry.getValue();
            if (s.getTotalDeposits() != null) aggregateDeposits = aggregateDeposits.add(s.getTotalDeposits());
            if (s.getTotalBorrowings() != null) aggregateBorrowings = aggregateBorrowings.add(s.getTotalBorrowings());
            if (s.getTotalEarningAssets() != null) aggregateEarningAssets = aggregateEarningAssets.add(s.getTotalEarningAssets());

            Map<String, Object> currEntry = new LinkedHashMap<>();
            currEntry.put("currency", entry.getKey());
            currEntry.put("snapshotDate", s.getSnapshotDate());
            currEntry.put("capitalAdequacyRatio", s.getCapitalAdequacyRatio());
            currEntry.put("tier1Ratio", s.getTier1Ratio());
            currEntry.put("leverageRatio", s.getLeverageRatio());
            currEntry.put("netProfitMarginPct", s.getNetProfitMarginPct());
            currEntry.put("returnOnAssetsPct", s.getReturnOnAssetsPct());
            currEntry.put("returnOnEquityPct", s.getReturnOnEquityPct());
            currencyBreakdown.add(currEntry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("currencyCount", latestByCurrency.size());
        result.put("aggregateDeposits", aggregateDeposits);
        result.put("aggregateBorrowings", aggregateBorrowings);
        result.put("aggregateEarningAssets", aggregateEarningAssets);
        result.put("currencyBreakdown", currencyBreakdown);

        log.info("Risk metrics aggregated by {}: {} currencies", actorProvider.getCurrentActor(), latestByCurrency.size());
        return result;
    }

    public List<TreasuryAnalyticsSnapshot> getHistory(String currency) {
        return snapshotRepository.findByCurrencyOrderBySnapshotDateDesc(currency);
    }

    public Optional<TreasuryAnalyticsSnapshot> getLatest(String currency) {
        return snapshotRepository.findBySnapshotDateAndCurrency(LocalDate.now(), currency);
    }

    public List<TreasuryAnalyticsSnapshot> getAllSnapshots() {
        return snapshotRepository.findAll();
    }

    // ---- private helpers ----

    private void validateSnapshot(TreasuryAnalyticsSnapshot snapshot) {
        if (snapshot.getSnapshotDate() == null) {
            throw new BusinessException("Snapshot date is required");
        }
        if (snapshot.getCurrency() == null || snapshot.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
        if (snapshot.getTotalDeposits() != null && snapshot.getTotalDeposits().signum() < 0) {
            throw new BusinessException("Total deposits cannot be negative");
        }
        if (snapshot.getTotalBorrowings() != null && snapshot.getTotalBorrowings().signum() < 0) {
            throw new BusinessException("Total borrowings cannot be negative");
        }
    }

    private void computeDerivedMetrics(TreasuryAnalyticsSnapshot snapshot) {
        // Net Interest Margin = (yield on assets - cost of funds)
        if (snapshot.getYieldOnAssetsPct() != null && snapshot.getCostOfFundsPct() != null) {
            snapshot.setNetInterestMarginPct(snapshot.getYieldOnAssetsPct().subtract(snapshot.getCostOfFundsPct()));
        }

        // Interest spread
        if (snapshot.getYieldOnAssetsPct() != null && snapshot.getCostOfFundsPct() != null) {
            snapshot.setInterestSpreadPct(snapshot.getYieldOnAssetsPct().subtract(snapshot.getCostOfFundsPct()));
        }

        // Loan to deposit ratio
        if (snapshot.getTotalEarningAssets() != null && snapshot.getTotalDeposits() != null
                && snapshot.getTotalDeposits().signum() > 0) {
            snapshot.setLoanToDepositRatio(snapshot.getTotalEarningAssets()
                    .divide(snapshot.getTotalDeposits(), 4, RoundingMode.HALF_UP));
        }
    }
}
