package com.cbs.account;

import com.cbs.account.dto.WalletConvertRequest;
import com.cbs.account.dto.WalletCreditRequest;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.WalletTransaction;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.CurrencyWalletRepository;
import com.cbs.account.repository.WalletTransactionRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.WalletService;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.gl.entity.JournalEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatcher;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock private CurrencyWalletRepository walletRepository;
    @Mock private WalletTransactionRepository walletTxnRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private WalletService walletService;

    private Account account;
    private CurrencyWallet sourceWallet;
    private CurrencyWallet targetWallet;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(1L)
                .accountNumber("1000000001")
                .currencyCode("USD")
                .customer(Customer.builder().id(9L).customerType(CustomerType.INDIVIDUAL).build())
                .product(Product.builder().id(5L).code("CA-STD").glAccountCode("2001").build())
                .build();
        sourceWallet = CurrencyWallet.builder()
                .id(10L)
                .account(account)
                .currencyCode("USD")
                .bookBalance(new BigDecimal("200.00"))
                .availableBalance(new BigDecimal("200.00"))
                .status("ACTIVE")
                .build();
        targetWallet = CurrencyWallet.builder()
                .id(11L)
                .account(account)
                .currencyCode("EUR")
                .bookBalance(new BigDecimal("50.00"))
                .availableBalance(new BigDecimal("50.00"))
                .status("ACTIVE")
                .build();

        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setWalletSettlementGlCode("2100");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        when(walletTxnRepository.save(any(WalletTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Wallet credit routes through the posting engine and records a wallet transaction")
    void credit_UsesPostingEngine() {
        when(walletRepository.findById(10L)).thenReturn(Optional.of(sourceWallet));
        when(accountPostingService.postWalletCreditAgainstGl(any(CurrencyWallet.class), any(BigDecimal.class),
                any(String.class), any(), any(String.class), any(String.class), any(String.class)))
                .thenAnswer(invocation -> {
                    CurrencyWallet wallet = invocation.getArgument(0);
                    BigDecimal amount = invocation.getArgument(1);
                    wallet.credit(amount);
                    return new AccountPostingService.WalletPostingResult("PG-WALLET-1", JournalEntry.builder().id(1L).build(), wallet.getBookBalance());
                });

        var response = walletService.credit(1L, WalletCreditRequest.builder()
                .walletId(10L)
                .amount(new BigDecimal("25.00"))
                .narration("Manual funding")
                .build());

        assertThat(response.getBookBalance()).isEqualByComparingTo(new BigDecimal("225.00"));
        verify(accountPostingService).postWalletCreditAgainstGl(any(CurrencyWallet.class), any(BigDecimal.class),
                any(String.class), any(), any(String.class), any(String.class), any(String.class));
        verify(walletTxnRepository).save(argThat(referenceMatches("PG-WALLET-1")));
    }

    @Test
    @DisplayName("Wallet FX conversion routes through wallet transfer posting and records both legs")
    void convert_UsesWalletTransferPosting() {
        when(walletRepository.findById(10L)).thenReturn(Optional.of(sourceWallet));
        when(walletRepository.findById(11L)).thenReturn(Optional.of(targetWallet));
        when(accountPostingService.postWalletTransfer(any(CurrencyWallet.class), any(CurrencyWallet.class),
                any(BigDecimal.class), any(BigDecimal.class), any(String.class), any(String.class), any(),
                any(BigDecimal.class), any(BigDecimal.class), any(String.class), any(String.class)))
                .thenAnswer(invocation -> {
                    CurrencyWallet debitWallet = invocation.getArgument(0);
                    CurrencyWallet creditWallet = invocation.getArgument(1);
                    BigDecimal debitAmount = invocation.getArgument(2);
                    BigDecimal creditAmount = invocation.getArgument(3);
                    debitWallet.debit(debitAmount);
                    creditWallet.credit(creditAmount);
                    return new AccountPostingService.WalletTransferPosting(
                            "PG-WALLET-XFER",
                            JournalEntry.builder().id(2L).build(),
                            debitWallet.getBookBalance(),
                            creditWallet.getBookBalance());
                });

        BigDecimal converted = walletService.convert(1L, WalletConvertRequest.builder()
                .sourceWalletId(10L)
                .targetWalletId(11L)
                .amount(new BigDecimal("10.00"))
                .rate(new BigDecimal("0.92"))
                .build());

        assertThat(converted).isEqualByComparingTo(new BigDecimal("9.20"));
        verify(accountPostingService).postWalletTransfer(any(CurrencyWallet.class), any(CurrencyWallet.class),
                any(BigDecimal.class), any(BigDecimal.class), any(String.class), any(String.class), any(),
                any(BigDecimal.class), any(BigDecimal.class), any(String.class), any(String.class));
        verify(walletTxnRepository, times(2)).save(any(WalletTransaction.class));
    }

    private ArgumentMatcher<WalletTransaction> referenceMatches(String expectedReference) {
        return txn -> txn != null && expectedReference.equals(txn.getReference());
    }
}
