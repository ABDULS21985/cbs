package com.cbs.account;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.provider.numbering.AccountNumberGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountPostingServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private TransactionJournalRepository transactionRepository;
    @Mock private AccountValidator accountValidator;
    @Mock private AccountNumberGenerator numberGenerator;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private AccountPostingService postingService;

    private Account account;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(1L)
                .accountNumber("1000000001")
                .currencyCode("NGN")
                .bookBalance(new BigDecimal("50000.00"))
                .availableBalance(new BigDecimal("50000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .build();

        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(TransactionJournal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentActorProvider.getCurrentActor()).thenReturn("tester");
    }

    @Test
    @DisplayName("Credit updates account balance before journal running balance is captured")
    void postCredit_UsesPostCreditRunningBalance() {
        when(transactionRepository.getNextTransactionRefSequence()).thenReturn(1L);
        when(numberGenerator.generateTxnRef(eq(1L), anyString())).thenReturn("TXN202603170000000001");

        TransactionJournal journal = postingService.postCredit(
                account,
                TransactionType.OPENING_BALANCE,
                new BigDecimal("10000.00"),
                "Opening balance deposit",
                TransactionChannel.BRANCH,
                null);

        assertThat(account.getBookBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
        assertThat(journal.getRunningBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
        verify(accountValidator).validateCredit(account, new BigDecimal("10000.00"));
    }

    @Test
    @DisplayName("Debit journal stores the post-debit running balance")
    void postDebit_UsesPostDebitRunningBalance() {
        when(transactionRepository.getNextTransactionRefSequence()).thenReturn(2L);
        when(numberGenerator.generateTxnRef(eq(2L), anyString())).thenReturn("TXN202603170000000002");

        TransactionJournal journal = postingService.postDebit(
                account,
                TransactionType.DEBIT,
                new BigDecimal("7500.00"),
                "ATM cash withdrawal",
                TransactionChannel.ATM,
                "ATM-001");

        assertThat(account.getBookBalance()).isEqualByComparingTo(new BigDecimal("42500.00"));
        assertThat(journal.getRunningBalance()).isEqualByComparingTo(new BigDecimal("42500.00"));
        verify(accountValidator).validateDebit(account, new BigDecimal("7500.00"));
    }
}
