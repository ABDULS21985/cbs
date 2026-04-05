package com.cbs.islamicrisk.service;

import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicEclConfiguration;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicEclCalculationRepository;
import com.cbs.islamicrisk.repository.IslamicEclConfigurationRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicEclServiceTest {

    @Mock private IslamicEclConfigurationRepository configurationRepository;
    @Mock private IslamicEclCalculationRepository calculationRepository;
    @Mock private IslamicRiskSupport riskSupport;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private IslamicEclService service;

    @BeforeEach
    void setUp() {
        lenient().when(riskSupport.uppercase(anyString())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });
        lenient().when(riskSupport.asBigDecimal(any())).thenAnswer(invocation -> toBigDecimal(invocation.getArgument(0)));
        lenient().when(riskSupport.scaleMoney(any())).thenAnswer(invocation ->
                toBigDecimal(invocation.getArgument(0)).setScale(2, RoundingMode.HALF_UP));
        lenient().when(riskSupport.nextRef(anyString())).thenReturn("IECL-2026-000001");
        lenient().when(riskSupport.currentActor()).thenReturn("finance.user");
        lenient().when(riskSupport.currentTenantId()).thenReturn(1L);
        lenient().when(calculationRepository.findTopByContractIdOrderByCalculationDateDesc(any())).thenReturn(Optional.empty());
        lenient().when(calculationRepository.save(any(IslamicEclCalculation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void calculateEcl_murabahaEadExcludesDeferredProfit() {
        when(riskSupport.loadContract(1L, "MURABAHA")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                1L, "MRB-1", "MURABAHA", "MRB-HOME", 10L, 1L, null, null,
                new BigDecimal("80000"), new BigDecimal("20000"), BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("5.0"), BigDecimal.ZERO,
                new BigDecimal("10000"), 0, Map.of()
        ));
        when(riskSupport.latestAssessment(10L, "MURABAHA")).thenReturn(assessment(new BigDecimal("0.020000"), new BigDecimal("0.010000")));
        when(configurationRepository.findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
                "MURABAHA", IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)).thenReturn(Optional.of(murabahaConfig()));

        IslamicEclCalculation result = service.calculateEcl(1L, "MURABAHA", LocalDate.of(2026, 4, 5));

        assertThat(result.getEad()).isEqualByComparingTo("80000.00");
        assertThat(result.getEadBreakdown().get("deferredProfitExcluded")).isEqualTo(true);
        assertThat(result.getEadBreakdown().get("deferredProfitOutstanding")).isEqualTo(new BigDecimal("20000"));
        assertThat(result.getCurrentStage()).isEqualTo(IslamicRiskDomainEnums.Stage.STAGE_1);
    }

    @Test
    void calculateEcl_ijarahEadIncludesAssetNbvAndRentalReceivableWithLowerLgdThanMurabaha() {
        when(riskSupport.loadContract(2L, "IJARAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                2L, "IJR-1", "IJARAH", "IJR-VEH", 20L, 2L, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("90000"), new BigDecimal("10000"),
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("7.0"), new BigDecimal("95000"),
                BigDecimal.ZERO, 0, Map.of()
        ));
        when(riskSupport.latestAssessment(20L, "IJARAH")).thenReturn(assessment(new BigDecimal("0.015000"), new BigDecimal("0.010000")));
        when(configurationRepository.findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
                "IJARAH", IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)).thenReturn(Optional.of(ijarahConfig()));

        IslamicEclCalculation result = service.calculateEcl(2L, "IJARAH", LocalDate.of(2026, 4, 5));

        assertThat(result.getEad()).isEqualByComparingTo("100000.00");
        assertThat(result.getEadBreakdown()).containsEntry("assetNbv", new BigDecimal("90000"));
        assertThat(result.getEadBreakdown()).containsEntry("rentalReceivable", new BigDecimal("10000"));
        assertThat(result.getLgd()).isLessThan(new BigDecimal("0.450000"));
    }

    @Test
    void calculateEcl_musharakahUsesCurrentBankShareAndDpd45MovesToStage2() {
        when(riskSupport.loadContract(3L, "MUSHARAKAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                3L, "MSH-1", "MUSHARAKAH", "MSH-HOME", 30L, 3L, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("400000"), new BigDecimal("40.0"), new BigDecimal("5.5"), new BigDecimal("10000"),
                BigDecimal.ZERO, 45, new LinkedHashMap<>(Map.of("bankSharePercentage", new BigDecimal("40.0")))
        ));
        when(riskSupport.latestAssessment(30L, "MUSHARAKAH")).thenReturn(assessment(new BigDecimal("0.025000"), new BigDecimal("0.010000")));
        when(configurationRepository.findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
                "MUSHARAKAH", IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)).thenReturn(Optional.of(musharakahConfig()));

        IslamicEclCalculation result = service.calculateEcl(3L, "MUSHARAKAH", LocalDate.of(2026, 4, 5));

        assertThat(result.getEad()).isEqualByComparingTo("400000.00");
        assertThat(result.getCurrentStage()).isEqualTo(IslamicRiskDomainEnums.Stage.STAGE_2);
        assertThat(result.getStagingReason()).contains("30");
        assertThat(result.getEadBreakdown().get("bankShareValue")).isEqualTo(new BigDecimal("400000"));
    }

    private IslamicCreditAssessment assessment(BigDecimal currentPd, BigDecimal originationPd) {
        return IslamicCreditAssessment.builder()
                .estimatedPd(currentPd)
                .inputData(new LinkedHashMap<>(Map.of("originationPd", originationPd)))
                .build();
    }

    private IslamicEclConfiguration murabahaConfig() {
        return IslamicEclConfiguration.builder()
                .id(1L)
                .contractTypeCode("MURABAHA")
                .status(IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                .baseLgd(new BigDecimal("0.450000"))
                .excludeDeferredProfit(true)
                .stage2DpdThreshold(30)
                .stage3DpdThreshold(90)
                .significantIncreasePdThreshold(new BigDecimal("0.050000"))
                .pdForwardLookingAdjustment(BigDecimal.ZERO)
                .pdTermStructure(new LinkedHashMap<>(Map.of("12", new BigDecimal("0.010000"), "60", new BigDecimal("0.040000"))))
                .pdScenarioWeights(new LinkedHashMap<>(Map.of("BASE", 50, "UPSIDE", 20, "DOWNSIDE", 30)))
                .murabahaLgdFactors(new LinkedHashMap<>(Map.of(
                        "collateralRecoveryRate", new BigDecimal("70"),
                        "collateralHaircut", new BigDecimal("20")
                )))
                .build();
    }

    private IslamicEclConfiguration ijarahConfig() {
        return IslamicEclConfiguration.builder()
                .id(2L)
                .contractTypeCode("IJARAH")
                .status(IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                .baseLgd(new BigDecimal("0.250000"))
                .stage2DpdThreshold(30)
                .stage3DpdThreshold(90)
                .significantIncreasePdThreshold(new BigDecimal("0.050000"))
                .pdForwardLookingAdjustment(BigDecimal.ZERO)
                .pdTermStructure(new LinkedHashMap<>(Map.of("12", new BigDecimal("0.010000"), "60", new BigDecimal("0.035000"))))
                .pdScenarioWeights(new LinkedHashMap<>(Map.of("BASE", 50, "UPSIDE", 20, "DOWNSIDE", 30)))
                .ijarahLgdFactors(new LinkedHashMap<>(Map.of(
                        "assetRecoveryRate", new BigDecimal("80"),
                        "assetLiquidationHaircut", new BigDecimal("15")
                )))
                .build();
    }

    private IslamicEclConfiguration musharakahConfig() {
        return IslamicEclConfiguration.builder()
                .id(3L)
                .contractTypeCode("MUSHARAKAH")
                .status(IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                .baseLgd(new BigDecimal("0.350000"))
                .stage2DpdThreshold(30)
                .stage3DpdThreshold(90)
                .significantIncreasePdThreshold(new BigDecimal("0.050000"))
                .pdForwardLookingAdjustment(BigDecimal.ZERO)
                .pdTermStructure(new LinkedHashMap<>(Map.of("12", new BigDecimal("0.012000"), "60", new BigDecimal("0.045000"))))
                .pdScenarioWeights(new LinkedHashMap<>(Map.of("BASE", 50, "UPSIDE", 20, "DOWNSIDE", 30)))
                .musharakahLgdFactors(new LinkedHashMap<>(Map.of(
                        "forcedSaleRecovery", new BigDecimal("65"),
                        "partialOwnershipDiscount", new BigDecimal("10")
                )))
                .build();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }
}
