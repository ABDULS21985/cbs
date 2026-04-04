package com.cbs.fees.islamic.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.LatePenaltyRecord;
import com.cbs.fees.islamic.repository.LatePenaltyRecordRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LatePenaltyServiceTest {

    @Mock private IslamicFeeService islamicFeeService;
    @Mock private LatePenaltyRecordRepository latePenaltyRecordRepository;
    @Mock private MurabahaContractRepository murabahaContractRepository;
    @Mock private MurabahaInstallmentRepository murabahaInstallmentRepository;
    @Mock private IjarahContractRepository ijarahContractRepository;
    @Mock private IjarahRentalInstallmentRepository ijarahRentalInstallmentRepository;
    @Mock private MusharakahContractRepository musharakahContractRepository;
    @Mock private MusharakahRentalInstallmentRepository musharakahRentalInstallmentRepository;
    @Mock private MusharakahBuyoutInstallmentRepository musharakahBuyoutInstallmentRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks private LatePenaltyService service;

    @Test
    @DisplayName("process late penalty blocks compounding when unpaid penalty already exists")
    void processLatePenalty_blocksCompounding() {
        when(latePenaltyRecordRepository.findFirstByInstallmentIdAndStatusOrderByPenaltyDateDesc(200L, "CHARGED"))
                .thenReturn(Optional.of(LatePenaltyRecord.builder().id(1L).build()));
        when(latePenaltyRecordRepository.sumChargedByContractId(100L)).thenReturn(new BigDecimal("250.00"));

        IslamicFeeResponses.LatePenaltyResult result = service.processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                .contractId(100L)
                .installmentId(200L)
                .contractRef("MRB-100")
                .contractTypeCode("MURABAHA")
                .overdueAmount(new BigDecimal("1200.00"))
                .daysOverdue(15)
                .penaltyDate(LocalDate.of(2026, 4, 4))
                .build());

        assertThat(result.isPenaltyCharged()).isFalse();
        assertThat(result.getReason()).isEqualTo("Existing unpaid penalty - compounding prohibited");
        assertThat(result.getTotalPenaltiesOnContract()).isEqualByComparingTo("250.00");
        verify(islamicFeeService, never()).findApplicableLatePenaltyFee(anyString(), anyString());
    }

    @Test
    @DisplayName("process late penalty blocks further charging when annual cap is already reached")
    void processLatePenalty_blocksWhenAnnualCapReached() {
        when(latePenaltyRecordRepository.findFirstByInstallmentIdAndStatusOrderByPenaltyDateDesc(201L, "CHARGED"))
                .thenReturn(Optional.empty());
        when(murabahaContractRepository.findById(101L)).thenReturn(Optional.of(
                MurabahaContract.builder()
                        .id(101L)
                        .contractRef("MRB-101")
                        .productCode("MRB-HOME")
                        .customerId(99L)
                        .accountId(10L)
                        .currencyCode("SAR")
                        .financedAmount(new BigDecimal("100000.00"))
                        .gracePeriodDays(5)
                        .build()));
        when(islamicFeeService.findApplicableLatePenaltyFee("MURABAHA", "MRB-HOME")).thenReturn(
                IslamicFeeConfiguration.builder()
                        .id(1L)
                        .feeCode("GEN-FEE-LATE-001")
                        .annualPenaltyCapAmount(new BigDecimal("500.00"))
                        .build());
        when(latePenaltyRecordRepository.sumChargedByContractIdBetween(
                eq(101L),
                eq(LocalDate.of(2026, 1, 1)),
                eq(LocalDate.of(2026, 12, 31))))
                .thenReturn(new BigDecimal("500.00"));
        when(latePenaltyRecordRepository.sumChargedByContractId(101L)).thenReturn(new BigDecimal("500.00"));

        IslamicFeeResponses.LatePenaltyResult result = service.processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                .contractId(101L)
                .installmentId(201L)
                .contractRef("MRB-101")
                .contractTypeCode("MURABAHA")
                .overdueAmount(new BigDecimal("3000.00"))
                .daysOverdue(12)
                .penaltyDate(LocalDate.of(2026, 4, 4))
                .build());

        assertThat(result.isPenaltyCharged()).isFalse();
        assertThat(result.getReason()).isEqualTo("Annual penalty cap reached");
        assertThat(result.getTotalPenaltiesOnContract()).isEqualByComparingTo("500.00");
        verify(islamicFeeService, never()).chargeFee(any());
    }
}
