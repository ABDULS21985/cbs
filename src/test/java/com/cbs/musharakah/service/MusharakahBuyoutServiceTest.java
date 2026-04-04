package com.cbs.musharakah.service;

import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.hijri.service.HijriCalendarService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahBuyoutServiceTest {

    @Mock private MusharakahContractRepository contractRepository;
    @Mock private MusharakahOwnershipUnitRepository ownershipUnitRepository;
    @Mock private MusharakahBuyoutInstallmentRepository installmentRepository;
    @Mock private MusharakahUnitService unitService;
    @Mock private MusharakahRentalService rentalService;
    @Mock private HijriCalendarService hijriCalendarService;

    @InjectMocks
    private MusharakahBuyoutService service;

    @Test
    void processCombinedPayment_appliesRentalFirstThenBuyout() {
        LocalDate paymentDate = LocalDate.of(2026, 4, 4);
        MusharakahRentalInstallment rentalInstallment = MusharakahRentalInstallment.builder()
                .contractId(1L)
                .installmentNumber(1)
                .rentalAmount(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .latePenaltyAmount(BigDecimal.ZERO)
                .status(MusharakahDomainEnums.InstallmentStatus.DUE)
                .build();
        MusharakahBuyoutInstallment buyoutInstallment = MusharakahBuyoutInstallment.builder()
                .contractId(1L)
                .installmentNumber(1)
                .unitsToTransfer(new BigDecimal("6.0000"))
                .pricePerUnit(new BigDecimal("100.000000"))
                .totalBuyoutAmount(new BigDecimal("600.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(MusharakahDomainEnums.InstallmentStatus.DUE)
                .build();

        when(rentalService.getNextDueInstallment(1L)).thenReturn(rentalInstallment);
        when(rentalService.processRentalPayment(eq(1L), any())).thenReturn(rentalInstallment);
        when(installmentRepository.findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
                eq(1L), org.mockito.ArgumentMatchers.<List<MusharakahDomainEnums.InstallmentStatus>>any()))
                .thenReturn(Optional.of(buyoutInstallment), Optional.of(buyoutInstallment));
        when(unitService.transferUnits(eq(1L), any(), eq(paymentDate), any(), eq("EXT-1")))
                .thenReturn(MusharakahUnitTransfer.builder().id(55L).build());
        when(installmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MusharakahResponses.CombinedPaymentResult result = service.processCombinedPayment(
                1L,
                MusharakahRequests.CombinedPaymentRequest.builder()
                        .totalPayment(new BigDecimal("1300.00"))
                        .paymentDate(paymentDate)
                        .externalRef("EXT-1")
                        .build());

        assertThat(result.getRentalPaid()).isEqualByComparingTo("1000.00");
        assertThat(result.getBuyoutPaid()).isEqualByComparingTo("300.00");
        assertThat(result.getUnitsTransferred()).isEqualByComparingTo("3.0000");
        assertThat(result.getUnappliedAmount()).isEqualByComparingTo("0.00");

        ArgumentCaptor<MusharakahRequests.ProcessRentalPaymentRequest> rentalCaptor =
                ArgumentCaptor.forClass(MusharakahRequests.ProcessRentalPaymentRequest.class);
        verify(rentalService).processRentalPayment(eq(1L), rentalCaptor.capture());
        assertThat(rentalCaptor.getValue().getPaymentAmount()).isEqualByComparingTo("1000.00");

        ArgumentCaptor<BigDecimal> unitCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(unitService).transferUnits(eq(1L), unitCaptor.capture(), eq(paymentDate), eq(new BigDecimal("300.00")), eq("EXT-1"));
        assertThat(unitCaptor.getValue()).isEqualByComparingTo("3.0000");
    }
}
