package com.cbs.zakat.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZakatMethodology;
import com.cbs.zakat.repository.ZakatMethodologyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ZakatMethodologyServiceTest {

    @Mock
    private ZakatMethodologyRepository methodologyRepository;

    @Mock
    private FatwaRecordRepository fatwaRecordRepository;

    @Mock
    private CurrentTenantResolver tenantResolver;

    @InjectMocks
    private ZakatMethodologyService service;

    @Test
    @DisplayName("Validation rejects unapproved methodology")
    void validateMethodologyApprovedRejectsUnapprovedMethodology() {
        ZakatMethodology methodology = baseMethodology();
        methodology.setSsbApproved(false);

        when(methodologyRepository.findByMethodologyCode("ZKT-TEST")).thenReturn(Optional.of(methodology));

        assertThatThrownBy(() -> service.validateMethodologyApproved("ZKT-TEST"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not approved");
    }

    @Test
    @DisplayName("Validation returns active approved methodology")
    void validateMethodologyApprovedReturnsMethodology() {
        ZakatMethodology methodology = baseMethodology();

        when(methodologyRepository.findByMethodologyCode("ZKT-TEST")).thenReturn(Optional.of(methodology));

        ZakatMethodology result = service.validateMethodologyApproved("ZKT-TEST");

        assertThat(result.getMethodologyCode()).isEqualTo("ZKT-TEST");
        assertThat(result.isSsbApproved()).isTrue();
    }

    private ZakatMethodology baseMethodology() {
        return ZakatMethodology.builder()
                .methodologyCode("ZKT-TEST")
                .name("Test methodology")
                .methodType(ZakatDomainEnums.MethodType.NET_ASSETS)
                .zakatRateBasis(ZakatDomainEnums.ZakatRateBasis.HIJRI_YEAR)
                .balanceMethod(ZakatDomainEnums.BalanceMethod.END_OF_YEAR)
                .nisabBasis(ZakatDomainEnums.NisabBasis.GOLD_85G)
                .customerZakatDeductionPolicy(ZakatDomainEnums.CustomerZakatDeductionPolicy.MANDATORY_SAUDI_NATIONALS)
                .iahTreatment(ZakatDomainEnums.IahTreatment.DEDUCTIBLE)
                .perIrrTreatment(ZakatDomainEnums.PerIrrTreatment.PER_SSB_RULING)
                .ssbReviewFrequency(ZakatDomainEnums.ReviewFrequency.ANNUAL)
                .classificationRuleSetCode("ZKT-TEST")
                .effectiveFrom(LocalDate.now().minusDays(30))
                .status(ZakatDomainEnums.MethodologyStatus.ACTIVE)
                .ssbApproved(true)
                .build();
    }
}