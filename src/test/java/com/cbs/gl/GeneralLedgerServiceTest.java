package com.cbs.gl;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.dto.JournalLineRequest;
import com.cbs.gl.dto.PostJournalRequest;
import com.cbs.gl.entity.*;
import com.cbs.gl.repository.*;
import com.cbs.gl.service.GeneralLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeneralLedgerServiceTest {

    @Mock private ChartOfAccountsRepository coaRepository;
    @Mock private JournalEntryRepository journalRepository;
    @Mock private GlBalanceRepository balanceRepository;
    @Mock private SubledgerReconRunRepository reconRepository;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private GeneralLedgerService glService;

    private ChartOfAccounts cashGl;
    private ChartOfAccounts depositGl;

    @BeforeEach
    void setUp() {
        cashGl = ChartOfAccounts.builder().id(1L).glCode("1001").glName("Cash and Bank")
                .glCategory(GlCategory.ASSET).normalBalance(NormalBalance.DEBIT)
                .isPostable(true).isActive(true).build();
        depositGl = ChartOfAccounts.builder().id(2L).glCode("2001").glName("Customer Deposits")
                .glCategory(GlCategory.LIABILITY).normalBalance(NormalBalance.CREDIT)
                .isPostable(true).isActive(true).build();
    }

    @Test
    @DisplayName("Should post balanced journal and update GL balances")
    void postJournal_Balanced() {
        when(journalRepository.getNextJournalSequence()).thenReturn(1L);
        when(coaRepository.findByGlCode("1001")).thenReturn(Optional.of(cashGl));
        when(coaRepository.findByGlCode("2001")).thenReturn(Optional.of(depositGl));
        when(currentActorProvider.getCurrentActor()).thenReturn("teller1");
        when(balanceRepository.findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(anyString(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(journalRepository.save(any())).thenAnswer(inv -> { JournalEntry j = inv.getArgument(0); j.setId(1L); return j; });

        PostJournalRequest request = new PostJournalRequest(
                "SYSTEM",
                "Customer cash deposit",
                "DEPOSITS",
                "DEP-001",
                LocalDate.now(),
                List.of(
                new JournalLineRequest("1001", new BigDecimal("50000"), BigDecimal.ZERO,
                        "USD", null, "Cash deposit", null, "HEAD", 1L, 1L),
                new JournalLineRequest("2001", BigDecimal.ZERO, new BigDecimal("50000"),
                        "USD", null, "Customer deposit liability", null, "HEAD", 1L, 1L)
        ));

        JournalEntry result = glService.postJournal(request);

        assertThat(result.getStatus()).isEqualTo("POSTED");
        assertThat(result.getTotalDebit()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(result.getTotalCredit()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(result.getLines()).hasSize(2);
        verify(balanceRepository, times(2)).save(any(GlBalance.class));
    }

    @Test
    @DisplayName("Should reject unbalanced journal")
    void postJournal_Unbalanced() {
        when(journalRepository.getNextJournalSequence()).thenReturn(2L);
        when(coaRepository.findByGlCode("1001")).thenReturn(Optional.of(cashGl));
        when(coaRepository.findByGlCode("2001")).thenReturn(Optional.of(depositGl));
        when(currentActorProvider.getCurrentActor()).thenReturn("user1");

        PostJournalRequest request = new PostJournalRequest(
                "MANUAL",
                "Unbalanced",
                null,
                null,
                null,
                List.of(
                new JournalLineRequest("1001", new BigDecimal("50000"), BigDecimal.ZERO,
                        "USD", null, "Debit", null, null, null, null),
                new JournalLineRequest("2001", BigDecimal.ZERO, new BigDecimal("40000"),
                        "USD", null, "Credit", null, null, null, null)
        ));

        assertThatThrownBy(() -> glService.postJournal(request))
                .isInstanceOf(BusinessException.class).hasMessageContaining("not balanced");
    }

    @Test
    @DisplayName("Should reject posting to header (non-postable) GL account")
    void postJournal_HeaderAccount() {
        ChartOfAccounts headerGl = ChartOfAccounts.builder().glCode("1000").glName("Assets Header")
                .isPostable(false).isActive(true).build();

        when(journalRepository.getNextJournalSequence()).thenReturn(3L);
        when(coaRepository.findByGlCode("1000")).thenReturn(Optional.of(headerGl));
        when(currentActorProvider.getCurrentActor()).thenReturn("user1");

        PostJournalRequest request = new PostJournalRequest(
                "MANUAL",
                "Header test",
                null,
                null,
                null,
                List.of(
                new JournalLineRequest("1000", new BigDecimal("1000"), BigDecimal.ZERO,
                        "USD", null, "Test", null, null, null, null)
        ));

        assertThatThrownBy(() -> glService.postJournal(request))
                .isInstanceOf(BusinessException.class).hasMessageContaining("not postable");
    }

    @Test
    @DisplayName("Should reverse a posted journal with swapped debits/credits")
    void reverseJournal() {
        JournalEntry original = JournalEntry.builder()
                .id(10L).journalNumber("JN0000000000010").journalType("SYSTEM")
                .description("Original").sourceModule("TEST").sourceRef("REF1")
                .status("POSTED").createdBy("user1")
                .totalDebit(new BigDecimal("25000")).totalCredit(new BigDecimal("25000")).build();

        JournalLine line1 = JournalLine.builder().lineNumber(1).glCode("1001")
                .debitAmount(new BigDecimal("25000")).creditAmount(BigDecimal.ZERO)
                .localDebit(new BigDecimal("25000")).localCredit(BigDecimal.ZERO)
                .currencyCode("USD").fxRate(BigDecimal.ONE).branchCode("HEAD").build();
        line1.setJournal(original);

        JournalLine line2 = JournalLine.builder().lineNumber(2).glCode("2001")
                .debitAmount(BigDecimal.ZERO).creditAmount(new BigDecimal("25000"))
                .localDebit(BigDecimal.ZERO).localCredit(new BigDecimal("25000"))
                .currencyCode("USD").fxRate(BigDecimal.ONE).branchCode("HEAD").build();
        line2.setJournal(original);

        original.setLines(new java.util.ArrayList<>(List.of(line1, line2)));

        when(journalRepository.findByIdWithLines(10L)).thenReturn(Optional.of(original));
        when(journalRepository.getNextJournalSequence()).thenReturn(11L);
        when(coaRepository.findByGlCode("1001")).thenReturn(Optional.of(cashGl));
        when(coaRepository.findByGlCode("2001")).thenReturn(Optional.of(depositGl));
        when(currentActorProvider.getCurrentActor()).thenReturn("supervisor1");
        when(balanceRepository.findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(anyString(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(journalRepository.save(any())).thenAnswer(inv -> { JournalEntry j = inv.getArgument(0); if(j.getId() == null) j.setId(11L); return j; });

        JournalEntry reversal = glService.reverseJournal(10L);

        assertThat(reversal.getJournalType()).isEqualTo("REVERSAL");
        assertThat(reversal.getStatus()).isEqualTo("POSTED");
        assertThat(original.getStatus()).isEqualTo("REVERSED");
    }

    @Test
    @DisplayName("Sub-ledger reconciliation: detects mismatch")
    void reconDetectsMismatch() {
        GlBalance bal = GlBalance.builder().closingBalance(new BigDecimal("1000000")).build();
        when(balanceRepository.findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate("2001", "HEAD", "USD", LocalDate.now()))
                .thenReturn(Optional.of(bal));
        when(reconRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubledgerReconRun result = glService.runReconciliation("DEPOSITS", "2001", new BigDecimal("999500"), LocalDate.now());

        assertThat(result.getIsBalanced()).isFalse();
        assertThat(result.getDifference()).isEqualByComparingTo(new BigDecimal("500"));
        assertThat(result.getStatus()).isEqualTo("EXCEPTIONS");
    }
}
