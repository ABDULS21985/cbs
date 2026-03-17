package com.cbs.fixedincome;

import com.cbs.fixedincome.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityHoldingTest {

    @Test
    @DisplayName("Daily coupon accrual: 10% on 1M face value ACT/365 = 273.97/day")
    void dailyCouponAccrual() {
        SecurityHolding h = SecurityHolding.builder()
                .faceValue(new BigDecimal("1000000")).couponRate(new BigDecimal("10.0"))
                .dayCountConvention("ACT/365").build();

        BigDecimal daily = h.dailyCouponAccrual();
        // 1000000 * 10 / (365 * 100) = 273.9726
        assertThat(daily).isBetween(new BigDecimal("273.90"), new BigDecimal("274.00"));
    }

    @Test
    @DisplayName("Zero-coupon bond duration equals time to maturity")
    void zeroCouponDuration() {
        SecurityHolding h = SecurityHolding.builder()
                .faceValue(new BigDecimal("100000")).couponRate(BigDecimal.ZERO)
                .maturityDate(LocalDate.now().plusYears(5)).build();

        BigDecimal duration = h.calculateDuration(new BigDecimal("5.0"));
        // Zero-coupon: duration ≈ 5.0 years
        assertThat(duration).isBetween(new BigDecimal("4.90"), new BigDecimal("5.10"));
    }

    @Test
    @DisplayName("Coupon bond duration < maturity")
    void couponBondDuration() {
        SecurityHolding h = SecurityHolding.builder()
                .faceValue(new BigDecimal("100000")).couponRate(new BigDecimal("8.0"))
                .maturityDate(LocalDate.now().plusYears(10)).build();

        BigDecimal duration = h.calculateDuration(new BigDecimal("8.0"));
        // 8% coupon, 10yr maturity, 8% yield: duration should be < 10
        assertThat(duration).isLessThan(new BigDecimal("10.0"));
        assertThat(duration).isPositive();
    }

    @Test
    @DisplayName("Modified duration = Macaulay / (1 + y)")
    void modifiedDuration() {
        SecurityHolding h = SecurityHolding.builder()
                .faceValue(new BigDecimal("100000")).couponRate(BigDecimal.ZERO)
                .maturityDate(LocalDate.now().plusYears(5)).build();

        BigDecimal mac = h.calculateDuration(new BigDecimal("5.0"));
        BigDecimal mod = h.calculateModifiedDuration(new BigDecimal("5.0"));
        // Modified = Mac / 1.05
        BigDecimal expected = mac.divide(new BigDecimal("1.05"), 4, java.math.RoundingMode.HALF_UP);
        assertThat(mod).isEqualByComparingTo(expected);
    }

    @Test
    @DisplayName("Premium/discount: purchase above face = positive premium")
    void premiumDiscount() {
        SecurityHolding h = SecurityHolding.builder()
                .faceValue(new BigDecimal("100000")).units(BigDecimal.ONE)
                .purchasePrice(new BigDecimal("102000")).build();

        assertThat(h.totalCost()).isEqualByComparingTo(new BigDecimal("102000"));
        h.setPremiumDiscount(h.totalCost().subtract(h.getFaceValue()));
        assertThat(h.getPremiumDiscount()).isEqualByComparingTo(new BigDecimal("2000")); // Premium
    }
}
