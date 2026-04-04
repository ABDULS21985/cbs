package com.cbs.musharakah.service;

import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahContractServiceTest {

    @Mock private MusharakahContractRepository contractRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private AccountService accountService;
    @Mock private MusharakahUnitService unitService;
    @Mock private MusharakahRentalService rentalService;
    @Mock private MusharakahBuyoutService buyoutService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;
    @Mock private ShariahScreeningService shariahScreeningService;

    @InjectMocks
    private MusharakahContractService service;

    @Test
    void executeContract_withoutJointOwnership_rejected() {
        MusharakahContract contract = MusharakahContract.builder()
                .id(1L)
                .contractRef("MSH-FIN-2026-000001")
                .status(MusharakahDomainEnums.ContractStatus.DRAFT)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> service.executeContract(1L, "officer"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("JOINT_OWNERSHIP_REQUIRED");
    }

    @Test
    void calculateEarlyBuyout_fixedPricing_usesRemainingUnitsTimesUnitValue() {
        MusharakahContract contract = MusharakahContract.builder()
                .id(1L)
                .contractRef("MSH-FIN-2026-000001")
                .unitValue(new BigDecimal("10000.000000"))
                .earlyBuyoutPricingMethod(MusharakahDomainEnums.EarlyBuyoutPricingMethod.REMAINING_UNITS_AT_FIXED)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(unitService.getCurrentOwnership(1L)).thenReturn(MusharakahResponses.OwnershipState.builder()
                .contractId(1L)
                .bankUnits(new BigDecimal("40.0000"))
                .customerUnits(new BigDecimal("60.0000"))
                .currentUnitValue(new BigDecimal("12000.000000"))
                .build());
        when(rentalService.getRentalSummary(1L)).thenReturn(MusharakahResponses.MusharakahRentalSummary.builder()
                .contractId(1L)
                .totalOutstanding(new BigDecimal("2500.00"))
                .build());

        MusharakahResponses.EarlyBuyoutQuote quote = service.calculateEarlyBuyout(1L, LocalDate.of(2026, 4, 4));

        assertThat(quote.getPricePerUnit()).isEqualByComparingTo("10000.000000");
        assertThat(quote.getBuyoutAmount()).isEqualByComparingTo("400000.00");
        assertThat(quote.getRentalArrears()).isEqualByComparingTo("2500.00");
        assertThat(quote.getTotalAmount()).isEqualByComparingTo("402500.00");
    }
}
