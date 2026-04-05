package com.cbs.islamicrisk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicCollateralExtensionRepository;
import com.cbs.lending.entity.CollateralType;
import com.cbs.lending.repository.CollateralRepository;
import com.cbs.lending.service.CollateralService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicCollateralServiceTest {

    @Mock private IslamicCollateralExtensionRepository extensionRepository;
    @Mock private CollateralRepository collateralRepository;
    @Mock private CollateralService collateralService;
    @Mock private IslamicRiskSupport riskSupport;

    @InjectMocks
    private IslamicCollateralService service;

    @BeforeEach
    void setUp() {
        lenient().when(riskSupport.uppercase(anyString())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });
        lenient().when(riskSupport.scaleMoney(any())).thenAnswer(invocation -> {
            Object value = invocation.getArgument(0);
            BigDecimal decimal = value instanceof BigDecimal bigDecimal ? bigDecimal : BigDecimal.ZERO;
            return decimal.setScale(2, RoundingMode.HALF_UP);
        });
    }

    @Test
    void registerCollateral_rejectsConventionalBondCollateral() {
        IslamicRiskRequests.RegisterIslamicCollateralRequest request = IslamicRiskRequests.RegisterIslamicCollateralRequest.builder()
                .customerId(1L)
                .contractId(10L)
                .contractTypeCode("MURABAHA")
                .collateralType(CollateralType.SECURITIES)
                .description("Conventional bond portfolio")
                .marketValue(new BigDecimal("500000"))
                .currencyCode("SAR")
                .islamicCollateralType(IslamicRiskDomainEnums.IslamicCollateralType.SUKUK)
                .build();

        assertThatThrownBy(() -> service.registerCollateral(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("PROHIBITED_COLLATERAL");
    }

    @Test
    void calculateCoverage_includesIjarahAssetAsImplicitSecurity() {
        when(riskSupport.loadContract(11L, "IJARAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                11L, "IJR-1", "IJARAH", "IJR-VEH", 1L, 1L, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("90000"), new BigDecimal("10000"),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, java.util.Map.of()
        ));
        when(extensionRepository.findByContractId(11L)).thenReturn(List.of());

        IslamicRiskResponses.CollateralCoverageResult result = service.calculateCoverage(11L, "IJARAH");

        assertThat(result.getTotalCollateralValue()).isEqualByComparingTo("90000.00");
        assertThat(result.getEad()).isEqualByComparingTo("100000.00");
        assertThat(result.getByCollateralType())
                .containsEntry(IslamicRiskDomainEnums.IslamicCollateralType.IJARAH_ASSET_OWNERSHIP.name(), new BigDecimal("90000"));
    }

    @Test
    void calculateCoverage_includesMusharakahBankShareAsImplicitSecurity() {
        when(riskSupport.loadContract(12L, "MUSHARAKAH")).thenReturn(new IslamicRiskSupport.ContractSnapshot(
                12L, "MSH-1", "MUSHARAKAH", "MSH-HOME", 1L, 1L, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("40000"), new BigDecimal("40.0"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, java.util.Map.of()
        ));
        when(extensionRepository.findByContractId(12L)).thenReturn(List.of());

        IslamicRiskResponses.CollateralCoverageResult result = service.calculateCoverage(12L, "MUSHARAKAH");

        assertThat(result.getTotalCollateralValue()).isEqualByComparingTo("40000.00");
        assertThat(result.getEad()).isEqualByComparingTo("40000.00");
        assertThat(result.getCoverageRatio()).isEqualByComparingTo("100.00");
        assertThat(result.getByCollateralType())
                .containsEntry(IslamicRiskDomainEnums.IslamicCollateralType.MUSHARAKAH_SHARE.name(), new BigDecimal("40000"));
    }
}
