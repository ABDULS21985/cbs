package com.cbs.account;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.CurrencyWalletRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.service.GeneralLedgerService;
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
    @Mock private CurrencyWalletRepository walletRepository;
    @Mock private TransactionJournalRepository transactionRepository;
    @Mock private AccountValidator accountValidator;
    @Mock private AccountNumberGenerator numberGenerator;
    @Mock private CurrentActorProvider currentActorProvider;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private ChartOfAccountsRepository chartOfAccountsRepository;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private AccountPostingService postingService;

    private Account account;
    private CurrencyWallet wallet;
    private ChartOfAccounts controlGl;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(1L)
                .accountNumber("1000000001")
                .currencyCode("NGN")
                .customer(Customer.builder().id(1L).build())
                .product(Product.builder().id(1L).code("CA-STD").glAccountCode("2001").build())
                .bookBalance(new BigDecimal("50000.00"))
                .availableBalance(new BigDecimal("50000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .build();
        wallet = CurrencyWallet.builder()
                .id(10L)
                .account(account)
                .currencyCode("EUR")
                .bookBalance(new BigDecimal("100.00"))
                .availableBalance(new BigDecimal("100.00"))
                .build();
        controlGl = ChartOfAccounts.builder()
                .glCode("2001")
                .normalBalance(NormalBalance.CREDIT)
                .isPostable(true)
                .build();

        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(walletRepository.save(any(CurrencyWallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(TransactionJournal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentActorProvider.getCurrentActor()).thenReturn("tester");
        when(chartOfAccountsRepository.findByGlCode("2001")).thenReturn(java.util.Optional.of(controlGl));
        when(generalLedgerService.postJournal(anyString(), anyString(), anyString(), anyString(), any(), anyString(), any()))
                .thenReturn(JournalEntry.builder().id(1L).build());
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setDefaultBranchCode("HEAD");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
    }

    @Test
    @DisplayName("Credit updates account balance before journal running balance is captured")
    void postCreditAgainstGl_UsesPostCreditRunningBalance() {
        when(transactionRepository.getNextTransactionRefSequence()).thenReturn(1L);
        when(numberGenerator.generateTxnRef(eq(1L), anyString())).thenReturn("TXN202603170000000001");

        TransactionJournal journal = postingService.postCreditAgainstGl(
                account,
                TransactionType.OPENING_BALANCE,
                new BigDecimal("10000.00"),
                "Opening balance deposit",
                TransactionChannel.BRANCH,
                null,
                "1100",
                "ACCOUNT",
                "1000000001");

        assertThat(account.getBookBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
        assertThat(journal.getRunningBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
        verify(accountValidator).validateCredit(account, new BigDecimal("10000.00"));
    }

    @Test
    @DisplayName("Debit journal stores the post-debit running balance")
    void postDebitAgainstGl_UsesPostDebitRunningBalance() {
        when(transactionRepository.getNextTransactionRefSequence()).thenReturn(2L);
        when(numberGenerator.generateTxnRef(eq(2L), anyString())).thenReturn("TXN202603170000000002");

        TransactionJournal journal = postingService.postDebitAgainstGl(
                account,
                TransactionType.DEBIT,
                new BigDecimal("7500.00"),
                "ATM cash withdrawal",
                TransactionChannel.ATM,
                "ATM-001",
                "1100",
                "ACCOUNT",
                "1000000001");

        assertThat(account.getBookBalance()).isEqualByComparingTo(new BigDecimal("42500.00"));
        assertThat(journal.getRunningBalance()).isEqualByComparingTo(new BigDecimal("42500.00"));
        verify(accountValidator).validateDebit(account, new BigDecimal("7500.00"));
    }

    @Test
    @DisplayName("Wallet credit updates wallet balance and posts a journal")
    void postWalletCreditAgainstGl_UpdatesWalletBalance() {
        AccountPostingService.WalletPostingResult result = postingService.postWalletCreditAgainstGl(
                wallet,
                new BigDecimal("25.00"),
                "Wallet funding",
                null,
                "2100",
                "WALLET",
                "WALLET:10"
        );

        assertThat(wallet.getBookBalance()).isEqualByComparingTo(new BigDecimal("125.00"));
        assertThat(result.balanceAfter()).isEqualByComparingTo(new BigDecimal("125.00"));
        verify(walletRepository).save(wallet);
    }
}
