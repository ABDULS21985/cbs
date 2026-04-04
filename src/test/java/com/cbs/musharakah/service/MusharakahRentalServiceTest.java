package com.cbs.musharakah.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahRentalServiceTest {

    @Mock private MusharakahContractRepository contractRepository;
    @Mock private MusharakahOwnershipUnitRepository ownershipUnitRepository;
    @Mock private MusharakahRentalInstallmentRepository installmentRepository;
    @Mock private MusharakahBuyoutInstallmentRepository buyoutInstallmentRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private MusharakahRentalService service;

    @Test
    void generateRentalSchedule_diminishesAsBankShareShrinks() {
        when(contractRepository.findById(1L)).thenReturn(Optional.of(baseContract()));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.of(baseOwnership()));
        when(installmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L)).thenReturn(List.of());
        when(buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L)).thenReturn(List.of(
                MusharakahBuyoutInstallment.builder()
                        .installmentNumber(1)
                        .unitsToTransfer(BigDecimal.ONE)
                        .status(MusharakahDomainEnums.InstallmentStatus.SCHEDULED)
                        .build(),
                MusharakahBuyoutInstallment.builder()
                        .installmentNumber(2)
                        .unitsToTransfer(BigDecimal.ONE)
                        .status(MusharakahDomainEnums.InstallmentStatus.SCHEDULED)
                        .build()));
        when(hijriCalendarService.isIslamicBusinessDay(any())).thenReturn(true);
        when(hijriCalendarService.toHijri(any())).thenReturn(HijriDateResponse.builder()
                .hijriYear(1447)
                .hijriMonth(10)
                .hijriDay(1)
                .build());
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(installmentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<MusharakahRentalInstallment> schedule = service.generateRentalSchedule(1L);

        assertThat(schedule).hasSize(2);
        assertThat(schedule.get(0).getRentalAmount()).isEqualByComparingTo("8000.00");
        assertThat(schedule.get(1).getRentalAmount()).isEqualByComparingTo("7900.00");
        assertThat(schedule.get(0).getRentalAmount()).isGreaterThan(schedule.get(1).getRentalAmount());
    }

    @Test
    void getCombinedSchedule_reflectsDecliningTotalPayments() {
        when(installmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L)).thenReturn(List.of(
                MusharakahRentalInstallment.builder()
                        .installmentNumber(1)
                        .dueDate(LocalDate.of(2026, 5, 1))
                        .bankOwnershipAtPeriodStart(new BigDecimal("80.0000"))
                        .rentalAmount(new BigDecimal("8000.00"))
                        .build(),
                MusharakahRentalInstallment.builder()
                        .installmentNumber(2)
                        .dueDate(LocalDate.of(2026, 6, 1))
                        .bankOwnershipAtPeriodStart(new BigDecimal("79.0000"))
                        .rentalAmount(new BigDecimal("7900.00"))
                        .build()));
        when(buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L)).thenReturn(List.of(
                MusharakahBuyoutInstallment.builder()
                        .installmentNumber(1)
                        .dueDate(LocalDate.of(2026, 5, 1))
                        .totalBuyoutAmount(new BigDecimal("10000.00"))
                        .bankPercentageAfter(new BigDecimal("79.0000"))
                        .build(),
                MusharakahBuyoutInstallment.builder()
                        .installmentNumber(2)
                        .dueDate(LocalDate.of(2026, 6, 1))
                        .totalBuyoutAmount(new BigDecimal("10000.00"))
                        .bankPercentageAfter(new BigDecimal("78.0000"))
                        .build()));

        MusharakahResponses.MusharakahCombinedSchedule schedule = service.getCombinedSchedule(1L);

        assertThat(schedule.getFirstPayment()).isEqualByComparingTo("18000.00");
        assertThat(schedule.getLastPayment()).isEqualByComparingTo("17900.00");
        assertThat(schedule.getTotalPaymentOverLifetime()).isEqualByComparingTo("35900.00");
    }

    private MusharakahContract baseContract() {
        return MusharakahContract.builder()
                .id(1L)
                .tenorMonths(2)
                .startDate(LocalDate.of(2026, 4, 1))
                .firstPaymentDate(LocalDate.of(2026, 5, 1))
                .rentalFrequency(MusharakahDomainEnums.RentalFrequency.MONTHLY)
                .baseRentalRate(new BigDecimal("12.0000"))
                .build();
    }

    private MusharakahOwnershipUnit baseOwnership() {
        return MusharakahOwnershipUnit.builder()
                .contractId(1L)
                .totalUnits(100)
                .bankUnits(new BigDecimal("80.0000"))
                .customerUnits(new BigDecimal("20.0000"))
                .currentUnitValue(new BigDecimal("10000.000000"))
                .build();
    }
}
