package com.cbs.zakat.service;

import com.cbs.marketdata.service.MarketDataService;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatDomainEnums;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ZakatCalculationEngineTest {

    @Mock
    private MarketDataService marketDataService;

    private ZakatCalculationEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ZakatCalculationEngine(marketDataService);
        ReflectionTestUtils.setField(engine, "fallbackGoldPricePerGramSar", new BigDecimal("320"));
        ReflectionTestUtils.setField(engine, "fallbackSilverPricePerGramSar", new BigDecimal("4"));
        ReflectionTestUtils.setField(engine, "fallbackFixedNisabSar", new BigDecimal("20000"));
    }

    @Test
    @DisplayName("Calculation engine derives bank Zakat base, rate, and adjustments")
    void calculateBuildsZakatBaseAndAdjustments() {
        List<ZakatResponses.ZakatClassificationResult> classifications = List.of(
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("1100-000-001")
                        .glAccountName("Cash")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("1000.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.ZAKATABLE_ASSET.name())
                        .subCategory("CASH")
                        .includedInZakatBase(true)
                        .build(),
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("1800-000-001")
                        .glAccountName("Fixed assets")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("300.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.NON_ZAKATABLE_ASSET.name())
                        .subCategory("FIXED_ASSETS")
                        .includedInZakatBase(false)
                        .build(),
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("2100-WAD-001")
                        .glAccountName("Wadiah obligations")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("200.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY.name())
                        .subCategory("WADIAH")
                        .includedInZakatBase(true)
                        .build()
        );

        ZakatResponses.ZakatCalculationResult result = engine.calculate(
                classifications,
                ZakatCalculationEngine.CalculationParameters.builder()
                        .rateBasis(ZakatDomainEnums.ZakatRateBasis.HIJRI_YEAR)
                        .adjustments(List.of(ZakatSupport.adjustment(
                                "MANUAL-ADJ",
                                "SSB rounding adjustment",
                                new BigDecimal("5.00"),
                                ZakatDomainEnums.AdjustmentDirection.DECREASE)))
                        .expectedTotalAssets(new BigDecimal("1300.00"))
                        .targetCurrency("SAR")
                        .build());

        assertThat(result.getZakatBase()).isEqualByComparingTo(new BigDecimal("800.00"));
        assertThat(result.getZakatRate()).isEqualByComparingTo(new BigDecimal("2.500000"));
        assertThat(result.getZakatAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(result.getTotalAdjustments()).isEqualByComparingTo(new BigDecimal("-5.00"));
        assertThat(result.getAdjustedZakatAmount()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(result.isBelowNisab()).isFalse();
        assertThat(result.getAssetBreakdown()).containsEntry("CASH", new BigDecimal("1000.00"));
        assertThat(result.getExcludedAssetBreakdown()).containsEntry("FIXED_ASSETS", new BigDecimal("300.00"));
    }

    @Test
    @DisplayName("Calculation engine returns no Zakat due when below Nisab")
    void calculateReturnsBelowNisab() {
        List<ZakatResponses.ZakatClassificationResult> classifications = List.of(
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("1100-000-001")
                        .glAccountName("Cash")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("500.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.ZAKATABLE_ASSET.name())
                        .subCategory("CASH")
                        .includedInZakatBase(true)
                        .build()
        );

        ZakatResponses.ZakatCalculationResult result = engine.calculate(
                classifications,
                ZakatCalculationEngine.CalculationParameters.builder()
                        .rateBasis(ZakatDomainEnums.ZakatRateBasis.HIJRI_YEAR)
                        .checkNisab(true)
                        .nisabThreshold(new BigDecimal("20000.00"))
                        .expectedTotalAssets(new BigDecimal("500.00"))
                        .targetCurrency("SAR")
                        .build());

        assertThat(result.isBelowNisab()).isTrue();
        assertThat(result.getAdjustedZakatAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getNoZakatDueReason()).contains("Below Nisab");
    }
}