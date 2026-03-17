package com.cbs.interest;

import com.cbs.common.config.CbsProperties;
import com.cbs.provider.interest.DayCountEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DayCountEngineTest {

    private CbsProperties cbsProperties;

    @BeforeEach
    void setUp() {
        cbsProperties = new CbsProperties();
    }

    private DayCountEngine engineWith(String convention) {
        cbsProperties.getInterest().setDayCountConvention(convention);
        cbsProperties.getInterest().setCalculationScale(4);
        return new DayCountEngine(cbsProperties);
    }

    @Nested
    @DisplayName("ACT/365 — UK, Australia, India, most of Africa")
    class Act365Tests {

        @Test
        @DisplayName("Daily accrual uses 365-day basis")
        void dailyAccrual() {
            DayCountEngine engine = engineWith("ACT_365");
            BigDecimal result = engine.calculateDailyAccrual(
                    new BigDecimal("1000000"), new BigDecimal("5.0000"), LocalDate.of(2026, 6, 15));
            // 1,000,000 * 5 / (365 * 100) = 136.9863
            BigDecimal expected = new BigDecimal("1000000").multiply(new BigDecimal("5"))
                    .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);
            assertThat(result).isEqualByComparingTo(expected);
        }

        @Test
        @DisplayName("Period interest for 30 days")
        void periodInterest() {
            DayCountEngine engine = engineWith("ACT_365");
            BigDecimal result = engine.calculatePeriodInterest(
                    new BigDecimal("500000"), new BigDecimal("3.75"),
                    LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
            // 500,000 * 3.75 * 30 / (365 * 100) = 1,541.0959
            BigDecimal expected = new BigDecimal("500000").multiply(new BigDecimal("3.75"))
                    .multiply(BigDecimal.valueOf(30))
                    .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);
            assertThat(result).isEqualByComparingTo(expected);
        }

        @Test
        @DisplayName("Year basis is always 365")
        void yearBasis() {
            DayCountEngine engine = engineWith("ACT_365");
            assertThat(engine.getYearBasis(LocalDate.of(2024, 6, 1))).isEqualByComparingTo(BigDecimal.valueOf(365));
            assertThat(engine.getYearBasis(LocalDate.of(2025, 6, 1))).isEqualByComparingTo(BigDecimal.valueOf(365));
        }
    }

    @Nested
    @DisplayName("ACT/360 — US money market, Eurozone interbank")
    class Act360Tests {

        @Test
        @DisplayName("Daily accrual uses 360-day basis")
        void dailyAccrual() {
            DayCountEngine engine = engineWith("ACT_360");
            BigDecimal result = engine.calculateDailyAccrual(
                    new BigDecimal("1000000"), new BigDecimal("5.0000"), LocalDate.of(2026, 6, 15));
            // 1,000,000 * 5 / (360 * 100) = 138.8889
            BigDecimal expected = new BigDecimal("1000000").multiply(new BigDecimal("5"))
                    .divide(BigDecimal.valueOf(36000), 4, RoundingMode.HALF_UP);
            assertThat(result).isEqualByComparingTo(expected);
        }

        @Test
        @DisplayName("Year basis is always 360")
        void yearBasis() {
            DayCountEngine engine = engineWith("ACT_360");
            assertThat(engine.getYearBasis(LocalDate.of(2026, 1, 1))).isEqualByComparingTo(BigDecimal.valueOf(360));
        }
    }

    @Nested
    @DisplayName("ACT/ACT — US Treasury, Eurozone government bonds")
    class ActActTests {

        @Test
        @DisplayName("Uses 366 for leap year")
        void leapYear() {
            DayCountEngine engine = engineWith("ACT_ACT");
            assertThat(engine.getYearBasis(LocalDate.of(2024, 3, 1))).isEqualByComparingTo(BigDecimal.valueOf(366));
        }

        @Test
        @DisplayName("Uses 365 for non-leap year")
        void nonLeapYear() {
            DayCountEngine engine = engineWith("ACT_ACT");
            assertThat(engine.getYearBasis(LocalDate.of(2025, 3, 1))).isEqualByComparingTo(BigDecimal.valueOf(365));
        }
    }

    @Nested
    @DisplayName("30/360 — US corporate bonds, some European markets")
    class Thirty360Tests {

        @Test
        @DisplayName("Same month = actual days")
        void sameMonth() {
            DayCountEngine engine = engineWith("THIRTY_360");
            long days = engine.getDayCount(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 16));
            assertThat(days).isEqualTo(15);
        }

        @Test
        @DisplayName("Cross-month treats all months as 30 days")
        void crossMonth() {
            DayCountEngine engine = engineWith("THIRTY_360");
            // Jan 1 to Feb 1 = 30 days in 30/360
            long days = engine.getDayCount(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));
            assertThat(days).isEqualTo(30);
        }

        @Test
        @DisplayName("Full year = 360 days")
        void fullYear() {
            DayCountEngine engine = engineWith("THIRTY_360");
            long days = engine.getDayCount(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1));
            assertThat(days).isEqualTo(360);
        }

        @Test
        @DisplayName("Year basis is 360")
        void yearBasis() {
            DayCountEngine engine = engineWith("THIRTY_360");
            assertThat(engine.getYearBasis(LocalDate.of(2026, 1, 1))).isEqualByComparingTo(BigDecimal.valueOf(360));
        }
    }

    @Nested
    @DisplayName("Edge cases")
    class EdgeCases {

        @Test
        @DisplayName("Zero balance returns zero interest")
        void zeroBalance() {
            DayCountEngine engine = engineWith("ACT_365");
            assertThat(engine.calculateDailyAccrual(BigDecimal.ZERO, new BigDecimal("5"), LocalDate.now()))
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Zero rate returns zero interest")
        void zeroRate() {
            DayCountEngine engine = engineWith("ACT_365");
            assertThat(engine.calculateDailyAccrual(new BigDecimal("1000000"), BigDecimal.ZERO, LocalDate.now()))
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Negative balance returns zero interest")
        void negativeBalance() {
            DayCountEngine engine = engineWith("ACT_365");
            assertThat(engine.calculateDailyAccrual(new BigDecimal("-5000"), new BigDecimal("5"), LocalDate.now()))
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }
    }
}
