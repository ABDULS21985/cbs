package com.cbs.card;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.card.entity.*;
import com.cbs.card.repository.*;
import com.cbs.card.service.CardService;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CardServiceTest {

    @Mock private CardRepository cardRepository;
    @Mock private CardTransactionRepository txnRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private CardService cardService;

    private Account account;
    private Card debitCard;
    private Card creditCard;

    @BeforeEach
    void setUp() {
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setExternalClearingGlCode("2100");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        Customer customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer)
                .currencyCode("USD").bookBalance(new BigDecimal("50000")).availableBalance(new BigDecimal("50000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();

        debitCard = Card.builder().id(1L).cardReference("CRD-TEST001")
                .account(account).customer(customer)
                .cardType(CardType.DEBIT).cardScheme(CardScheme.VISA)
                .cardholderName("TEST USER").expiryDate(LocalDate.now().plusYears(3))
                .currencyCode("USD").status(CardStatus.ACTIVE)
                .dailyPosLimit(new BigDecimal("100000")).dailyAtmLimit(new BigDecimal("50000"))
                .dailyOnlineLimit(new BigDecimal("200000")).singleTxnLimit(new BigDecimal("25000"))
                .isContactlessEnabled(true).isOnlineEnabled(true).isInternationalEnabled(false)
                .isAtmEnabled(true).isPosEnabled(true).pinRetriesRemaining(3)
                .cardNumberHash("abc123").cardNumberMasked("411111******1234").build();

        creditCard = Card.builder().id(2L).cardReference("CRD-TEST002")
                .account(account).customer(customer)
                .cardType(CardType.CREDIT).cardScheme(CardScheme.MASTERCARD)
                .cardholderName("TEST USER").expiryDate(LocalDate.now().plusYears(3))
                .currencyCode("USD").status(CardStatus.ACTIVE)
                .creditLimit(new BigDecimal("100000")).availableCredit(new BigDecimal("100000"))
                .outstandingBalance(BigDecimal.ZERO)
                .singleTxnLimit(new BigDecimal("50000"))
                .isContactlessEnabled(true).isOnlineEnabled(true).isInternationalEnabled(true)
                .isAtmEnabled(true).isPosEnabled(true).pinRetriesRemaining(3)
                .cardNumberHash("def456").cardNumberMasked("522222******5678").build();
    }

    @Test
    @DisplayName("Debit card POS authorization: debits account, returns auth code")
    void debitCardPos_Success() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.sumDailyUsageByChannel(eq(1L), eq("POS"), any(Instant.class)))
                .thenReturn(BigDecimal.ZERO);
        when(accountRepository.save(any())).thenReturn(account);
        when(cardRepository.save(any())).thenReturn(debitCard);
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    Account debitAccount = inv.getArgument(0);
                    BigDecimal debitAmount = inv.getArgument(2);
                    debitAccount.debit(debitAmount);
                    return TransactionJournal.builder().id(1L).build();
                });

        CardTransaction txn = cardService.authorizeTransaction(1L, "PURCHASE", "POS",
                new BigDecimal("5000"), "USD", "Shoprite", "MRC001", "5411",
                "TRM001", "Lagos", null);

        assertThat(txn.getStatus()).isEqualTo("AUTHORIZED");
        assertThat(txn.getAuthCode()).isNotNull();
        assertThat(txn.getResponseCode()).isEqualTo("00");
        assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("45000"));
    }

    @Test
    @DisplayName("Debit card: declines when exceeding single transaction limit")
    void debitCard_ExceedsSingleLimit() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardTransaction txn = cardService.authorizeTransaction(1L, "PURCHASE", "POS",
                new BigDecimal("30000"), "USD", "Luxury Store", null, null,
                null, null, null);

        assertThat(txn.getStatus()).isEqualTo("DECLINED");
        assertThat(txn.getResponseCode()).isEqualTo("61");
    }

    @Test
    @DisplayName("Debit card: declines international when disabled")
    void debitCard_InternationalBlocked() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardTransaction txn = cardService.authorizeTransaction(1L, "PURCHASE", "ONLINE",
                new BigDecimal("500"), "USD", "Amazon UK", null, null,
                null, "London", "GBR");

        assertThat(txn.getStatus()).isEqualTo("DECLINED");
        assertThat(txn.getDeclineReason()).contains("international");
    }

    @Test
    @DisplayName("Credit card: reduces available credit, increases outstanding")
    void creditCard_Authorization() {
        when(cardRepository.findByIdWithDetails(2L)).thenReturn(Optional.of(creditCard));
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardTransaction txn = cardService.authorizeTransaction(2L, "PURCHASE", "ONLINE",
                new BigDecimal("20000"), "USD", "Apple Store", null, null,
                null, "Cupertino", "USA");

        assertThat(txn.getStatus()).isEqualTo("AUTHORIZED");
        assertThat(creditCard.getAvailableCredit()).isEqualByComparingTo(new BigDecimal("80000"));
        assertThat(creditCard.getOutstandingBalance()).isEqualByComparingTo(new BigDecimal("20000"));
    }

    @Test
    @DisplayName("Debit card: declines on insufficient funds")
    void debitCard_InsufficientFunds() {
        account.setAvailableBalance(new BigDecimal("100"));
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.sumDailyUsageByChannel(eq(1L), eq("ATM"), any(Instant.class)))
                .thenReturn(BigDecimal.ZERO);
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(inv -> inv.getArgument(0));

        CardTransaction txn = cardService.authorizeTransaction(1L, "CASH_WITHDRAWAL", "ATM",
                new BigDecimal("5000"), "USD", "ATM", null, null, "ATM001", null, null);

        assertThat(txn.getStatus()).isEqualTo("DECLINED");
        assertThat(txn.getResponseCode()).isEqualTo("51");
    }
}
