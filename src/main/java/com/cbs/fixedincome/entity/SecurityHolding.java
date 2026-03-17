package com.cbs.fixedincome.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Entity @Table(name = "security_holding", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityHolding {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "holding_ref", nullable = false, unique = true, length = 30) private String holdingRef;
    @Column(name = "security_type", nullable = false, length = 20) @Enumerated(EnumType.STRING) private SecurityType securityType;
    @Column(name = "isin_code", length = 12) private String isinCode;
    @Column(name = "security_name", nullable = false, length = 200) private String securityName;
    @Column(name = "issuer_name", nullable = false, length = 200) private String issuerName;
    @Column(name = "issuer_type", length = 20) private String issuerType;
    @Column(name = "face_value", nullable = false, precision = 18, scale = 2) private BigDecimal faceValue;
    @Column(name = "units", nullable = false, precision = 18, scale = 6) @Builder.Default private BigDecimal units = BigDecimal.ONE;
    @Column(name = "purchase_price", nullable = false, precision = 18, scale = 6) private BigDecimal purchasePrice;
    @Column(name = "purchase_yield", precision = 8, scale = 4) private BigDecimal purchaseYield;
    @Column(name = "clean_price", precision = 18, scale = 6) private BigDecimal cleanPrice;
    @Column(name = "dirty_price", precision = 18, scale = 6) private BigDecimal dirtyPrice;
    @Column(name = "market_price", precision = 18, scale = 6) private BigDecimal marketPrice;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "coupon_rate", precision = 8, scale = 4) @Builder.Default private BigDecimal couponRate = BigDecimal.ZERO;
    @Column(name = "coupon_frequency", length = 10) private String couponFrequency;
    @Column(name = "day_count_convention", length = 10) @Builder.Default private String dayCountConvention = "ACT/365";
    @Column(name = "next_coupon_date") private LocalDate nextCouponDate;
    @Column(name = "purchase_date", nullable = false) private LocalDate purchaseDate;
    @Column(name = "settlement_date", nullable = false) private LocalDate settlementDate;
    @Column(name = "maturity_date", nullable = false) private LocalDate maturityDate;
    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4) @Builder.Default private BigDecimal accruedInterest = BigDecimal.ZERO;
    @Column(name = "last_accrual_date") private LocalDate lastAccrualDate;
    @Column(name = "amortised_cost", precision = 18, scale = 2) private BigDecimal amortisedCost;
    @Column(name = "premium_discount", precision = 18, scale = 2) @Builder.Default private BigDecimal premiumDiscount = BigDecimal.ZERO;
    @Column(name = "cumulative_amortisation", precision = 18, scale = 2) @Builder.Default private BigDecimal cumulativeAmortisation = BigDecimal.ZERO;
    @Column(name = "mtm_value", precision = 18, scale = 2) private BigDecimal mtmValue;
    @Column(name = "unrealised_gain_loss", precision = 18, scale = 2) @Builder.Default private BigDecimal unrealisedGainLoss = BigDecimal.ZERO;
    @Column(name = "last_mtm_date") private LocalDate lastMtmDate;
    @Column(name = "portfolio_code", length = 20) private String portfolioCode;
    @Column(name = "deal_id") private Long dealId;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    /** Calculate daily coupon accrual */
    public BigDecimal dailyCouponAccrual() {
        if (couponRate == null || couponRate.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        int daysInYear = "ACT/360".equals(dayCountConvention) ? 360 : 365;
        return faceValue.multiply(couponRate).divide(BigDecimal.valueOf(daysInYear * 100L), 4, RoundingMode.HALF_UP);
    }

    /** Calculate Macaulay duration (simplified) */
    public BigDecimal calculateDuration(BigDecimal yieldRate) {
        if (maturityDate == null) return BigDecimal.ZERO;
        long daysToMaturity = ChronoUnit.DAYS.between(LocalDate.now(), maturityDate);
        if (daysToMaturity <= 0) return BigDecimal.ZERO;
        double years = daysToMaturity / 365.0;
        if (couponRate == null || couponRate.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.valueOf(years).setScale(4, RoundingMode.HALF_UP); // Zero-coupon = maturity
        }
        double c = couponRate.doubleValue() / 100.0;
        double y = yieldRate != null ? yieldRate.doubleValue() / 100.0 : c;
        double n = years;
        double duration = ((1 + y) / y) - ((1 + y + n * (c - y)) / (c * (Math.pow(1 + y, n) - 1) + y));
        return BigDecimal.valueOf(Math.max(duration, 0)).setScale(4, RoundingMode.HALF_UP);
    }

    /** Calculate modified duration */
    public BigDecimal calculateModifiedDuration(BigDecimal yieldRate) {
        BigDecimal macDuration = calculateDuration(yieldRate);
        double y = yieldRate != null ? yieldRate.doubleValue() / 100.0 : 0.05;
        return macDuration.divide(BigDecimal.valueOf(1 + y), 4, RoundingMode.HALF_UP);
    }

    public boolean isMatured() { return maturityDate != null && !LocalDate.now().isBefore(maturityDate); }
    public BigDecimal totalCost() { return purchasePrice.multiply(units).setScale(2, RoundingMode.HALF_UP); }
}
