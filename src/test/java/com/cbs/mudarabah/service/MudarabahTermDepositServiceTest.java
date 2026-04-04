package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountPostingService.TransferPosting;
import com.cbs.common.exception.BusinessException;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.dto.CreateMudarabahTermDepositRequest;
import com.cbs.mudarabah.entity.EarlyWithdrawalPenalty;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahMaturityInstruction;
import com.cbs.mudarabah.entity.MudarabahTDStatus;
import com.cbs.mudarabah.entity.MudarabahTermDeposit;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.MudarabahTermDepositRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MudarabahTermDepositServiceTest {

    @Mock private MudarabahTermDepositRepository termDepositRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
    @Mock private HijriCalendarService hijriCalendarService;

    @InjectMocks private MudarabahTermDepositService service;

    private Account fundingAccount;
    private Account tdAccount;

    @BeforeEach
    void setUp() {
        fundingAccount = Account.builder()
                .id(1L)
                .accountNumber("SAV0000000001")
                .accountName("Savings Account")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("100000.00"))
                .availableBalance(new BigDecimal("100000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        tdAccount = Account.builder()
                .id(2L)
                .accountNumber("MDRTD0000000001")
                .accountName("Mudarabah Term Deposit")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();
    }

    private CreateMudarabahTermDepositRequest validTdRequest() {
        return CreateMudarabahTermDepositRequest.builder()
                .customerId(100L)
                .productCode("MDR-TD")
                .currencyCode("SAR")
                .principalAmount(new BigDecimal("50000.00"))
                .tenorDays(180)
                .fundingAccountId(1L)
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .maturityInstruction("PAY_TO_ACCOUNT")
                .payoutAccountId(1L)
                .earlyWithdrawalAllowed(true)
                .lossDisclosureAccepted(true)
                .build();
    }

    private MudarabahAccount buildMudarabahAccount(Account account) {
        return MudarabahAccount.builder()
                .id(10L)
                .account(account)
                .contractReference("MDR-TD-2026-000001")
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.TERM_DEPOSIT)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .lossDisclosureAccepted(true)
                .contractVersion(1)
                .psrAgreedVersion(1)
                .build();
    }

    private MudarabahTermDeposit buildTermDeposit(MudarabahAccount ma) {
        return MudarabahTermDeposit.builder()
                .id(100L)
                .mudarabahAccount(ma)
                .depositRef("MDR-TD-2026-000001")
                .principalAmount(new BigDecimal("50000.00"))
                .currencyCode("SAR")
                .tenorDays(180)
                .startDate(LocalDate.now().minusDays(180))
                .maturityDate(LocalDate.now())
                .psrCustomer(new BigDecimal("70.0000"))
                .psrBank(new BigDecimal("30.0000"))
                .accumulatedProfit(new BigDecimal("3500.0000"))
                .estimatedMaturityAmount(new BigDecimal("53500.00"))
                .maturityInstruction(MudarabahMaturityInstruction.PAY_TO_ACCOUNT)
                .payoutAccountId(1L)
                .status(MudarabahTDStatus.ACTIVE)
                .earlyWithdrawalAllowed(true)
                .hasLien(false)
                .rolloverCount(0)
                .build();
    }

    // -----------------------------------------------------------------------
    // createTermDeposit tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Create term deposit with PSR 70:30 succeeds, maturity date calculated")
    void createTermDeposit_withPsr70_30_success() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountRepository.save(any(Account.class))).thenReturn(tdAccount);
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class)))
                .thenAnswer(invocation -> {
                    MudarabahAccount ma = invocation.getArgument(0);
                    ma.setId(10L);
                    return ma;
                });
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> {
                    MudarabahTermDeposit td = invocation.getArgument(0);
                    td.setId(100L);
                    return td;
                });
        when(hijriCalendarService.isIslamicBusinessDay(any(LocalDate.class))).thenReturn(true);
        when(hijriCalendarService.toHijri(any(LocalDate.class))).thenReturn(null);
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));

        var response = service.createTermDeposit(validTdRequest());

        assertThat(response).isNotNull();
        assertThat(response.getPsrCustomer()).isEqualByComparingTo("70.0000");
        assertThat(response.getPsrBank()).isEqualByComparingTo("30.0000");
        assertThat(response.getTenorDays()).isEqualTo(180);
        assertThat(response.getMaturityDate()).isAfter(LocalDate.now().minusDays(1));
        assertThat(response.getStatus()).isEqualTo("ACTIVE");

        // Verify transfer from funding account to TD account
        verify(accountPostingService).postTransfer(
                eq(fundingAccount), eq(tdAccount),
                eq(new BigDecimal("50000.00")), eq(new BigDecimal("50000.00")),
                anyString(), anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("MUDARABAH"), anyString());
    }

    @Test
    @DisplayName("Create term deposit uses decision table for PSR when not provided")
    void createTermDeposit_psrFromDecisionTable_correctTier() {
        CreateMudarabahTermDepositRequest request = validTdRequest();
        request.setProfitSharingRatioCustomer(null);
        request.setProfitSharingRatioBank(null);

        DecisionResultResponse dtResult = DecisionResultResponse.builder()
                .matched(true)
                .outputs(Map.of("psr_customer", "75.0000", "psr_bank", "25.0000"))
                .build();
        when(decisionTableEvaluator.evaluateByRuleCode(eq("MDR_TD_PSR_BY_TENOR"), anyMap()))
                .thenReturn(dtResult);

        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountRepository.save(any(Account.class))).thenReturn(tdAccount);
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class)))
                .thenAnswer(invocation -> {
                    MudarabahAccount ma = invocation.getArgument(0);
                    ma.setId(10L);
                    return ma;
                });
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> {
                    MudarabahTermDeposit td = invocation.getArgument(0);
                    td.setId(100L);
                    return td;
                });
        when(hijriCalendarService.isIslamicBusinessDay(any(LocalDate.class))).thenReturn(true);
        when(hijriCalendarService.toHijri(any(LocalDate.class))).thenReturn(null);
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));

        var response = service.createTermDeposit(request);

        assertThat(response.getPsrCustomer()).isEqualByComparingTo("75.0000");
        assertThat(response.getPsrBank()).isEqualByComparingTo("25.0000");
        verify(decisionTableEvaluator).evaluateByRuleCode(eq("MDR_TD_PSR_BY_TENOR"), anyMap());
    }

    // -----------------------------------------------------------------------
    // processMaturity tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Process maturity with accumulated profit distributes correct customer share")
    void processMaturity_withActualPoolProfit_correctCustomerShare() {
        MudarabahAccount ma = buildMudarabahAccount(tdAccount);
        MudarabahTermDeposit td = buildTermDeposit(ma);

        when(termDepositRepository.findById(100L)).thenReturn(Optional.of(td));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.processMaturity(100L);

        // Total amount = principal (50000) + profit (3500) = 53500
        assertThat(response.getActualMaturityAmount()).isEqualByComparingTo("53500.0000");
        assertThat(response.getStatus()).isEqualTo("MATURED");

        // Verify transfer of total amount to payout account
        verify(accountPostingService).postTransfer(
                eq(tdAccount), eq(fundingAccount),
                eq(new BigDecimal("53500.0000")), eq(new BigDecimal("53500.0000")),
                anyString(), anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("MUDARABAH"), anyString());
    }

    // -----------------------------------------------------------------------
    // processEarlyWithdrawal tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Early withdrawal with FORFEIT_PROFIT returns principal only")
    void processEarlyWithdrawal_forfeitProfit_principalOnly() {
        MudarabahAccount ma = buildMudarabahAccount(tdAccount);
        MudarabahTermDeposit td = buildTermDeposit(ma);
        td.setEarlyWithdrawalPenaltyType(EarlyWithdrawalPenalty.FORFEIT_PROFIT);

        when(termDepositRepository.findById(100L)).thenReturn(Optional.of(td));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.processEarlyWithdrawal(100L, "Customer request");

        assertThat(response.getStatus()).isEqualTo("EARLY_WITHDRAWN");

        // Verify transfer is for principal only (50000), not principal + profit
        verify(accountPostingService).postTransfer(
                eq(tdAccount), eq(fundingAccount),
                eq(new BigDecimal("50000.00")), eq(new BigDecimal("50000.00")),
                anyString(), anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("MUDARABAH"), anyString());
    }

    @Test
    @DisplayName("Early withdrawal with REDUCED_PSR recalculates profit at reduced rate")
    void processEarlyWithdrawal_reducedPsr_recalculated() {
        MudarabahAccount ma = buildMudarabahAccount(tdAccount);
        MudarabahTermDeposit td = buildTermDeposit(ma);
        td.setEarlyWithdrawalPenaltyType(EarlyWithdrawalPenalty.REDUCED_PSR);
        td.setEarlyWithdrawalReducedPsr(new BigDecimal("35.0000")); // Half of original 70%
        td.setAccumulatedProfit(new BigDecimal("3500.0000"));

        when(termDepositRepository.findById(100L)).thenReturn(Optional.of(td));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.processEarlyWithdrawal(100L, "Urgent need");

        // reducedProfit = 3500 * 35 / 70 = 1750
        // payoutAmount = 50000 + 1750 = 51750
        verify(accountPostingService).postTransfer(
                eq(tdAccount), eq(fundingAccount),
                eq(new BigDecimal("51750.0000")), eq(new BigDecimal("51750.0000")),
                anyString(), anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("MUDARABAH"), anyString());
    }

    @Test
    @DisplayName("Early withdrawal with active lien is blocked")
    void processEarlyWithdrawal_withActiveLien_blocked() {
        MudarabahAccount ma = buildMudarabahAccount(tdAccount);
        MudarabahTermDeposit td = buildTermDeposit(ma);
        td.setHasLien(true);
        td.setLienReference("FIN-001");
        td.setLienAmount(new BigDecimal("30000.00"));

        when(termDepositRepository.findById(100L)).thenReturn(Optional.of(td));

        assertThatThrownBy(() -> service.processEarlyWithdrawal(100L, "Need funds"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("LIEN_ACTIVE");
                });
    }

    @Test
    @DisplayName("Process maturity rollover increments rollover count and creates new dates")
    void processMaturity_rolloverCreatesNewDates() {
        MudarabahAccount ma = buildMudarabahAccount(tdAccount);
        MudarabahTermDeposit td = buildTermDeposit(ma);
        td.setMaturityInstruction(MudarabahMaturityInstruction.ROLLOVER_PRINCIPAL);
        td.setRolloverCount(0);

        when(termDepositRepository.findById(100L)).thenReturn(Optional.of(td));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.processMaturity(100L);

        assertThat(response.getStatus()).isEqualTo("ROLLED_OVER");
        assertThat(response.getRolloverCount()).isEqualTo(1);

        // Verify profit was paid out to payout account
        verify(accountPostingService).postTransfer(
                eq(tdAccount), eq(fundingAccount),
                eq(new BigDecimal("3500.0000")), eq(new BigDecimal("3500.0000")),
                anyString(), anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("MUDARABAH"), anyString());
    }

    @Test
    @DisplayName("Maturity date is adjusted when it falls on non-business day")
    void createTermDeposit_maturityDateAdjusted() {
        LocalDate rawMaturity = LocalDate.now().plusDays(180);
        LocalDate adjustedMaturity = rawMaturity.plusDays(2); // shifted by 2 days

        when(hijriCalendarService.isIslamicBusinessDay(rawMaturity)).thenReturn(false);
        when(hijriCalendarService.getNextIslamicBusinessDay(rawMaturity)).thenReturn(adjustedMaturity);
        when(hijriCalendarService.toHijri(adjustedMaturity)).thenReturn(null);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(fundingAccount));
        when(accountRepository.save(any(Account.class))).thenReturn(tdAccount);
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class)))
                .thenAnswer(invocation -> {
                    MudarabahAccount ma = invocation.getArgument(0);
                    ma.setId(10L);
                    return ma;
                });
        when(termDepositRepository.save(any(MudarabahTermDeposit.class)))
                .thenAnswer(invocation -> {
                    MudarabahTermDeposit td = invocation.getArgument(0);
                    td.setId(100L);
                    return td;
                });
        when(accountPostingService.postTransfer(
                any(Account.class), any(Account.class),
                any(BigDecimal.class), any(BigDecimal.class),
                anyString(), anyString(), any(TransactionChannel.class),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransferPosting.class));

        var response = service.createTermDeposit(validTdRequest());

        // Maturity date should be the adjusted date, not the raw one
        assertThat(response.getMaturityDate()).isEqualTo(adjustedMaturity);
        verify(hijriCalendarService).getNextIslamicBusinessDay(rawMaturity);
    }
}
