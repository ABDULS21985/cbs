package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.islamic.repository.IslamicFeeWaiverRepository;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.shariahcompliance.service.CharityFundService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IslamicFeeWaiverServiceTest {

    @Mock private IslamicFeeWaiverRepository waiverRepository;
    @Mock private IslamicFeeConfigurationRepository configurationRepository;
    @Mock private FeeChargeLogRepository feeChargeLogRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CharityFundService charityFundService;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks private IslamicFeeWaiverService service;

    private Account account;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(10L)
                .accountNumber("00010002")
                .accountName("Islamic Account")
                .currencyCode("SAR")
                .customer(Customer.builder()
                        .id(99L)
                        .cifNumber("CIF-99")
                        .customerType(CustomerType.INDIVIDUAL)
                        .status(CustomerStatus.ACTIVE)
                        .build())
                .build();
        when(actorProvider.getCurrentActor()).thenReturn("maker");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(waiverRepository.save(any(IslamicFeeWaiver.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(accountPostingService.balanceLeg(anyString(), any(), any(BigDecimal.class), anyString(), any(BigDecimal.class),
                anyString(), any(), any()))
                .thenAnswer(invocation -> new AccountPostingService.GlPostingLeg(
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        invocation.getArgument(2),
                        invocation.getArgument(3),
                        invocation.getArgument(4),
                        invocation.getArgument(5),
                        invocation.getArgument(6),
                        invocation.getArgument(7),
                        "HEAD"));
    }

    @Test
    @DisplayName("request waiver assigns regional manager authority for SAR 3,000")
    void requestWaiver_assignsRegionalManagerAuthority() {
        when(configurationRepository.findById(1L)).thenReturn(Optional.of(
                IslamicFeeConfiguration.builder()
                        .id(1L)
                        .feeCode("MRB-FEE-DOC-001")
                        .charityRouted(false)
                        .build()));

        IslamicFeeWaiver waiver = service.requestWaiver(IslamicFeeRequests.RequestFeeWaiverRequest.builder()
                .feeConfigId(1L)
                .customerId(99L)
                .originalFeeAmount(new BigDecimal("5000.00"))
                .waivedAmount(new BigDecimal("3000.00"))
                .currencyCode("SAR")
                .waiverType("PARTIAL_WAIVER")
                .reason("CUSTOMER_HARDSHIP")
                .justificationDetail("Temporary hardship")
                .build());

        assertThat(waiver.getAuthorityLevel()).isEqualTo("REGIONAL_MANAGER");
        assertThat(waiver.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(waiver.isAffectsPoolIncome()).isTrue();
        assertThat(waiver.isAffectsCharityFund()).isFalse();
    }

    @Test
    @DisplayName("approve waiver enforces four-eyes control")
    void approveWaiver_enforcesFourEyes() {
        when(waiverRepository.findById(5L)).thenReturn(Optional.of(
                IslamicFeeWaiver.builder()
                        .id(5L)
                        .requestedBy("maker")
                        .status("PENDING_APPROVAL")
                        .authorityLevel("BRANCH_MANAGER")
                        .build()));

        assertThatThrownBy(() -> service.approveWaiver(5L, "maker"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo("WAIVER_FOUR_EYES_VIOLATION");
    }

    @Test
    @DisplayName("apply waiver reverses charity-routed fee through charity ledger")
    void applyWaiver_reversesCharityFee() {
        IslamicFeeWaiver waiver = IslamicFeeWaiver.builder()
                .id(8L)
                .feeConfigId(2L)
                .feeChargeLogId(44L)
                .customerId(99L)
                .waivedAmount(new BigDecimal("200.00"))
                .remainingAmount(BigDecimal.ZERO.setScale(2))
                .currencyCode("SAR")
                .status("APPROVED")
                .reason("SHARIAH_REVIEW")
                .requestedBy("maker")
                .requestedAt(Instant.now())
                .authorityLevel("OFFICER")
                .build();
        FeeChargeLog chargeLog = FeeChargeLog.builder()
                .id(44L)
                .feeCode("GEN-FEE-LATE-001")
                .accountId(10L)
                .customerId(99L)
                .baseAmount(new BigDecimal("200.00"))
                .feeAmount(new BigDecimal("200.00"))
                .totalAmount(new BigDecimal("200.00"))
                .taxAmount(BigDecimal.ZERO)
                .currencyCode("SAR")
                .triggerEvent("LATE_PAYMENT")
                .charityFundEntryId(88L)
                .triggerRef("MRB-200-LATE-1")
                .status("CHARGED")
                .build();

        when(waiverRepository.findById(8L)).thenReturn(Optional.of(waiver));
        when(configurationRepository.findById(2L)).thenReturn(Optional.of(
                IslamicFeeConfiguration.builder()
                        .id(2L)
                        .feeCode("GEN-FEE-LATE-001")
                        .charityRouted(true)
                        .charityGlAccount("2300-000-001")
                        .build()));
        when(feeChargeLogRepository.findById(44L)).thenReturn(Optional.of(chargeLog));
        when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(account));
        when(accountPostingService.postCreditAgainstGl(
                eq(account),
                eq(TransactionType.ADJUSTMENT),
                eq(new BigDecimal("200.00")),
                anyString(),
                eq(TransactionChannel.SYSTEM),
                eq("MRB-200-LATE-1:WAIVER"),
                anyList(),
                eq("ISLAMIC_FEE_ENGINE"),
                eq("MRB-200-LATE-1:WAIVER")))
                .thenReturn(TransactionJournal.builder()
                        .transactionRef("REV-1")
                        .account(account)
                        .transactionType(TransactionType.ADJUSTMENT)
                        .amount(new BigDecimal("200.00"))
                        .currencyCode("SAR")
                        .runningBalance(BigDecimal.ZERO)
                        .narration("Waiver reversal")
                        .journal(JournalEntry.builder()
                                .journalNumber("JREV-1")
                                .journalType("SYSTEM")
                                .description("Waiver reversal")
                                .createdBy("checker")
                                .build())
                        .build());

        IslamicFeeWaiver applied = service.applyWaiver(8L);

        assertThat(applied.getStatus()).isEqualTo("APPLIED");
        assertThat(applied.getJournalRef()).isEqualTo("JREV-1");
        assertThat(chargeLog.getStatus()).isEqualTo("WAIVED");
        verify(charityFundService).recordReversal(88L, new BigDecimal("200.00"), "JREV-1", "Fee waiver reversal");
    }

    @Test
    @DisplayName("apply waiver does not touch charity fund for non-charity Ujrah fee")
    void applyWaiver_doesNotTouchCharityFundForUjrah() {
        IslamicFeeWaiver waiver = IslamicFeeWaiver.builder()
                .id(9L)
                .feeConfigId(3L)
                .feeChargeLogId(45L)
                .customerId(99L)
                .waivedAmount(new BigDecimal("500.00"))
                .remainingAmount(BigDecimal.ZERO.setScale(2))
                .currencyCode("SAR")
                .status("APPROVED")
                .reason("BANK_ERROR")
                .requestedBy("maker")
                .requestedAt(Instant.now())
                .authorityLevel("OFFICER")
                .build();
        FeeChargeLog chargeLog = FeeChargeLog.builder()
                .id(45L)
                .feeCode("IJR-FEE-DOC-001")
                .accountId(10L)
                .customerId(99L)
                .baseAmount(new BigDecimal("500.00"))
                .feeAmount(new BigDecimal("500.00"))
                .totalAmount(new BigDecimal("500.00"))
                .taxAmount(BigDecimal.ZERO)
                .currencyCode("SAR")
                .triggerEvent("DOCUMENTATION")
                .triggerRef("IJR-300-FEE")
                .status("CHARGED")
                .build();

        when(waiverRepository.findById(9L)).thenReturn(Optional.of(waiver));
        when(configurationRepository.findById(3L)).thenReturn(Optional.of(
                IslamicFeeConfiguration.builder()
                        .id(3L)
                        .feeCode("IJR-FEE-DOC-001")
                        .charityRouted(false)
                        .incomeGlAccount("5500-FEE-001")
                        .build()));
        when(feeChargeLogRepository.findById(45L)).thenReturn(Optional.of(chargeLog));
        when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(account));
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), anyString(), anyList(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder()
                        .transactionRef("REV-2")
                        .account(account)
                        .transactionType(TransactionType.ADJUSTMENT)
                        .amount(new BigDecimal("500.00"))
                        .currencyCode("SAR")
                        .runningBalance(BigDecimal.ZERO)
                        .narration("Waiver reversal")
                        .journal(JournalEntry.builder()
                                .journalNumber("JREV-2")
                                .journalType("SYSTEM")
                                .description("Waiver reversal")
                                .createdBy("checker")
                                .build())
                        .build());

        IslamicFeeWaiver applied = service.applyWaiver(9L);

        assertThat(applied.getStatus()).isEqualTo("APPLIED");
        verify(charityFundService, never()).recordReversal(any(), any(), anyString(), anyString());
    }
}
