package com.cbs.credit.engine;

import com.cbs.credit.entity.CreditDecision;
import com.cbs.credit.entity.CreditScoringModel;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.RiskRating;
import com.cbs.lending.entity.LoanApplication;
import com.cbs.lending.entity.LoanProduct;
import com.cbs.lending.repository.LoanAccountRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;

/**
 * Rule-based credit scoring and decisioning engine.
 * Evaluates customer and application attributes against a configurable scorecard.
 * Produces a numeric score, risk grade, and binary decision (APPROVE/DECLINE/REFER/CONDITIONAL).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CreditDecisionEngine {

    private final LoanAccountRepository loanAccountRepository;

    /**
     * Executes credit assessment against the given scoring model.
     */
    public DecisionResult evaluate(LoanApplication application, Customer customer,
                                     LoanProduct product, CreditScoringModel model) {
        long startTime = System.currentTimeMillis();

        Map<String, Object> inputData = buildInputData(application, customer, product);
        int totalScore = 0;
        List<String> reasons = new ArrayList<>();

        // ========================================================================
        // SCORING FACTORS
        // ========================================================================

        // 1. Customer age (max 100 points)
        int ageScore = scoreAge(customer);
        totalScore += ageScore;
        if (ageScore < 30) reasons.add("Low age score: " + ageScore);

        // 2. Customer relationship tenure (max 100 points)
        int tenureScore = scoreRelationshipTenure(customer);
        totalScore += tenureScore;

        // 3. Customer risk rating (max 150 points)
        int riskScore = scoreRiskRating(customer);
        totalScore += riskScore;
        if (riskScore == 0) reasons.add("Customer risk rating is high or sanctioned");

        // 4. Debt-to-income ratio (max 200 points)
        BigDecimal existingDebt = loanAccountRepository.getTotalOutstandingForCustomer(customer.getId());
        if (existingDebt == null) existingDebt = BigDecimal.ZERO;
        BigDecimal totalDebt = existingDebt.add(application.getRequestedAmount());
        BigDecimal dti = calculateDTI(totalDebt, customer);
        int dtiScore = scoreDTI(dti);
        totalScore += dtiScore;
        if (dtiScore < 50) reasons.add("High debt-to-income ratio: " + dti + "%");

        // 5. Loan amount vs product limits (max 100 points)
        int amountScore = scoreAmountRatio(application, product);
        totalScore += amountScore;

        // 6. Tenure appropriateness (max 100 points)
        int tenureAppropriatenessScore = scoreTenure(application, product);
        totalScore += tenureAppropriatenessScore;

        // 7. Collateral coverage (max 150 points)
        int collateralScore = product.getRequiresCollateral() ? 0 : 150; // Will be scored at collateral linking
        totalScore += collateralScore;
        if (product.getRequiresCollateral()) reasons.add("Collateral assessment pending");

        // 8. Customer type bonus (max 100 points)
        int customerTypeScore = scoreCustomerType(customer);
        totalScore += customerTypeScore;

        // ========================================================================
        // RISK GRADING
        // ========================================================================

        String riskGrade = determineRiskGrade(totalScore, model.getMaxScore());

        // ========================================================================
        // DECISION
        // ========================================================================

        CreditDecision decision;
        BigDecimal recommendedAmount = application.getRequestedAmount();
        BigDecimal recommendedRate = product.getDefaultInterestRate();
        Integer recommendedTenure = application.getRequestedTenureMonths();

        if (totalScore >= model.getCutoffScore()) {
            if ("A".equals(riskGrade) || "B".equals(riskGrade)) {
                decision = CreditDecision.APPROVE;
                // Better grade = potentially better rate
                if ("A".equals(riskGrade)) {
                    recommendedRate = product.getMinInterestRate();
                }
            } else if ("C".equals(riskGrade)) {
                decision = CreditDecision.APPROVE;
                recommendedRate = product.getDefaultInterestRate();
            } else {
                decision = CreditDecision.CONDITIONAL;
                reasons.add("Score above cutoff but risk grade requires conditions");
                // Reduce approved amount for higher risk
                recommendedAmount = application.getRequestedAmount()
                        .multiply(new BigDecimal("0.75")).setScale(2, RoundingMode.HALF_UP);
                recommendedRate = product.getMaxInterestRate();
            }
        } else if (totalScore >= model.getCutoffScore() * 0.8) {
            decision = CreditDecision.REFER;
            reasons.add("Score below cutoff but within referral range");
        } else {
            decision = CreditDecision.DECLINE;
            reasons.add("Score below minimum threshold");
        }

        // Hard decline rules
        if (customer.getRiskRating() == RiskRating.SANCTIONED) {
            decision = CreditDecision.DECLINE;
            reasons.clear();
            reasons.add("Customer is on sanctions list");
        }
        if (dti.compareTo(new BigDecimal("80")) > 0) {
            decision = CreditDecision.DECLINE;
            reasons.add("Debt-to-income ratio exceeds 80%");
        }

        long executionTime = System.currentTimeMillis() - startTime;

        log.info("Credit decision: app={}, score={}/{}, grade={}, decision={}, time={}ms",
                application.getApplicationNumber(), totalScore, model.getMaxScore(),
                riskGrade, decision, executionTime);

        return DecisionResult.builder()
                .score(totalScore)
                .riskGrade(riskGrade)
                .decision(decision)
                .decisionReasons(reasons)
                .recommendedAmount(recommendedAmount)
                .recommendedRate(recommendedRate)
                .recommendedTenure(recommendedTenure)
                .debtToIncomeRatio(dti)
                .inputData(inputData)
                .executionTimeMs((int) executionTime)
                .build();
    }

    // ========================================================================
    // SCORING FUNCTIONS
    // ========================================================================

    private int scoreAge(Customer customer) {
        if (customer.getDateOfBirth() == null) return 50;
        int age = Period.between(customer.getDateOfBirth(), LocalDate.now()).getYears();
        if (age < 21) return 20;
        if (age <= 30) return 60;
        if (age <= 50) return 100;
        if (age <= 65) return 80;
        return 40;
    }

    private int scoreRelationshipTenure(Customer customer) {
        if (customer.getCreatedAt() == null) return 50;
        long daysSinceOnboarding = java.time.Duration.between(customer.getCreatedAt(), java.time.Instant.now()).toDays();
        if (daysSinceOnboarding < 90) return 20;
        if (daysSinceOnboarding < 365) return 50;
        if (daysSinceOnboarding < 730) return 70;
        if (daysSinceOnboarding < 1825) return 90;
        return 100;
    }

    private int scoreRiskRating(Customer customer) {
        if (customer.getRiskRating() == null) return 75;
        return switch (customer.getRiskRating()) {
            case LOW -> 150;
            case MEDIUM -> 100;
            case HIGH -> 30;
            case VERY_HIGH -> 10;
            case PEP -> 50;
            case SANCTIONED -> 0;
        };
    }

    private int scoreDTI(BigDecimal dti) {
        if (dti.compareTo(new BigDecimal("20")) <= 0) return 200;
        if (dti.compareTo(new BigDecimal("30")) <= 0) return 170;
        if (dti.compareTo(new BigDecimal("40")) <= 0) return 140;
        if (dti.compareTo(new BigDecimal("50")) <= 0) return 100;
        if (dti.compareTo(new BigDecimal("60")) <= 0) return 60;
        if (dti.compareTo(new BigDecimal("70")) <= 0) return 30;
        return 0;
    }

    private int scoreAmountRatio(LoanApplication app, LoanProduct product) {
        BigDecimal ratio = app.getRequestedAmount()
                .divide(product.getMaxLoanAmount(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        if (ratio.compareTo(new BigDecimal("50")) <= 0) return 100;
        if (ratio.compareTo(new BigDecimal("75")) <= 0) return 70;
        if (ratio.compareTo(new BigDecimal("90")) <= 0) return 40;
        return 20;
    }

    private int scoreTenure(LoanApplication app, LoanProduct product) {
        int requested = app.getRequestedTenureMonths();
        int maxAllowed = product.getMaxTenureMonths();
        double ratio = (double) requested / maxAllowed;
        if (ratio <= 0.5) return 100;
        if (ratio <= 0.75) return 70;
        if (ratio <= 0.9) return 50;
        return 30;
    }

    private int scoreCustomerType(Customer customer) {
        return switch (customer.getCustomerType()) {
            case CORPORATE -> 100;
            case SME -> 80;
            case GOVERNMENT -> 100;
            case INDIVIDUAL -> 70;
            case SOLE_PROPRIETOR -> 60;
            default -> 50;
        };
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private BigDecimal calculateDTI(BigDecimal totalDebt, Customer customer) {
        // Simplified DTI: total_debt / assumed_income
        // In production, integrate with income verification / bank statement analysis
        BigDecimal assumedAnnualIncome = new BigDecimal("500000"); // Placeholder — would come from customer income data
        if (assumedAnnualIncome.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.valueOf(100);
        return totalDebt.multiply(BigDecimal.valueOf(100))
                .divide(assumedAnnualIncome, 2, RoundingMode.HALF_UP);
    }

    private String determineRiskGrade(int score, int maxScore) {
        double pct = (double) score / maxScore * 100;
        if (pct >= 80) return "A";
        if (pct >= 65) return "B";
        if (pct >= 50) return "C";
        if (pct >= 35) return "D";
        return "E";
    }

    private Map<String, Object> buildInputData(LoanApplication app, Customer customer, LoanProduct product) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customerId", customer.getId());
        data.put("customerType", customer.getCustomerType().name());
        data.put("riskRating", customer.getRiskRating() != null ? customer.getRiskRating().name() : "UNKNOWN");
        data.put("requestedAmount", app.getRequestedAmount());
        data.put("requestedTenure", app.getRequestedTenureMonths());
        data.put("productCode", product.getCode());
        data.put("loanType", product.getLoanType().name());
        return data;
    }

    @Getter @Builder
    public static class DecisionResult {
        private final int score;
        private final String riskGrade;
        private final CreditDecision decision;
        private final List<String> decisionReasons;
        private final BigDecimal recommendedAmount;
        private final BigDecimal recommendedRate;
        private final Integer recommendedTenure;
        private final BigDecimal debtToIncomeRatio;
        private final Map<String, Object> inputData;
        private final int executionTimeMs;
    }
}
