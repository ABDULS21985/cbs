package com.cbs.islamicrisk.service;

import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicEclCalculationRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicCreditRiskDashboardServiceTest {

    @Mock private IslamicRiskSupport riskSupport;
    @Mock private IslamicEclCalculationRepository eclCalculationRepository;
    @Mock private IslamicFinancingRiskClassificationRepository classificationRepository;
    @Mock private IslamicCollateralService islamicCollateralService;
    @Mock private IslamicRiskClassificationService classificationService;
    @Mock private IslamicEclService islamicEclService;

    @InjectMocks
    private IslamicCreditRiskDashboardService service;

    @BeforeEach
    void setUp() {
        lenient().when(riskSupport.uppercase(anyString())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });
        lenient().when(riskSupport.scaleMoney(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            Object value = invocation.getArgument(0);
            BigDecimal decimal = value instanceof BigDecimal bigDecimal ? bigDecimal : BigDecimal.ZERO;
            return decimal.setScale(2, RoundingMode.HALF_UP);
        });
    }

    @Test
    void getPortfolioOverview_calculatesNplRatioAsStage3ExposureOverTotalExposure() {
        LocalDate asOf = LocalDate.of(2026, 4, 5);

        when(riskSupport.activeContractIds("MURABAHA")).thenReturn(List.of(1L));
        when(riskSupport.activeContractIds("IJARAH")).thenReturn(List.of(2L));
        when(riskSupport.activeContractIds("MUSHARAKAH")).thenReturn(List.of());

        when(riskSupport.loadContract(1L, "MURABAHA")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                1L, "MRB-1", "MURABAHA", "MRB-HOME", 10L, 1L, null, "HOME_FINANCING",
                new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 95, java.util.Map.of()
        ));
        when(riskSupport.loadContract(2L, "IJARAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                2L, "IJR-1", "IJARAH", "IJR-VEH", 20L, 2L, null, "VEHICLE",
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("150"), new BigDecimal("50"),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, java.util.Map.of()
        ));

        when(eclCalculationRepository.findTopByContractIdOrderByCalculationDateDesc(1L)).thenReturn(Optional.of(IslamicEclCalculation.builder()
                .contractId(1L)
                .weightedEcl(new BigDecimal("10"))
                .ead(new BigDecimal("100"))
                .build()));
        when(eclCalculationRepository.findTopByContractIdOrderByCalculationDateDesc(2L)).thenReturn(Optional.of(IslamicEclCalculation.builder()
                .contractId(2L)
                .weightedEcl(new BigDecimal("20"))
                .ead(new BigDecimal("200"))
                .build()));

        when(classificationRepository.findTopByContractIdOrderByClassificationDateDesc(1L)).thenReturn(Optional.of(IslamicFinancingRiskClassification.builder()
                .contractId(1L)
                .ifrs9Stage(IslamicRiskDomainEnums.Stage.STAGE_3)
                .aaoifiClassification(IslamicRiskDomainEnums.AaoifiClassification.SUBSTANDARD)
                .build()));
        when(classificationRepository.findTopByContractIdOrderByClassificationDateDesc(2L)).thenReturn(Optional.of(IslamicFinancingRiskClassification.builder()
                .contractId(2L)
                .ifrs9Stage(IslamicRiskDomainEnums.Stage.STAGE_1)
                .aaoifiClassification(IslamicRiskDomainEnums.AaoifiClassification.PERFORMING)
                .build()));

        IslamicRiskResponses.PortfolioOverview overview = service.getPortfolioOverview(asOf);

        assertThat(overview.getTotalIslamicFinancing()).isEqualByComparingTo("300.00");
        assertThat(overview.getTotalEcl()).isEqualByComparingTo("30.00");
        assertThat(overview.getNplRatio()).isEqualByComparingTo("33.33");
        assertThat(overview.getByContractType())
                .containsEntry("MURABAHA", new BigDecimal("100"))
                .containsEntry("IJARAH", new BigDecimal("200"));
    }
}
