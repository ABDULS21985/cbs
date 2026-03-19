package com.cbs.pfm.service;
import com.cbs.pfm.entity.*;
import com.cbs.pfm.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PfmService {
    private final PfmSnapshotRepository snapshotRepository;
    private final PfmBudgetRepository budgetRepository;
    private final PfmFinancialHealthRepository healthRepository;
    private final PfmSpendingCategoryRepository categoryRepository;
    @Transactional
    public PfmSnapshot generateSnapshot(Long customerId, String snapshotType) {
        // TODO: aggregate real CREDIT (income) and DEBIT (expense) transactions for the customer
        // over the snapshot period from a transaction/journal repository when available.
        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal savings = income.subtract(expenses);
        BigDecimal savingsRate = income.signum() != 0 ? savings.divide(income, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) : BigDecimal.ZERO;
        int healthScore = Math.min(100, Math.max(0, (int)(savingsRate.doubleValue() * 2 + 30)));
        // TODO: populate expense breakdown from real transaction category aggregates
        Map<String, Object> breakdown = null;
        Map<String, Object> insights = new LinkedHashMap<>();
        if (savingsRate.doubleValue() < 10) insights.put("warning", "Savings rate below 10% - consider reducing discretionary spending");
        if (savingsRate.doubleValue() > 30) insights.put("positive", "Excellent savings rate - consider investing surplus");
        PfmSnapshot snapshot = PfmSnapshot.builder().customerId(customerId).snapshotDate(LocalDate.now()).snapshotType(snapshotType)
                .totalIncome(income).salaryIncome(income.multiply(new BigDecimal("0.8"))).totalExpenses(expenses)
                .expenseBreakdown(breakdown).savingsRate(savingsRate).financialHealthScore(healthScore)
                .healthFactors(Map.of("savings_ratio", savingsRate, "expense_control", healthScore > 60 ? "GOOD" : "NEEDS_ATTENTION"))
                .insights(insights).build();
        PfmSnapshot saved = snapshotRepository.save(snapshot);
        log.info("PFM snapshot: customer={}, health={}, savings_rate={}%", customerId, healthScore, savingsRate);
        return saved;
    }
    public List<PfmSnapshot> getHistory(Long customerId, String type) {
        return type != null ? snapshotRepository.findByCustomerIdAndSnapshotTypeOrderBySnapshotDateDesc(customerId, type)
                : snapshotRepository.findByCustomerIdOrderBySnapshotDateDesc(customerId);
    }

    // ── Budget Tracking ──────────────────────────────────────

    @Transactional
    public PfmBudget setBudget(Long customerId, Long categoryId, LocalDate month, BigDecimal amount) {
        PfmBudget budget = PfmBudget.builder().customerId(customerId).categoryId(categoryId)
                .budgetMonth(month.withDayOfMonth(1)).budgetAmount(amount).build();
        PfmBudget saved = budgetRepository.save(budget);
        log.info("Budget set: customer={}, category={}, month={}, amount={}", customerId, categoryId, month, amount);
        return saved;
    }

    @Transactional
    public PfmBudget recordSpending(Long budgetId, BigDecimal amount) {
        PfmBudget budget = budgetRepository.findById(budgetId).orElseThrow();
        budget.setSpentAmount(budget.getSpentAmount().add(amount));
        if (budget.getUtilizationPct().intValue() >= budget.getAlertThresholdPct() && !budget.getAlertSent()) {
            budget.setAlertSent(true);
            log.warn("Budget alert: customer={}, utilization={}%", budget.getCustomerId(), budget.getUtilizationPct());
        }
        return budgetRepository.save(budget);
    }

    public List<PfmBudget> getMonthlyBudgets(Long customerId, LocalDate month) {
        return budgetRepository.findByCustomerIdAndBudgetMonthOrderByCategoryIdAsc(customerId, month.withDayOfMonth(1));
    }

    // ── Financial Health Assessment ──────────────────────────

    @Transactional
    public PfmFinancialHealth assessFinancialHealth(Long customerId, BigDecimal savingsRatio,
            BigDecimal debtToIncome, BigDecimal emergencyFundMonths, BigDecimal creditUtilization,
            BigDecimal paymentConsistency, BigDecimal incomeStability) {

        int score = 0;
        // Savings ratio: 0-20 points (20%+ = full marks)
        score += Math.min(20, savingsRatio.intValue());
        // Debt-to-income: 0-25 points (lower is better, <30% = full marks)
        score += Math.max(0, 25 - Math.max(0, debtToIncome.intValue() - 30));
        // Emergency fund: 0-15 points (6+ months = full marks)
        score += Math.min(15, emergencyFundMonths.intValue() * 3);
        // Credit utilization: 0-15 points (lower is better, <30% = full marks)
        score += Math.max(0, 15 - (Math.max(0, creditUtilization.intValue() - 30) / 5));
        // Payment consistency: 0-15 points
        score += (int)(paymentConsistency.doubleValue() * 0.15);
        // Income stability: 0-10 points
        score += (int)(incomeStability.doubleValue() * 0.10);

        score = Math.min(100, Math.max(0, score));
        String risk = score >= 70 ? "LOW" : score >= 45 ? "MEDIUM" : score >= 25 ? "HIGH" : "CRITICAL";
        String trend = savingsRatio.compareTo(new BigDecimal("15")) > 0 ? "STABLE" :
                savingsRatio.compareTo(new BigDecimal("5")) > 0 ? "STABLE" : "DECREASING";

        List<Map<String, Object>> recommendations = new ArrayList<>();
        if (savingsRatio.compareTo(new BigDecimal("10")) < 0)
            recommendations.add(Map.of("type", "SAVINGS", "message", "Increase savings rate to at least 10% of income"));
        if (debtToIncome.compareTo(new BigDecimal("40")) > 0)
            recommendations.add(Map.of("type", "DEBT", "message", "Debt-to-income ratio is high — consider debt consolidation"));
        if (emergencyFundMonths.compareTo(new BigDecimal("3")) < 0)
            recommendations.add(Map.of("type", "EMERGENCY", "message", "Build emergency fund to cover at least 3 months of expenses"));
        if (creditUtilization.compareTo(new BigDecimal("60")) > 0)
            recommendations.add(Map.of("type", "CREDIT", "message", "Reduce credit utilization below 30% to improve credit score"));

        PfmFinancialHealth health = PfmFinancialHealth.builder()
                .customerId(customerId).assessmentDate(LocalDate.now()).overallScore(score)
                .savingsRatio(savingsRatio).debtToIncome(debtToIncome).emergencyFundMonths(emergencyFundMonths)
                .creditUtilization(creditUtilization).paymentConsistency(paymentConsistency).incomeStability(incomeStability)
                .spendingTrend(trend).riskLevel(risk).recommendations(recommendations).build();

        PfmFinancialHealth saved = healthRepository.save(health);
        log.info("Financial health assessed: customer={}, score={}, risk={}", customerId, score, risk);
        return saved;
    }

    public Optional<PfmFinancialHealth> getLatestHealth(Long customerId) {
        return healthRepository.findFirstByCustomerIdOrderByAssessmentDateDesc(customerId);
    }

    public List<PfmSpendingCategory> getCategories() {
        return categoryRepository.findByIsSystemTrueOrderByCategoryNameAsc();
    }
}
