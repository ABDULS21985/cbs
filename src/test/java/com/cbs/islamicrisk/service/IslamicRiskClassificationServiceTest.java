package com.cbs.islamicrisk.service;

import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicFinancingRiskClassificationRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicRiskClassificationServiceTest {

    @Mock private IslamicFinancingRiskClassificationRepository classificationRepository;
    @Mock private IslamicRiskSupport riskSupport;
    @Mock private IslamicEclService islamicEclService;
    @Mock private IslamicCollateralService islamicCollateralService;

    @InjectMocks
    private IslamicRiskClassificationService service;

    @BeforeEach
    void setUp() {
        lenient().when(riskSupport.currentActor()).thenReturn("risk.user");
        lenient().when(riskSupport.currentTenantId()).thenReturn(1L);
        lenient().when(riskSupport.uppercase(anyString())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });
        lenient().when(riskSupport.asBigDecimal(any())).thenAnswer(invocation -> {
            Object value = invocation.getArgument(0);
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
        });
        lenient().when(riskSupport.scaleMoney(any())).thenAnswer(invocation -> {
            Object value = invocation.getArgument(0);
            BigDecimal decimal = value instanceof BigDecimal bigDecimal ? bigDecimal : BigDecimal.ZERO;
            return decimal.setScale(2, RoundingMode.HALF_UP);
        });
        lenient().when(classificationRepository.save(any(IslamicFinancingRiskClassification.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void classifyContract_dpd45IsStage2ButStillAaoifiPerforming() {
        when(riskSupport.loadContract(1L, "MURABAHA")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                1L, "MRB-1", "MURABAHA", "MRB-HOME", 10L, 1L, null, null,
                new BigDecimal("100000"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 45, java.util.Map.of()
        ));
        when(islamicEclService.getEclHistory(1L)).thenReturn(List.of(IslamicEclCalculation.builder()
                .calculationDate(LocalDate.of(2026, 4, 1))
                .currentStage(IslamicRiskDomainEnums.Stage.STAGE_1)
                .stagingReason("Performing")
                .ead(new BigDecimal("100000"))
                .build()));
        when(islamicCollateralService.calculateCoverage(1L, "MURABAHA")).thenReturn(IslamicRiskResponses.CollateralCoverageResult.builder()
                .contractId(1L)
                .coverageRatio(new BigDecimal("80.00"))
                .ead(new BigDecimal("100000.00"))
                .totalCollateralValue(new BigDecimal("80000.00"))
                .byCollateralType(java.util.Map.of())
                .build());
        when(riskSupport.latestAssessment(10L, "MURABAHA")).thenReturn(IslamicCreditAssessment.builder()
                .estimatedPd(new BigDecimal("0.020000"))
                .inputData(new LinkedHashMap<>(java.util.Map.of("originationPd", new BigDecimal("0.010000"))))
                .build());
        when(classificationRepository.findTopByContractIdOrderByClassificationDateDesc(1L)).thenReturn(Optional.empty());

        IslamicFinancingRiskClassification result = service.classifyContract(1L, "MURABAHA", LocalDate.of(2026, 4, 5));

        assertThat(result.getIfrs9Stage()).isEqualTo(IslamicRiskDomainEnums.Stage.STAGE_2);
        assertThat(result.getAaoifiClassification()).isEqualTo(IslamicRiskDomainEnums.AaoifiClassification.PERFORMING);
        assertThat(result.getAaoifiMinimumProvisionRate()).isEqualByComparingTo("0.010000");
    }

    @Test
    void classifyContract_dpd95IsStage3AndSubstandard() {
        when(riskSupport.loadContract(2L, "IJARAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                2L, "IJR-1", "IJARAH", "IJR-VEH", 20L, 2L, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("90000"), new BigDecimal("10000"),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 95, java.util.Map.of()
        ));
        when(islamicEclService.getEclHistory(2L)).thenReturn(List.of(IslamicEclCalculation.builder()
                .calculationDate(LocalDate.of(2026, 4, 1))
                .currentStage(IslamicRiskDomainEnums.Stage.STAGE_3)
                .stagingReason("DPD > 90")
                .ead(new BigDecimal("100000"))
                .build()));
        when(islamicCollateralService.calculateCoverage(2L, "IJARAH")).thenReturn(IslamicRiskResponses.CollateralCoverageResult.builder()
                .contractId(2L)
                .coverageRatio(new BigDecimal("90.00"))
                .ead(new BigDecimal("100000.00"))
                .totalCollateralValue(new BigDecimal("90000.00"))
                .byCollateralType(java.util.Map.of())
                .build());
        when(riskSupport.latestAssessment(20L, "IJARAH")).thenReturn(IslamicCreditAssessment.builder()
                .estimatedPd(new BigDecimal("0.030000"))
                .inputData(new LinkedHashMap<>(java.util.Map.of("originationPd", new BigDecimal("0.010000"))))
                .build());
        when(classificationRepository.findTopByContractIdOrderByClassificationDateDesc(2L)).thenReturn(Optional.empty());

        IslamicFinancingRiskClassification result = service.classifyContract(2L, "IJARAH", LocalDate.of(2026, 4, 5));

        assertThat(result.getIfrs9Stage()).isEqualTo(IslamicRiskDomainEnums.Stage.STAGE_3);
        assertThat(result.getAaoifiClassification()).isEqualTo(IslamicRiskDomainEnums.AaoifiClassification.SUBSTANDARD);
    }
}
