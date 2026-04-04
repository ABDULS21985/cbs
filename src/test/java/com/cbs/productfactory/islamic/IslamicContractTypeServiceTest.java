package com.cbs.productfactory.islamic;

import com.cbs.common.exception.BusinessException;
import com.cbs.productfactory.islamic.dto.IslamicProductRequest;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.repository.IslamicContractTypeRepository;
import com.cbs.productfactory.islamic.service.IslamicContractTypeService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicContractTypeServiceTest {

    @Mock
    private IslamicContractTypeRepository contractTypeRepository;

    @Mock
    private CurrentTenantResolver currentTenantResolver;

    private IslamicContractTypeService service;

    @BeforeEach
    void setUp() {
        service = new IslamicContractTypeService(
                contractTypeRepository,
                currentTenantResolver,
                new ObjectMapper().findAndRegisterModules()
        );
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
    }

    @Test
    @DisplayName("Murabaha validation passes when mandatory Shariah controls are provided")
    void validateMurabahaProduct_success() {
        when(contractTypeRepository.findById(1L)).thenReturn(Optional.of(contractType(1L, "MURABAHA")));

        IslamicProductRequest request = IslamicProductRequest.builder()
                .contractTypeId(1L)
                .markupRate(new BigDecimal("14.25"))
                .costPriceRequired(true)
                .sellingPriceImmutable(true)
                .latePenaltyToCharity(true)
                .charityGlAccountCode("GL-CHARITY")
                .build();

        assertThatCode(() -> service.validateProductAgainstContractType(request))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Murabaha validation fails when charity routing is missing")
    void validateMurabahaProduct_rejectsMissingCharityControl() {
        when(contractTypeRepository.findById(1L)).thenReturn(Optional.of(contractType(1L, "MURABAHA")));

        IslamicProductRequest request = IslamicProductRequest.builder()
                .contractTypeId(1L)
                .markupRate(new BigDecimal("14.25"))
                .costPriceRequired(true)
                .sellingPriceImmutable(true)
                .latePenaltyToCharity(false)
                .build();

        assertThatThrownBy(() -> service.validateProductAgainstContractType(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("latePenaltyToCharity=true");
    }

    @Test
    @DisplayName("Musharakah validation enforces 100 percent share split")
    void validateMusharakahProduct_rejectsInvalidShareSplit() {
        when(contractTypeRepository.findById(2L)).thenReturn(Optional.of(contractType(2L, "MUSHARAKAH")));

        IslamicProductRequest request = IslamicProductRequest.builder()
                .contractTypeId(2L)
                .bankSharePercentage(new BigDecimal("55"))
                .customerSharePercentage(new BigDecimal("35"))
                .build();

        assertThatThrownBy(() -> service.validateProductAgainstContractType(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("bankSharePercentage + customerSharePercentage = 100");
    }

    private IslamicContractType contractType(Long id, String code) {
        return IslamicContractType.builder()
                .id(id)
                .code(code)
                .name(code)
                .category(IslamicDomainEnums.ContractCategory.SALE_BASED)
                .accountingTreatment(IslamicDomainEnums.AccountingTreatment.AMORTISED_COST)
                .requiredProductFields(List.of())
                .status(IslamicDomainEnums.ContractTypeStatus.ACTIVE)
                .tenantId(1L)
                .build();
    }
}