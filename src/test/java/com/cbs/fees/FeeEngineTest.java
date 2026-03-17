package com.cbs.fees;

import com.cbs.fees.engine.FeeEngine;
import com.cbs.fees.entity.FeeCalculationType;
import com.cbs.fees.entity.FeeCategory;
import com.cbs.fees.entity.FeeDefinition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FeeEngineTest {

    private FeeEngine feeEngine;

    @BeforeEach
    void setUp() {
        feeEngine = new FeeEngine();
    }

    @Test
    @DisplayName("FLAT: returns fixed amount regardless of transaction size")
    void flat() {
        FeeDefinition fee = buildFee(FeeCalculationType.FLAT);
        fee.setFlatAmount(new BigDecimal("50.00"));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("100000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("PERCENTAGE: 1.5% of 10000 = 150")
    void percentage() {
        FeeDefinition fee = buildFee(FeeCalculationType.PERCENTAGE);
        fee.setPercentage(new BigDecimal("1.5000"));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("10000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("PERCENTAGE with max cap: 1.5% of 1000000 capped at 5000")
    void percentageWithCap() {
        FeeDefinition fee = buildFee(FeeCalculationType.PERCENTAGE);
        fee.setPercentage(new BigDecimal("1.5000"));
        fee.setMaxFee(new BigDecimal("5000.00"));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("1000000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
    }

    @Test
    @DisplayName("PERCENTAGE with min floor: 1% of 100 floored at 25")
    void percentageWithFloor() {
        FeeDefinition fee = buildFee(FeeCalculationType.PERCENTAGE);
        fee.setPercentage(new BigDecimal("1.0000"));
        fee.setMinFee(new BigDecimal("25.00"));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("100"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("25.00"));
    }

    @Test
    @DisplayName("TIERED: each tier applies to its portion only")
    void tiered() {
        FeeDefinition fee = buildFee(FeeCalculationType.TIERED);
        fee.setTierConfig(List.of(
                Map.of("min", 0, "max", 10000, "rate", 1.0),
                Map.of("min", 10000, "max", 50000, "rate", 0.5),
                Map.of("min", 50000, "rate", 0.25)
        ));

        // 75000: (10000 × 1%) + (40000 × 0.5%) + (25000 × 0.25%) = 100 + 200 + 62.50 = 362.50
        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("75000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("362.50"));
    }

    @Test
    @DisplayName("SLAB: entire amount uses the matching tier rate")
    void slab() {
        FeeDefinition fee = buildFee(FeeCalculationType.SLAB);
        fee.setTierConfig(List.of(
                Map.of("min", 0, "max", 10000, "rate", 1.0),
                Map.of("min", 10000, "max", 50000, "rate", 0.5),
                Map.of("min", 50000, "rate", 0.25)
        ));

        // 75000 in 50000+ tier: 75000 × 0.25% = 187.50
        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("75000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("187.50"));
    }

    @Test
    @DisplayName("TIERED vs SLAB: tiered always >= slab for same config")
    void tieredVsSlab() {
        List<Map<String, Object>> tiers = List.of(
                Map.of("min", 0, "max", 10000, "rate", 1.0),
                Map.of("min", 10000, "max", 50000, "rate", 0.5),
                Map.of("min", 50000, "rate", 0.25)
        );

        FeeDefinition tieredFee = buildFee(FeeCalculationType.TIERED);
        tieredFee.setTierConfig(tiers);
        FeeDefinition slabFee = buildFee(FeeCalculationType.SLAB);
        slabFee.setTierConfig(tiers);

        BigDecimal amount = new BigDecimal("75000");
        BigDecimal tieredResult = feeEngine.calculate(tieredFee, amount).getFeeAmount();
        BigDecimal slabResult = feeEngine.calculate(slabFee, amount).getFeeAmount();

        assertThat(tieredResult).isGreaterThanOrEqualTo(slabResult);
    }

    @Test
    @DisplayName("MIN_OF: returns lesser of flat and percentage")
    void minOf() {
        FeeDefinition fee = buildFee(FeeCalculationType.MIN_OF);
        fee.setFlatAmount(new BigDecimal("100.00"));
        fee.setPercentage(new BigDecimal("1.0000"));

        // 1% of 5000 = 50, flat = 100, min = 50
        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("5000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("MAX_OF: returns greater of flat and percentage")
    void maxOf() {
        FeeDefinition fee = buildFee(FeeCalculationType.MAX_OF);
        fee.setFlatAmount(new BigDecimal("100.00"));
        fee.setPercentage(new BigDecimal("1.0000"));

        // 1% of 5000 = 50, flat = 100, max = 100
        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("5000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("Tax: 7.5% VAT on 100 fee = 7.50 tax, total 107.50")
    void taxCalculation() {
        FeeDefinition fee = buildFee(FeeCalculationType.FLAT);
        fee.setFlatAmount(new BigDecimal("100.00"));
        fee.setTaxApplicable(true);
        fee.setTaxRate(new BigDecimal("7.50"));

        FeeEngine.FeeResult result = feeEngine.calculate(fee, new BigDecimal("10000"));
        assertThat(result.getFeeAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(result.getTaxAmount()).isEqualByComparingTo(new BigDecimal("7.50"));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("107.50"));
    }

    private FeeDefinition buildFee(FeeCalculationType type) {
        return FeeDefinition.builder()
                .feeCode("TEST-FEE").feeName("Test Fee")
                .feeCategory(FeeCategory.TRANSACTION)
                .triggerEvent("TRANSFER").calculationType(type)
                .currencyCode("USD").isActive(true).build();
    }
}
