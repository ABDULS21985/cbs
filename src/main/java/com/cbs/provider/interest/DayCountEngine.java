package com.cbs.provider.interest;

import com.cbs.common.config.CbsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Global day-count convention engine for interest calculations.
 *
 * Supports:
 *  - ACT_365  (Actual/365) — UK, Australia, India, Nigeria, most of Africa
 *  - ACT_360  (Actual/360) — US money market, Eurozone interbank
 *  - ACT_ACT  (Actual/Actual) — US Treasury bonds, Eurozone govt bonds
 *  - THIRTY_360 (30/360) — US corporate bonds, some European markets
 *
 * Configured via cbs.interest.day-count-convention in application.yml.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DayCountEngine {

    private final CbsProperties cbsProperties;

    /**
     * Calculates daily interest accrual for a given balance and annual rate.
     *
     * @param balance    the balance to accrue on
     * @param annualRate the annual interest rate (e.g., 3.75 for 3.75%)
     * @param date       the accrual date (used for ACT/ACT to determine year length)
     * @return daily interest amount
     */
    public BigDecimal calculateDailyAccrual(BigDecimal balance, BigDecimal annualRate, LocalDate date) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0 || annualRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        int scale = cbsProperties.getInterest().getCalculationScale();
        BigDecimal yearBasis = getYearBasis(date);

        // daily = (balance × rate%) / (yearBasis × 100)
        return balance.multiply(annualRate)
                .divide(yearBasis.multiply(BigDecimal.valueOf(100)), scale, RoundingMode.HALF_UP);
    }

    /**
     * Calculates interest for a period between two dates.
     *
     * @param balance    the balance
     * @param annualRate annual rate in percent
     * @param fromDate   period start (inclusive)
     * @param toDate     period end (exclusive)
     * @return period interest amount
     */
    public BigDecimal calculatePeriodInterest(BigDecimal balance, BigDecimal annualRate,
                                                LocalDate fromDate, LocalDate toDate) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0 || annualRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        int scale = cbsProperties.getInterest().getCalculationScale();
        long days = getDayCount(fromDate, toDate);
        BigDecimal yearBasis = getYearBasis(fromDate);

        // interest = (balance × rate% × days) / (yearBasis × 100)
        return balance.multiply(annualRate)
                .multiply(BigDecimal.valueOf(days))
                .divide(yearBasis.multiply(BigDecimal.valueOf(100)), scale, RoundingMode.HALF_UP);
    }

    /**
     * Returns the number of days between two dates per the configured convention.
     */
    public long getDayCount(LocalDate fromDate, LocalDate toDate) {
        String convention = cbsProperties.getInterest().getDayCountConvention();
        return switch (convention.toUpperCase()) {
            case "THIRTY_360" -> dayCount30_360(fromDate, toDate);
            default -> ChronoUnit.DAYS.between(fromDate, toDate);
        };
    }

    /**
     * Returns the year basis (denominator) for the configured convention.
     */
    public BigDecimal getYearBasis(LocalDate date) {
        String convention = cbsProperties.getInterest().getDayCountConvention();
        return switch (convention.toUpperCase()) {
            case "ACT_360", "THIRTY_360" -> BigDecimal.valueOf(360);
            case "ACT_ACT" -> BigDecimal.valueOf(date.isLeapYear() ? 366 : 365);
            default -> BigDecimal.valueOf(365); // ACT_365
        };
    }

    /**
     * 30/360 day count: treats every month as 30 days.
     * US (NASD) variant.
     */
    private long dayCount30_360(LocalDate d1, LocalDate d2) {
        int y1 = d1.getYear(), m1 = d1.getMonthValue(), day1 = Math.min(d1.getDayOfMonth(), 30);
        int y2 = d2.getYear(), m2 = d2.getMonthValue(), day2 = d2.getDayOfMonth();

        if (day1 == 30 && day2 == 31) day2 = 30;
        if (day1 == 31) day1 = 30;

        return 360L * (y2 - y1) + 30L * (m2 - m1) + (day2 - day1);
    }
}
