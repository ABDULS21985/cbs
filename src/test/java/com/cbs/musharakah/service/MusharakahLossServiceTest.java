package com.cbs.musharakah.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahLossEvent;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahLossEventRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahLossServiceTest {

    @Mock private MusharakahContractRepository contractRepository;
    @Mock private MusharakahOwnershipUnitRepository ownershipUnitRepository;
    @Mock private MusharakahLossEventRepository lossEventRepository;
    @Mock private MusharakahRentalInstallmentRepository rentalInstallmentRepository;
    @Mock private MusharakahBuyoutInstallmentRepository buyoutInstallmentRepository;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private CurrentActorProvider actorProvider;

    @InjectMocks
    private MusharakahLossService service;

    @Test
    void allocateLoss_usesCurrentCapitalRatio() {
        MusharakahLossEvent event = assessedLossEvent();
        when(lossEventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.of(
                MusharakahOwnershipUnit.builder()
                        .contractId(1L)
                        .bankPercentage(new BigDecimal("80.0000"))
                        .customerPercentage(new BigDecimal("20.0000"))
                        .build()));
        when(lossEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MusharakahResponses.MusharakahLossEventResponse response = service.allocateLoss(1L);

        assertThat(response.getBankLossShare()).isEqualByComparingTo("80000.00");
        assertThat(response.getCustomerLossShare()).isEqualByComparingTo("20000.00");
        assertThat(response.getAllocationMethod()).contains("ST-005");
    }

    @Test
    void allocateLoss_withProfitRatioAttempt_rejected() {
        MusharakahLossEvent event = assessedLossEvent();
        when(lossEventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.of(
                MusharakahOwnershipUnit.builder()
                        .contractId(1L)
                        .bankPercentage(new BigDecimal("80.0000"))
                        .customerPercentage(new BigDecimal("20.0000"))
                        .build()));

        assertThatThrownBy(() -> service.allocateLoss(1L, new BigDecimal("30000.00"), new BigDecimal("70000.00")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-MSH-001");
    }

    @Test
    void postLoss_passesLossPhaseContextToPostingRules() {
        MusharakahLossEvent event = assessedLossEvent();
        event.setStatus(MusharakahDomainEnums.LossStatus.ALLOCATED);
        event.setBankLossShare(new BigDecimal("80000.00"));
        event.setCustomerLossShare(new BigDecimal("20000.00"));
        MusharakahContract contract = MusharakahContract.builder()
                .id(1L)
                .accountId(9L)
                .assetCurrentMarketValue(new BigDecimal("1000000.00"))
                .totalCapital(new BigDecimal("1000000.00"))
                .unitValue(new BigDecimal("10000.000000"))
                .build();
        MusharakahOwnershipUnit ownership = MusharakahOwnershipUnit.builder()
                .contractId(1L)
                .totalUnits(100)
                .bankUnits(new BigDecimal("80.0000"))
                .customerUnits(new BigDecimal("20.0000"))
                .currentUnitValue(new BigDecimal("10000.000000"))
                .bankShareValue(new BigDecimal("800000.00"))
                .customerShareValue(new BigDecimal("200000.00"))
                .build();

        when(lossEventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(ownershipUnitRepository.findByContractId(1L)).thenReturn(Optional.of(ownership));
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(JournalEntry.builder().journalNumber("JRN-BANK").build())
                .thenReturn(JournalEntry.builder().journalNumber("JRN-CUST").build());
        when(ownershipUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(lossEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(actorProvider.getCurrentActor()).thenReturn("finance.user");

        service.postLoss(1L);

        ArgumentCaptor<IslamicPostingRequest> captor = ArgumentCaptor.forClass(IslamicPostingRequest.class);
        verify(postingRuleService, times(2)).postIslamicTransaction(captor.capture());
        assertThat(captor.getAllValues().get(0).getAdditionalContext()).containsEntry("lossPhase", "BANK");
        assertThat(captor.getAllValues().get(1).getAdditionalContext()).containsEntry("lossPhase", "CUSTOMER");
        assertThat(event.getStatus()).isEqualTo(MusharakahDomainEnums.LossStatus.POSTED);
    }

    private MusharakahLossEvent assessedLossEvent() {
        return MusharakahLossEvent.builder()
                .id(1L)
                .contractId(1L)
                .lossEventRef("MSH-LOSS-2026-000001")
                .lossDate(LocalDate.of(2026, 4, 4))
                .lossType(MusharakahDomainEnums.LossType.ASSET_IMPAIRMENT)
                .totalLossAmount(new BigDecimal("100000.00"))
                .insuranceRecoveryExpected(BigDecimal.ZERO)
                .status(MusharakahDomainEnums.LossStatus.ASSESSED)
                .build();
    }
}
