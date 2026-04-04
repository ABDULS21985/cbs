package com.cbs.musharakah.service;

import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahUnitTransferRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahUnitServiceTest {

    @Mock private MusharakahContractRepository contractRepository;
    @Mock private MusharakahOwnershipUnitRepository ownershipUnitRepository;
    @Mock private MusharakahUnitTransferRepository unitTransferRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;
    @Mock private MusharakahRentalService rentalService;

    @InjectMocks
    private MusharakahUnitService service;

    @Test
    void initialiseUnits_withEightyTwentySplit_createsExpectedOwnership() {
        MusharakahContract contract = baseContract();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.empty());
        when(ownershipUnitRepository.save(any())).thenAnswer(invocation -> {
            MusharakahOwnershipUnit ownership = invocation.getArgument(0);
            ownership.setId(11L);
            return ownership;
        });

        MusharakahOwnershipUnit ownership = service.initialiseUnits(1L);

        assertThat(ownership.getBankUnits()).isEqualByComparingTo("80.0000");
        assertThat(ownership.getCustomerUnits()).isEqualByComparingTo("20.0000");
        assertThat(ownership.getBankPercentage()).isEqualByComparingTo("80.0000");
        assertThat(ownership.getCustomerPercentage()).isEqualByComparingTo("20.0000");
        assertThat(ownership.getBankShareValue()).isEqualByComparingTo("800000.00");
    }

    @Test
    void transferUnits_withFixedPricing_reducesBankUnitsAndRecordsTransfer() {
        LocalDate transferDate = LocalDate.of(2026, 4, 4);
        MusharakahContract contract = baseContract();
        MusharakahOwnershipUnit ownership = baseOwnership();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.of(ownership));
        when(unitTransferRepository.findFirstByContractIdOrderByTransferNumberDesc(1L)).thenReturn(Optional.empty());
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(JournalEntry.builder().journalNumber("JRN-UNIT-1").build());
        when(hijriCalendarService.toHijri(transferDate))
                .thenReturn(HijriDateResponse.builder().hijriYear(1447).hijriMonth(10).hijriDay(15).build());
        when(ownershipUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(unitTransferRepository.save(any())).thenAnswer(invocation -> {
            MusharakahUnitTransfer transfer = invocation.getArgument(0);
            transfer.setId(21L);
            return transfer;
        });
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MusharakahUnitTransfer transfer = service.transferUnits(1L, BigDecimal.ONE, transferDate);

        assertThat(transfer.getPricePerUnit()).isEqualByComparingTo("10000.000000");
        assertThat(transfer.getTotalTransferPrice()).isEqualByComparingTo("10000.00");
        assertThat(transfer.getBankUnitsAfter()).isEqualByComparingTo("79.0000");
        assertThat(transfer.getCustomerUnitsAfter()).isEqualByComparingTo("21.0000");
        assertThat(transfer.getBankPercentageAfter()).isEqualByComparingTo("79.0000");
        verify(rentalService).recalculateRemainingRentals(1L);
    }

    private MusharakahContract baseContract() {
        return MusharakahContract.builder()
                .id(1L)
                .contractRef("MSH-FIN-2026-000001")
                .accountId(7L)
                .currencyCode("SAR")
                .bankCapitalContribution(new BigDecimal("800000.00"))
                .customerCapitalContribution(new BigDecimal("200000.00"))
                .totalCapital(new BigDecimal("1000000.00"))
                .totalOwnershipUnits(100)
                .bankCurrentUnits(new BigDecimal("80.0000"))
                .customerCurrentUnits(new BigDecimal("20.0000"))
                .bankOwnershipPercentage(new BigDecimal("80.0000"))
                .customerOwnershipPercentage(new BigDecimal("20.0000"))
                .unitValue(new BigDecimal("10000.000000"))
                .unitPricingMethod(MusharakahDomainEnums.UnitPricingMethod.FIXED_AT_INCEPTION)
                .totalBuyoutPaymentsReceived(BigDecimal.ZERO)
                .status(MusharakahDomainEnums.ContractStatus.ACTIVE)
                .build();
    }

    private MusharakahOwnershipUnit baseOwnership() {
        return MusharakahOwnershipUnit.builder()
                .id(11L)
                .contractId(1L)
                .totalUnits(100)
                .bankUnits(new BigDecimal("80.0000"))
                .customerUnits(new BigDecimal("20.0000"))
                .bankPercentage(new BigDecimal("80.0000"))
                .customerPercentage(new BigDecimal("20.0000"))
                .unitValueAtInception(new BigDecimal("10000.000000"))
                .currentUnitValue(new BigDecimal("10000.000000"))
                .bankShareValue(new BigDecimal("800000.00"))
                .customerShareValue(new BigDecimal("200000.00"))
                .totalUnitsTransferred(new BigDecimal("0.0000"))
                .isFullyBoughtOut(false)
                .build();
    }
}
