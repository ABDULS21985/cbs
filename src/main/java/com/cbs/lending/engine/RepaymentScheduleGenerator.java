package com.cbs.lending.engine;

import com.cbs.lending.entity.LoanRepaymentSchedule;
import com.cbs.lending.entity.RepaymentScheduleType;
import com.cbs.lending.entity.ScheduleInstallmentStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Generates loan repayment schedules for all supported amortisation profiles.
 * All calculations use BigDecimal with banker's rounding (HALF_UP).
 */
@Component
@Slf4j
public class RepaymentScheduleGenerator {

    private static final int CALC_SCALE = 10;
    private static final int MONEY_SCALE = 2;
    private static final MathContext MC = MathContext.DECIMAL128;

    /**
     * Generates a full repayment schedule for the given loan parameters.
     *
     * @param principal     loan principal amount
     * @param annualRate    annual interest rate in percent (e.g., 12.5 for 12.5%)
     * @param tenureMonths  total tenure in months
     * @param scheduleType  amortisation profile
     * @param firstDueDate  date of first installment
     * @return list of schedule entries (not yet persisted)
     */
    public List<LoanRepaymentSchedule> generate(BigDecimal principal, BigDecimal annualRate,
                                                  int tenureMonths, RepaymentScheduleType scheduleType,
                                                  LocalDate firstDueDate) {
        return switch (scheduleType) {
            case EQUAL_INSTALLMENT -> generateEqualInstallment(principal, annualRate, tenureMonths, firstDueDate);
            case EQUAL_PRINCIPAL -> generateEqualPrincipal(principal, annualRate, tenureMonths, firstDueDate);
            case BULLET -> generateBullet(principal, annualRate, tenureMonths, firstDueDate);
            case BALLOON -> generateBalloon(principal, annualRate, tenureMonths, firstDueDate);
            case STEP_UP -> generateStepUp(principal, annualRate, tenureMonths, firstDueDate);
            case STEP_DOWN -> generateStepDown(principal, annualRate, tenureMonths, firstDueDate);
            case CUSTOM -> generateEqualInstallment(principal, annualRate, tenureMonths, firstDueDate);
        };
    }

