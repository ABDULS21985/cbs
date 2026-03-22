package com.cbs.eod;

import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.deposit.service.FixedDepositService;
import com.cbs.deposit.service.RecurringDepositService;
import com.cbs.eod.entity.*;
import com.cbs.eod.repository.EodRunRepository;
import com.cbs.eod.service.EndOfDayService;
import com.cbs.lending.service.LoanOriginationService;
import com.cbs.overdraft.service.OverdraftService;
import com.cbs.standing.service.StandingOrderService;
import com.cbs.treasury.service.TreasuryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EndOfDayServiceTest {

    @Mock private EodRunRepository runRepository;
    @Mock private FixedDepositService fdService;
    @Mock private RecurringDepositService rdService;
    @Mock private LoanOriginationService loanService;
    @Mock private OverdraftService overdraftService;
    @Mock private StandingOrderService standingOrderService;
    @Mock private TreasuryService treasuryService;
    @Mock private AccountService accountService;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private EndOfDayService eodService;

    @Test
    @DisplayName("Should execute EOD with all steps and track completion")
    void executeEod_Success() {
        LocalDate date = LocalDate.of(2026, 3, 15); // mid-month = EOD
        when(runRepository.findByBusinessDateAndRunType(date, EodRunType.EOD)).thenReturn(Optional.empty());
        when(runRepository.save(any())).thenAnswer(inv -> { EodRun r = inv.getArgument(0); r.setId(1L); return r; });
        when(accountService.batchAccrueInterest()).thenReturn(200);
        when(fdService.batchAccrueInterest()).thenReturn(50);
        when(fdService.processMaturedDeposits()).thenReturn(3);
        when(rdService.processAutoDebits()).thenReturn(20);
        when(loanService.batchAccrueInterest()).thenReturn(100);
        when(overdraftService.batchAccrueInterest()).thenReturn(15);
        when(standingOrderService.executeDueInstructions()).thenReturn(8);
        when(overdraftService.processExpiredFacilities()).thenReturn(2);
        when(treasuryService.processMaturedDeals()).thenReturn(1);

        EodRun result = eodService.executeEod(date, "system");

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getRunType()).isEqualTo(EodRunType.EOD);
        assertThat(result.getTotalSteps()).isEqualTo(9);
        assertThat(result.getCompletedSteps()).isEqualTo(9);
        assertThat(result.getFailedSteps()).isEqualTo(0);
        verify(accountService).batchAccrueInterest();
    }

    @Test
    @DisplayName("Should detect EOM run type for month-end")
    void executeEod_MonthEnd() {
        LocalDate date = LocalDate.of(2026, 3, 31); // March 31 = EOM (also EOQ)
        when(runRepository.findByBusinessDateAndRunType(date, EodRunType.EOQ)).thenReturn(Optional.empty());
        when(runRepository.save(any())).thenAnswer(inv -> { EodRun r = inv.getArgument(0); r.setId(2L); return r; });
        when(accountService.batchAccrueInterest()).thenReturn(0);
        when(accountRepository.findActiveInterestBearingAccounts()).thenReturn(java.util.List.of());
        when(fdService.batchAccrueInterest()).thenReturn(0);
        when(fdService.processMaturedDeposits()).thenReturn(0);
        when(rdService.processAutoDebits()).thenReturn(0);
        when(loanService.batchAccrueInterest()).thenReturn(0);
        when(overdraftService.batchAccrueInterest()).thenReturn(0);
        when(standingOrderService.executeDueInstructions()).thenReturn(0);
        when(overdraftService.processExpiredFacilities()).thenReturn(0);
        when(treasuryService.processMaturedDeals()).thenReturn(0);

        EodRun result = eodService.executeEod(date, "system");

        assertThat(result.getRunType()).isEqualTo(EodRunType.EOQ); // March = Q1 end
        assertThat(result.getTotalSteps()).isEqualTo(11); // 9 + 2 monthly steps
    }

    @Test
    @DisplayName("Should prevent duplicate EOD run for same date")
    void executeEod_Duplicate() {
        LocalDate date = LocalDate.of(2026, 3, 15);
        EodRun existing = EodRun.builder().id(1L).businessDate(date).runType(EodRunType.EOD).status("COMPLETED").build();
        when(runRepository.findByBusinessDateAndRunType(date, EodRunType.EOD)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> eodService.executeEod(date, "system"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already completed");
    }

    @Test
    @DisplayName("Should continue execution when a step fails")
    void executeEod_StepFailure() {
        LocalDate date = LocalDate.of(2026, 3, 16);
        when(runRepository.findByBusinessDateAndRunType(date, EodRunType.EOD)).thenReturn(Optional.empty());
        when(runRepository.save(any())).thenAnswer(inv -> { EodRun r = inv.getArgument(0); r.setId(3L); return r; });
        when(accountService.batchAccrueInterest()).thenReturn(200);
        when(fdService.batchAccrueInterest()).thenReturn(50);
        when(fdService.processMaturedDeposits()).thenThrow(new RuntimeException("DB connection lost"));
        when(rdService.processAutoDebits()).thenReturn(20);
        when(loanService.batchAccrueInterest()).thenReturn(100);
        when(overdraftService.batchAccrueInterest()).thenReturn(15);
        when(standingOrderService.executeDueInstructions()).thenReturn(8);
        when(overdraftService.processExpiredFacilities()).thenReturn(2);
        when(treasuryService.processMaturedDeals()).thenReturn(1);

        EodRun result = eodService.executeEod(date, "system");

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getCompletedSteps()).isEqualTo(8);
        assertThat(result.getFailedSteps()).isEqualTo(1);
    }
}
