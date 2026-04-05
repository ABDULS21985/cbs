package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.gl.service.GeneralLedgerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicFeeAccrualServiceTest {

    @Mock private IslamicFeeConfigurationRepository configRepository;
    @Mock private FeeChargeLogRepository feeChargeLogRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private AccountPostingService accountPostingService;
    @Mock private IslamicFeeService islamicFeeService;
    @Mock private CurrentActorProvider actorProvider;

    @InjectMocks private IslamicFeeAccrualService service;

    @Test
    @DisplayName("accrual batch is idempotent for an already accrued account-period trigger")
    void accruePeriodicFees_skipsExistingTriggerRef() {
        IslamicFeeConfiguration config = IslamicFeeConfiguration.builder()
                .id(1L)
                .feeCode("GEN-FEE-MAINT-001")
                .feeType("FLAT")
                .flatAmount(new BigDecimal("25.00"))
                .chargeFrequency("MONTHLY")
                .applicableProductCodes(List.of("WAD-SAVINGS"))
                .status("ACTIVE")
                .effectiveFrom(LocalDate.of(2026, 1, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31))
                .build();
        Account account = Account.builder()
                .id(10L)
                .status(AccountStatus.ACTIVE)
                .currencyCode("SAR")
                .bookBalance(new BigDecimal("1000.00"))
                .product(Product.builder().code("WAD-SAVINGS").build())
                .build();

        when(configRepository.findByStatusOrderByFeeCodeAsc("ACTIVE")).thenReturn(List.of(config));
        when(accountRepository.findByStatus(eq(AccountStatus.ACTIVE), eq(PageRequest.of(0, 200))))
                .thenReturn(new PageImpl<>(List.of(account)));
        when(feeChargeLogRepository.existsByTriggerRef("GEN-FEE-MAINT-001:10:2026-04")).thenReturn(true);

        service.accruePeriodicFees(LocalDate.of(2026, 4, 30));

        verify(islamicFeeService, never()).calculateFee(any(Long.class), any(IslamicFeeResponses.FeeCalculationContext.class));
        verify(generalLedgerService, never()).postJournal(anyString(), anyString(), anyString(), anyString(), any(), anyString(), any());
    }

    @Test
    @DisplayName("income report counts deferred recognition entries instead of original deferred charge amount")
    void getFeeIncomeReport_usesRecognisedIncomeOnly() {
        IslamicFeeConfiguration config = IslamicFeeConfiguration.builder()
                .id(2L)
                .feeCode("IJR-FEE-DOC-001")
                .feeCategory("DOCUMENTATION")
                .build();
        Instant reportInstant = LocalDate.of(2026, 4, 10).atStartOfDay(ZoneId.systemDefault()).toInstant();
        FeeChargeLog deferredCharge = FeeChargeLog.builder()
                .id(100L)
                .islamicFeeConfigurationId(2L)
                .charityRouted(false)
                .feeAmount(new BigDecimal("1200.00"))
                .deferredTotalAmount(new BigDecimal("1200.00"))
                .deferredRemainingAmount(new BigDecimal("1100.00"))
                .status("DEFERRED")
                .chargedAt(reportInstant)
                .build();
        FeeChargeLog recognisedSlice = FeeChargeLog.builder()
                .id(101L)
                .islamicFeeConfigurationId(2L)
                .charityRouted(false)
                .feeAmount(new BigDecimal("100.00"))
                .triggerEvent("DEFERRED_RECOGNITION")
                .status("RECOGNISED")
                .chargedAt(reportInstant)
                .build();
        FeeChargeLog normalCharge = FeeChargeLog.builder()
                .id(102L)
                .islamicFeeConfigurationId(2L)
                .charityRouted(false)
                .feeAmount(new BigDecimal("50.00"))
                .status("CHARGED")
                .chargedAt(reportInstant)
                .build();

        when(feeChargeLogRepository.findByChargedAtBetweenOrderByChargedAtDesc(any(), any()))
                .thenReturn(List.of(deferredCharge, recognisedSlice, normalCharge));
        when(configRepository.findById(2L)).thenReturn(Optional.of(config));
        when(feeChargeLogRepository.findByDeferredRemainingAmountGreaterThanOrderByChargedAtAsc(BigDecimal.ZERO))
                .thenReturn(List.of(deferredCharge));
        when(feeChargeLogRepository.findByStatusAndReceivableBalanceGreaterThanOrderByChargedAtAsc("ACCRUED", BigDecimal.ZERO))
                .thenReturn(List.of());

        IslamicFeeResponses.FeeIncomeReport report = service.getFeeIncomeReport(
                LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 30));

        assertThat(report.getUjrahIncome()).isEqualByComparingTo("150.00");
        assertThat(report.getDeferredFeeBalance()).isEqualByComparingTo("1100.00");
        assertThat(report.getByFeeCategory()).containsEntry("DOCUMENTATION", new BigDecimal("150.00"));
    }
}
