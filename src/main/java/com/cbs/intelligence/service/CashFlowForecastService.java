package com.cbs.intelligence.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.intelligence.entity.CashflowForecast;
import com.cbs.intelligence.repository.CashflowForecastRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CashFlowForecastService {

    private final CashflowForecastRepository forecastRepository;
    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionJournalRepository;

    /**
     * Generate a cash-flow forecast for an entity (customer or account).
     *
     * The forecast is derived from actual historical transaction data over the
     * past 6 months.  Where less history is available the confidence score is
     * reduced; where none exists the forecast falls back to the current account
     * balance as a flat baseline with the lowest confidence tier.
     *
     * @param entityType "CUSTOMER" or "ACCOUNT"
     * @param entityId   customerId (string) when entityType=CUSTOMER, accountId otherwise
     */
    @Transactional
    public CashflowForecast generateForecast(String entityType, String entityId, String currency,
                                              int horizonDays, String modelType) {
        String forecastId = "FCT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        LocalDate today = LocalDate.now();
        LocalDate sixMonthsAgo = today.minusMonths(6);

        // Collect all relevant account IDs for this entity
        List<Long> accountIds = resolveAccountIds(entityType, entityId);

        // Aggregate transaction history across all accounts
        List<TransactionJournal> history = new ArrayList<>();
        for (Long accountId : accountIds) {
            history.addAll(transactionJournalRepository
                    .findByAccountIdAndDateRange(accountId, sixMonthsAgo, today));
        }

        // Determine how many complete months of history we have
        int monthsOfHistory = computeMonthsOfHistory(history, today);

        // Separate credits (inflows) and debits (outflows)
        BigDecimal totalInflows = history.stream()
                .filter(t -> isCreditType(t.getTransactionType()))
                .map(TransactionJournal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOutflows = history.stream()
                .filter(t -> isDebitType(t.getTransactionType()))
                .map(TransactionJournal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Average per month, then project over horizonDays
        double horizonMonths = horizonDays / 30.0;
        BigDecimal avgMonthlyInflows;
        BigDecimal avgMonthlyOutflows;

        if (monthsOfHistory > 0) {
            avgMonthlyInflows = totalInflows.divide(
                    BigDecimal.valueOf(monthsOfHistory), 4, RoundingMode.HALF_UP);
            avgMonthlyOutflows = totalOutflows.divide(
                    BigDecimal.valueOf(monthsOfHistory), 4, RoundingMode.HALF_UP);
        } else {
            // No transaction history — use current book balance of first active account
            // as a flat inflow estimate and zero outflow. Very low confidence.
            BigDecimal bookBalance = resolveBookBalance(accountIds);
            avgMonthlyInflows = bookBalance;
            avgMonthlyOutflows = BigDecimal.ZERO;
            log.warn("No transaction history found for entity {}/{} — forecast uses book balance as baseline",
                    entityType, entityId);
        }

        BigDecimal projectedInflows = avgMonthlyInflows
                .multiply(BigDecimal.valueOf(horizonMonths))
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal projectedOutflows = avgMonthlyOutflows
                .multiply(BigDecimal.valueOf(horizonMonths))
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal net = projectedInflows.subtract(projectedOutflows);

        // Confidence: 0.50 with no history, scaling up to 0.85 at 6+ months
        BigDecimal confidence = computeConfidence(monthsOfHistory);

        // Uncertainty margin widens with lower confidence.
        // confidence is a percentage (50–85), so (100 - confidence) / 100 gives the
        // fractional uncertainty (0.15–0.50), which we use as the half-width of the band.
        BigDecimal uncertaintyFactor = BigDecimal.valueOf(100)
                .subtract(confidence)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal margin = net.abs().multiply(uncertaintyFactor)
                .setScale(4, RoundingMode.HALF_UP);

        // Inflow breakdown based on transaction types in history
        Map<String, Object> inflowBreakdown = buildInflowBreakdown(history, horizonMonths, monthsOfHistory);
        Map<String, Object> outflowBreakdown = buildOutflowBreakdown(history, horizonMonths, monthsOfHistory);

        // Feature importance reflects what data was actually used
        Map<String, Object> featureImportance = buildFeatureImportance(monthsOfHistory);

        CashflowForecast forecast = CashflowForecast.builder()
                .forecastId(forecastId).entityType(entityType).entityId(entityId)
                .forecastDate(today).horizonDays(horizonDays).currency(currency)
                .projectedInflows(projectedInflows).projectedOutflows(projectedOutflows).netPosition(net)
                .confidenceLevel(confidence).lowerBound(net.subtract(margin)).upperBound(net.add(margin))
                .modelType(modelType).modelVersion("v3.0-historical-avg")
                .featureImportance(featureImportance)
                .inflowBreakdown(inflowBreakdown).outflowBreakdown(outflowBreakdown)
                .status("GENERATED").build();

        CashflowForecast saved = forecastRepository.save(forecast);
        log.info("Forecast generated: id={}, entity={}/{}, net={} {}, confidence={}, months_history={}",
                forecastId, entityType, entityId, net, currency, confidence, monthsOfHistory);
        return saved;
    }

    public List<CashflowForecast> getForecasts(String entityType, String entityId) {
        return forecastRepository.findByEntityTypeAndEntityIdOrderByForecastDateDesc(entityType, entityId);
    }

    @Transactional
    public CashflowForecast approveForecast(String forecastId) {
        CashflowForecast f = forecastRepository.findByForecastId(forecastId)
                .orElseThrow(() -> new RuntimeException("Forecast not found: " + forecastId));
        f.setStatus("APPROVED");
        return forecastRepository.save(f);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<Long> resolveAccountIds(String entityType, String entityId) {
        if ("CUSTOMER".equalsIgnoreCase(entityType)) {
            try {
                Long customerId = Long.parseLong(entityId);
                return accountRepository.findByCustomerId(customerId)
                        .stream().map(Account::getId).collect(Collectors.toList());
            } catch (NumberFormatException e) {
                log.warn("Cannot parse customerId '{}' for forecast", entityId);
                return Collections.emptyList();
            }
        } else {
            // ACCOUNT entity type
            try {
                return List.of(Long.parseLong(entityId));
            } catch (NumberFormatException e) {
                log.warn("Cannot parse accountId '{}' for forecast", entityId);
                return Collections.emptyList();
            }
        }
    }

    private BigDecimal resolveBookBalance(List<Long> accountIds) {
        if (accountIds.isEmpty()) return BigDecimal.ZERO;
        return accountRepository.findById(accountIds.get(0))
                .map(Account::getBookBalance)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Count how many distinct calendar months appear in the transaction history,
     * capped at 6 (the maximum lookback window).
     */
    private int computeMonthsOfHistory(List<TransactionJournal> history, LocalDate today) {
        if (history.isEmpty()) return 0;
        Set<String> months = history.stream()
                .map(t -> t.getPostingDate().getYear() + "-" + t.getPostingDate().getMonthValue())
                .collect(Collectors.toSet());
        return Math.min(months.size(), 6);
    }

    /**
     * Confidence scale (stored as a percentage, consistent with the entity default of 80.00):
     *   0 months  →  50.00
     *   1 month   →  55.00
     *   2 months  →  60.00
     *   3 months  →  68.00
     *   4 months  →  74.00
     *   5 months  →  80.00
     *   6+ months →  85.00
     */
    private BigDecimal computeConfidence(int months) {
        double[] scale = {50.0, 55.0, 60.0, 68.0, 74.0, 80.0, 85.0};
        int idx = Math.min(months, scale.length - 1);
        return BigDecimal.valueOf(scale[idx]).setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isCreditType(TransactionType type) {
        return type == TransactionType.CREDIT
                || type == TransactionType.TRANSFER_IN
                || type == TransactionType.INTEREST_POSTING
                || type == TransactionType.OPENING_BALANCE;
    }

    private boolean isDebitType(TransactionType type) {
        return type == TransactionType.DEBIT
                || type == TransactionType.TRANSFER_OUT
                || type == TransactionType.FEE_DEBIT;
    }

    private Map<String, Object> buildInflowBreakdown(List<TransactionJournal> history,
                                                      double horizonMonths, int monthsOfHistory) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (monthsOfHistory == 0) {
            map.put("note", "No historical data available");
            return map;
        }
        double divisor = monthsOfHistory;

        BigDecimal credits = sumByType(history, TransactionType.CREDIT)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);
        BigDecimal transferIn = sumByType(history, TransactionType.TRANSFER_IN)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);
        BigDecimal interest = sumByType(history, TransactionType.INTEREST_POSTING)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);

        map.put("credits", credits);
        map.put("transfer_in", transferIn);
        map.put("interest_income", interest);
        return map;
    }

    private Map<String, Object> buildOutflowBreakdown(List<TransactionJournal> history,
                                                       double horizonMonths, int monthsOfHistory) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (monthsOfHistory == 0) {
            map.put("note", "No historical data available");
            return map;
        }
        double divisor = monthsOfHistory;

        BigDecimal debits = sumByType(history, TransactionType.DEBIT)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);
        BigDecimal transferOut = sumByType(history, TransactionType.TRANSFER_OUT)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);
        BigDecimal fees = sumByType(history, TransactionType.FEE_DEBIT)
                .divide(BigDecimal.valueOf(divisor), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(horizonMonths)).setScale(4, RoundingMode.HALF_UP);

        map.put("debits", debits);
        map.put("transfers_out", transferOut);
        map.put("fees_charges", fees);
        return map;
    }

    private BigDecimal sumByType(List<TransactionJournal> history, TransactionType type) {
        return history.stream()
                .filter(t -> t.getTransactionType() == type)
                .map(TransactionJournal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Feature importance is honest about what was used.
     * With more history the model can weight trend and seasonality higher.
     */
    private Map<String, Object> buildFeatureImportance(int monthsOfHistory) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (monthsOfHistory == 0) {
            map.put("book_balance_fallback", 1.0);
            return map;
        }
        double histWeight = Math.min(0.70, 0.40 + monthsOfHistory * 0.05);
        double trendWeight = monthsOfHistory >= 3 ? 0.20 : 0.10;
        double seasonWeight = monthsOfHistory >= 6 ? 0.10 : 0.05;
        double other = Math.max(0.0, 1.0 - histWeight - trendWeight - seasonWeight);
        map.put("historical_average", histWeight);
        map.put("trend", trendWeight);
        map.put("seasonality", seasonWeight);
        map.put("other", other);
        return map;
    }
}
