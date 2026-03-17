package com.cbs.fees.engine;

import com.cbs.fees.entity.FeeCalculationType;
import com.cbs.fees.entity.FeeDefinition;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * Core fee calculation engine supporting 6 calculation types:
 * FLAT, PERCENTAGE, TIERED, SLAB, MIN_OF, MAX_OF.
 * All calculations use HALF_UP rounding to 2 decimal places.
 */
@Component
@Slf4j
public class FeeEngine {

    private static final int SCALE = 2;

    public FeeResult calculate(FeeDefinition fee, BigDecimal transactionAmount) {
        BigDecimal feeAmount = switch (fee.getCalculationType()) {
            case FLAT -> calculateFlat(fee);
            case PERCENTAGE -> calculatePercentage(fee, transactionAmount);
            case TIERED -> calculateTiered(fee, transactionAmount);
            case SLAB -> calculateSlab(fee, transactionAmount);
            case MIN_OF -> calculateMinOf(fee, transactionAmount);
            case MAX_OF -> calculateMaxOf(fee, transactionAmount);
        };

        // Apply min/max caps
        if (fee.getMinFee() != null && feeAmount.compareTo(fee.getMinFee()) < 0) {
            feeAmount = fee.getMinFee();
        }
        if (fee.getMaxFee() != null && feeAmount.compareTo(fee.getMaxFee()) > 0) {
            feeAmount = fee.getMaxFee();
        }

        feeAmount = feeAmount.setScale(SCALE, RoundingMode.HALF_UP);

        // Tax calculation
        BigDecimal taxAmount = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(fee.getTaxApplicable()) && fee.getTaxRate() != null
                && fee.getTaxRate().compareTo(BigDecimal.ZERO) > 0) {
            taxAmount = feeAmount.multiply(fee.getTaxRate())
                    .divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);
        }

        BigDecimal totalAmount = feeAmount.add(taxAmount);

        return FeeResult.builder()
                .feeCode(fee.getFeeCode())
                .feeAmount(feeAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .currencyCode(fee.getCurrencyCode())
                .calculationType(fee.getCalculationType())
                .baseAmount(transactionAmount)
                .build();
    }

    private BigDecimal calculateFlat(FeeDefinition fee) {
        return fee.getFlatAmount() != null ? fee.getFlatAmount() : BigDecimal.ZERO;
    }

    private BigDecimal calculatePercentage(FeeDefinition fee, BigDecimal amount) {
        if (fee.getPercentage() == null) return BigDecimal.ZERO;
        return amount.multiply(fee.getPercentage())
                .divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);
    }

    /**
     * TIERED: Each tier applies to only the portion of the amount within that tier.
     * Example: 0-10000 → 1%, 10001-50000 → 0.5%, 50001+ → 0.25%
     * On 75000: (10000 × 1%) + (40000 × 0.5%) + (25000 × 0.25%) = 100 + 200 + 62.50 = 362.50
     */
    private BigDecimal calculateTiered(FeeDefinition fee, BigDecimal amount) {
        if (fee.getTierConfig() == null || fee.getTierConfig().isEmpty()) {
            return calculatePercentage(fee, amount);
        }

        BigDecimal totalFee = BigDecimal.ZERO;
        BigDecimal remaining = amount;

        for (Map<String, Object> tier : fee.getTierConfig()) {
            BigDecimal tierMin = toBigDecimal(tier.get("min"));
            BigDecimal tierMax = toBigDecimal(tier.get("max"));
            BigDecimal tierRate = toBigDecimal(tier.get("rate"));
            BigDecimal tierFlat = toBigDecimal(tier.get("flat"));

            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal tierWidth = (tierMax != null) ? tierMax.subtract(tierMin) : remaining;
            BigDecimal applicable = remaining.min(tierWidth);

            if (tierRate != null && tierRate.compareTo(BigDecimal.ZERO) > 0) {
                totalFee = totalFee.add(applicable.multiply(tierRate)
                        .divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP));
            }
            if (tierFlat != null && tierFlat.compareTo(BigDecimal.ZERO) > 0) {
                totalFee = totalFee.add(tierFlat);
            }

            remaining = remaining.subtract(applicable);
        }

        return totalFee;
    }

    /**
     * SLAB: The tier that contains the amount applies to the ENTIRE amount.
     * Example: 0-10000 → 1%, 10001-50000 → 0.5%, 50001+ → 0.25%
     * On 75000: 75000 × 0.25% = 187.50
     */
    private BigDecimal calculateSlab(FeeDefinition fee, BigDecimal amount) {
        if (fee.getTierConfig() == null || fee.getTierConfig().isEmpty()) {
            return calculatePercentage(fee, amount);
        }

        for (Map<String, Object> tier : fee.getTierConfig()) {
            BigDecimal tierMin = toBigDecimal(tier.get("min"));
            BigDecimal tierMax = toBigDecimal(tier.get("max"));

            boolean inRange = amount.compareTo(tierMin) >= 0 &&
                    (tierMax == null || amount.compareTo(tierMax) <= 0);

            if (inRange) {
                BigDecimal tierRate = toBigDecimal(tier.get("rate"));
                BigDecimal tierFlat = toBigDecimal(tier.get("flat"));
                BigDecimal result = BigDecimal.ZERO;

                if (tierRate != null && tierRate.compareTo(BigDecimal.ZERO) > 0) {
                    result = amount.multiply(tierRate).divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);
                }
                if (tierFlat != null) {
                    result = result.add(tierFlat);
                }
                return result;
            }
        }

        return calculatePercentage(fee, amount);
    }

    /**
     * MIN_OF: Returns the minimum of flat fee and percentage calculation.
     */
    private BigDecimal calculateMinOf(FeeDefinition fee, BigDecimal amount) {
        BigDecimal flat = calculateFlat(fee);
        BigDecimal pct = calculatePercentage(fee, amount);
        return flat.min(pct);
    }

    /**
     * MAX_OF: Returns the maximum of flat fee and percentage calculation.
     */
    private BigDecimal calculateMaxOf(FeeDefinition fee, BigDecimal amount) {
        BigDecimal flat = calculateFlat(fee);
        BigDecimal pct = calculatePercentage(fee, amount);
        return flat.max(pct);
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        return new BigDecimal(value.toString());
    }

    @Getter @Builder
    public static class FeeResult {
        private final String feeCode;
        private final BigDecimal feeAmount;
        private final BigDecimal taxAmount;
        private final BigDecimal totalAmount;
        private final String currencyCode;
        private final FeeCalculationType calculationType;
        private final BigDecimal baseAmount;
    }
}