    /**
     * Calculates EMI using the standard annuity formula:
     * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
     * where r = monthly rate, n = number of months
     */
    public BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int tenureMonths) {
        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(tenureMonths), MONEY_SCALE, RoundingMode.HALF_UP);
        }

        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal power = pow(onePlusR, tenureMonths);
        BigDecimal numerator = principal.multiply(monthlyRate).multiply(power);
        BigDecimal denominator = power.subtract(BigDecimal.ONE);

        return numerator.divide(denominator, MONEY_SCALE, RoundingMode.HALF_UP);
    }

    // ========================================================================
    // EQUAL INSTALLMENT (Standard EMI / Annuity)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateEqualInstallment(BigDecimal principal, BigDecimal annualRate,
                                                                    int tenureMonths, LocalDate firstDueDate) {
        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal emi = calculateEmi(principal, annualRate, tenureMonths);
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal outstandingPrincipal = principal;
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interestDue = outstandingPrincipal.multiply(monthlyRate)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal principalDue;
            if (i == tenureMonths) {
                principalDue = outstandingPrincipal; // Last installment clears remaining
            } else {
                principalDue = emi.subtract(interestDue);
            }

            BigDecimal totalDue = principalDue.add(interestDue);
            outstandingPrincipal = outstandingPrincipal.subtract(principalDue);

            schedule.add(buildEntry(i, dueDate, principalDue, interestDue, totalDue,
                    outstandingPrincipal.max(BigDecimal.ZERO)));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // EQUAL PRINCIPAL (Declining Balance)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateEqualPrincipal(BigDecimal principal, BigDecimal annualRate,
                                                                  int tenureMonths, LocalDate firstDueDate) {
        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal monthlyPrincipal = principal.divide(BigDecimal.valueOf(tenureMonths), MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal outstandingPrincipal = principal;
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interestDue = outstandingPrincipal.multiply(monthlyRate)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal principalDue = (i == tenureMonths) ? outstandingPrincipal : monthlyPrincipal;
            BigDecimal totalDue = principalDue.add(interestDue);
            outstandingPrincipal = outstandingPrincipal.subtract(principalDue);

            schedule.add(buildEntry(i, dueDate, principalDue, interestDue, totalDue,
                    outstandingPrincipal.max(BigDecimal.ZERO)));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // BULLET (Interest-only, principal at maturity)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateBullet(BigDecimal principal, BigDecimal annualRate,
                                                         int tenureMonths, LocalDate firstDueDate) {
        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal monthlyInterest = principal.multiply(monthlyRate).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal principalDue = (i == tenureMonths) ? principal : BigDecimal.ZERO;
            BigDecimal totalDue = principalDue.add(monthlyInterest);
            BigDecimal outstanding = (i == tenureMonths) ? BigDecimal.ZERO : principal;

            schedule.add(buildEntry(i, dueDate, principalDue, monthlyInterest, totalDue, outstanding));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // BALLOON (Reduced EMI, large final payment)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateBalloon(BigDecimal principal, BigDecimal annualRate,
                                                          int tenureMonths, LocalDate firstDueDate) {
        // Balloon: 50% of principal amortised over tenure, 50% due at maturity
        BigDecimal amortisedPortion = principal.multiply(new BigDecimal("0.50"));
        BigDecimal balloonPortion = principal.subtract(amortisedPortion);

        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal monthlyPrincipal = amortisedPortion.divide(BigDecimal.valueOf(tenureMonths), MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal outstandingPrincipal = principal;
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interestDue = outstandingPrincipal.multiply(monthlyRate)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal principalDue;
            if (i == tenureMonths) {
                principalDue = outstandingPrincipal; // Balloon + remaining
            } else {
                principalDue = monthlyPrincipal;
            }

            BigDecimal totalDue = principalDue.add(interestDue);
            outstandingPrincipal = outstandingPrincipal.subtract(principalDue);

            schedule.add(buildEntry(i, dueDate, principalDue, interestDue, totalDue,
                    outstandingPrincipal.max(BigDecimal.ZERO)));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // STEP-UP (Increasing installments — 10% increase every 12 months)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateStepUp(BigDecimal principal, BigDecimal annualRate,
                                                         int tenureMonths, LocalDate firstDueDate) {
        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal baseEmi = calculateEmi(principal, annualRate, tenureMonths);
        BigDecimal stepFactor = new BigDecimal("0.10"); // 10% annual step
        BigDecimal outstandingPrincipal = principal;
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            int yearIndex = (i - 1) / 12;
            BigDecimal stepMultiplier = BigDecimal.ONE.add(stepFactor.multiply(BigDecimal.valueOf(yearIndex)));
            BigDecimal currentEmi = baseEmi.multiply(stepMultiplier).setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal interestDue = outstandingPrincipal.multiply(monthlyRate)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal principalDue;
            if (i == tenureMonths) {
                principalDue = outstandingPrincipal;
            } else {
                principalDue = currentEmi.subtract(interestDue).max(BigDecimal.ZERO);
            }

            BigDecimal totalDue = principalDue.add(interestDue);
            outstandingPrincipal = outstandingPrincipal.subtract(principalDue);

            schedule.add(buildEntry(i, dueDate, principalDue, interestDue, totalDue,
                    outstandingPrincipal.max(BigDecimal.ZERO)));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // STEP-DOWN (Decreasing installments — 10% decrease every 12 months)
    // ========================================================================

    private List<LoanRepaymentSchedule> generateStepDown(BigDecimal principal, BigDecimal annualRate,
                                                           int tenureMonths, LocalDate firstDueDate) {
        List<LoanRepaymentSchedule> schedule = new ArrayList<>();
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal baseEmi = calculateEmi(principal, annualRate, tenureMonths)
                .multiply(new BigDecimal("1.30")).setScale(MONEY_SCALE, RoundingMode.HALF_UP); // Start 30% higher
        BigDecimal stepFactor = new BigDecimal("0.10");
        BigDecimal outstandingPrincipal = principal;
        LocalDate dueDate = firstDueDate;

        for (int i = 1; i <= tenureMonths; i++) {
            int yearIndex = (i - 1) / 12;
            BigDecimal stepMultiplier = BigDecimal.ONE.subtract(stepFactor.multiply(BigDecimal.valueOf(yearIndex)));
            if (stepMultiplier.compareTo(new BigDecimal("0.30")) < 0) {
                stepMultiplier = new BigDecimal("0.30");
            }
            BigDecimal currentEmi = baseEmi.multiply(stepMultiplier).setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal interestDue = outstandingPrincipal.multiply(monthlyRate)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            BigDecimal principalDue;
            if (i == tenureMonths) {
                principalDue = outstandingPrincipal;
            } else {
                principalDue = currentEmi.subtract(interestDue).max(BigDecimal.ZERO);
            }

            BigDecimal totalDue = principalDue.add(interestDue);
            outstandingPrincipal = outstandingPrincipal.subtract(principalDue);

            schedule.add(buildEntry(i, dueDate, principalDue, interestDue, totalDue,
                    outstandingPrincipal.max(BigDecimal.ZERO)));
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private LoanRepaymentSchedule buildEntry(int number, LocalDate dueDate, BigDecimal principalDue,
                                               BigDecimal interestDue, BigDecimal totalDue,
                                               BigDecimal outstanding) {
        return LoanRepaymentSchedule.builder()
                .installmentNumber(number)
                .dueDate(dueDate)
                .principalDue(principalDue)
                .interestDue(interestDue)
                .totalDue(totalDue)
                .outstanding(outstanding)
                .status(ScheduleInstallmentStatus.PENDING)
                .build();
    }

    /**
     * BigDecimal power function for positive integer exponents.
     */
    private BigDecimal pow(BigDecimal base, int exponent) {
        BigDecimal result = BigDecimal.ONE;
        for (int i = 0; i < exponent; i++) {
            result = result.multiply(base, MC);
        }
        return result;
    }
}
