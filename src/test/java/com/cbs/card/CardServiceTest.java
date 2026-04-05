package com.cbs.card;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.card.entity.*;
import com.cbs.card.issuer.CardPanIssueResult;
import com.cbs.card.issuer.CardPanIssuer;
import com.cbs.card.repository.*;
import com.cbs.card.service.CardService;
import com.cbs.card.service.IslamicCardAuthorizationDecision;
import com.cbs.card.service.IslamicCardAuthorizationService;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
    @Mock private IslamicCardAuthorizationService islamicCardAuthorizationService;
    @Mock private FxRateRepository fxRateRepository;
    @Mock private CardPanIssuer cardPanIssuer;

    @InjectMocks private CardService cardService;

    private Account account;
    private Card debitCard;
    private Card creditCard;

    @BeforeEach
    void setUp() {
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setExternalClearingGlCode("2100");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        ReflectionTestUtils.setField(cardService, "panHmacKey", "unit-test-pan-key");
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

        when(islamicCardAuthorizationService.evaluate(any(Card.class), any(CardTransaction.class)))
                .thenReturn(IslamicCardAuthorizationDecision.notApplicable());
        when(cardPanIssuer.issuePan(any())).thenReturn(new CardPanIssueResult("4111111111111111", "TEST", "PAN-REF-001"));
    }

    @Test
    @DisplayName("issueCard: uses the configured PAN issuer abstraction instead of generating PANs inline")
    void issueCard_UsesPanIssuer() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

        Card issuedCard = cardService.issueCard(
                1L,
                CardType.DEBIT,
                CardScheme.VISA,
                "CLASSIC",
                "TEST USER",
                LocalDate.of(2029, 12, 31),
                new BigDecimal("100000"),
                new BigDecimal("50000"),
                new BigDecimal("75000"),
                new BigDecimal("25000"),
                BigDecimal.ZERO,
                "BR001",
                CardStatus.PENDING_ACTIVATION
        );

        assertThat(issuedCard.getCardReference()).startsWith("CRD-");
        assertThat(issuedCard.getCardNumberMasked()).isEqualTo("411111******1111");
        assertThat(issuedCard.getCardNumberHash()).isNotBlank();
        verify(cardPanIssuer).issuePan(any());
    }

    @Test
    @DisplayName("Debit card POS authorization: debits account, returns auth code")
    void debitCardPos_Success() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.sumDailyUsageByChannel(eq(1L), eq("POS"), any(Instant.class)))
                .thenReturn(BigDecimal.ZERO);
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
        assertThat(txn.getBillingAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(txn.getBillingCurrency()).isEqualTo("USD");
        assertThat(txn.getFxRate()).isEqualByComparingTo(new BigDecimal("1.00000000"));
        assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("45000"));
    }

    @Test
    @DisplayName("Debit card international authorization: converts merchant currency into account currency before posting")
    void debitCard_FxAwareAuthorization() {
        debitCard.setIsInternationalEnabled(true);
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.sumDailyUsageByChannel(eq(1L), eq("POS"), any(Instant.class)))
                .thenReturn(BigDecimal.ZERO);
        when(fxRateRepository.findLatestRate("EUR", "USD")).thenReturn(java.util.List.of(
                FxRate.builder().id(1L).sourceCurrency("EUR").targetCurrency("USD").sellRate(new BigDecimal("1.10000000")).isActive(true).build()
        ));
        when(cardRepository.save(any())).thenReturn(debitCard);
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    Account debitAccount = inv.getArgument(0);
                    BigDecimal debitAmount = inv.getArgument(2);
                    debitAccount.debit(debitAmount);
                    return TransactionJournal.builder().id(11L).build();
                });

        CardTransaction txn = cardService.authorizeTransaction(1L, "PURCHASE", "POS",
                new BigDecimal("100.00"), "EUR", "Paris Store", "MRC-EUR", "5411",
                "TRM-EUR", "Paris", "FRA");

        assertThat(txn.getStatus()).isEqualTo("AUTHORIZED");
        assertThat(txn.getAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(txn.getCurrencyCode()).isEqualTo("EUR");
        assertThat(txn.getBillingAmount()).isEqualByComparingTo(new BigDecimal("110.00"));
        assertThat(txn.getBillingCurrency()).isEqualTo("USD");
        assertThat(txn.getFxRate()).isEqualByComparingTo(new BigDecimal("1.10000000"));
        assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("49890.00"));
        verify(accountPostingService).postDebitAgainstGl(eq(account), any(), eq(new BigDecimal("110.00")), anyString(), any(), anyString(), anyString(), anyString(), anyString());
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
    @DisplayName("Islamic card routing: declines when Shariah authorization blocks the MCC")
    void debitCard_IslamicBlock() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(txnRepository.sumDailyUsageByChannel(eq(1L), eq("POS"), any(Instant.class)))
                .thenReturn(BigDecimal.ZERO);
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(islamicCardAuthorizationService.evaluate(any(Card.class), any(CardTransaction.class)))
                .thenReturn(IslamicCardAuthorizationDecision.blocked(
                        99L,
                        "2100-ISL-CARD-SETTLE",
                        "SSR-001",
                        "Merchant category 7995 is blocked by Islamic profile ISLAMIC_STANDARD_MCC",
                        "57"
                ));

        CardTransaction txn = cardService.authorizeTransaction(1L, "PURCHASE", "POS",
                new BigDecimal("5000"), "USD", "Gaming Merchant", "MRC7995", "7995",
                "TRM001", "Lagos", null);

        assertThat(txn.getStatus()).isEqualTo("DECLINED");
        assertThat(txn.getResponseCode()).isEqualTo("57");
        assertThat(txn.getShariahDecision()).isEqualTo("BLOCKED");
        assertThat(txn.getShariahScreeningRef()).isEqualTo("SSR-001");
        verify(accountPostingService, never()).postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString());
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

    @Test
    @DisplayName("activateCard: activates a PENDING_ACTIVATION card")
    void activateCard_PendingCard() {
        debitCard.setStatus(CardStatus.PENDING_ACTIVATION);
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.activateCard(1L);

        assertThat(result.getStatus()).isEqualTo(CardStatus.ACTIVE);
        assertThat(result.getBlockReason()).isNull();
    }

    @Test
    @DisplayName("activateCard: unlocks a BLOCKED card")
    void activateCard_BlockedCard() {
        debitCard.setStatus(CardStatus.BLOCKED);
        debitCard.setBlockReason("Customer requested temporary lock");
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.activateCard(1L);

        assertThat(result.getStatus()).isEqualTo(CardStatus.ACTIVE);
        assertThat(result.getBlockReason()).isNull();
    }

    @Test
    @DisplayName("activateCard: rejects activation for ACTIVE card")
    void activateCard_ActiveCard_Rejected() {
        debitCard.setStatus(CardStatus.ACTIVE);
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));

        org.junit.jupiter.api.Assertions.assertThrows(
            com.cbs.common.exception.BusinessException.class,
            () -> cardService.activateCard(1L)
        );
    }

    @Test
    @DisplayName("blockCard: blocks an ACTIVE card with reason")
    void blockCard_Success() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.blockCard(1L, "Customer request");

        assertThat(result.getStatus()).isEqualTo(CardStatus.BLOCKED);
        assertThat(result.getBlockReason()).isEqualTo("Customer request");
    }

    @Test
    @DisplayName("hotlistCard: sets LOST status when reason contains 'lost'")
    void hotlistCard_Lost() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.hotlistCard(1L, "Card lost at restaurant");

        assertThat(result.getStatus()).isEqualTo(CardStatus.LOST);
    }

    @Test
    @DisplayName("hotlistCard: sets STOLEN status when reason contains 'stolen'")
    void hotlistCard_Stolen() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.hotlistCard(1L, "Card was stolen");

        assertThat(result.getStatus()).isEqualTo(CardStatus.STOLEN);
    }

    @Test
    @DisplayName("hotlistCard: sets HOT_LISTED status for generic reason")
    void hotlistCard_Generic() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.hotlistCard(1L, "Fraud suspected");

        assertThat(result.getStatus()).isEqualTo(CardStatus.HOT_LISTED);
    }

    @Test
    @DisplayName("updateControls: updates individual card controls")
    void updateControls_Success() {
        when(cardRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.updateControls(1L, null, false, true, null, null);

        assertThat(result.getIsOnlineEnabled()).isFalse();
        assertThat(result.getIsInternationalEnabled()).isTrue();
        assertThat(result.getIsContactlessEnabled()).isTrue(); // unchanged
    }

    @Test
    @DisplayName("disputeTransaction: marks transaction as disputed")
    void disputeTransaction_Success() {
        CardTransaction existingTxn = CardTransaction.builder()
                .id(100L).transactionRef("CTX-TX001")
                .card(debitCard).account(account)
                .transactionType("PURCHASE").channel("POS")
                .amount(new BigDecimal("5000")).currencyCode("USD")
                .status("AUTHORIZED").isDisputed(false)
                .transactionDate(Instant.now()).build();
        when(txnRepository.findById(100L)).thenReturn(Optional.of(existingTxn));
        when(txnRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardTransaction result = cardService.disputeTransaction(100L, "Unauthorized transaction");

        assertThat(result.getIsDisputed()).isTrue();
        assertThat(result.getDisputeReason()).isEqualTo("Unauthorized transaction");
        assertThat(result.getStatus()).isEqualTo("DISPUTED");
        assertThat(result.getDisputeDate()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("refundTransaction: credits the funded account and links the adjustment to the original transaction")
    void refundTransaction_DebitCard() {
        CardTransaction originalTxn = CardTransaction.builder()
                .id(200L)
                .transactionRef("CTX-ORIG-001")
                .card(debitCard)
                .account(account)
                .transactionType("PURCHASE")
                .channel("POS")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("USD")
                .billingAmount(new BigDecimal("5000.00"))
                .billingCurrency("USD")
                .status("AUTHORIZED")
                .transactionDate(Instant.now())
                .build();

        when(txnRepository.findById(200L)).thenReturn(Optional.of(originalTxn));
        when(txnRepository.sumSettledAdjustmentsForOriginal(200L)).thenReturn(BigDecimal.ZERO);
        when(txnRepository.save(any(CardTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    Account creditAccount = inv.getArgument(0);
                    BigDecimal creditAmount = inv.getArgument(2);
                    creditAccount.credit(creditAmount);
                    return TransactionJournal.builder().id(50L).build();
                });

        CardTransaction refundTxn = cardService.refundTransaction(200L, new BigDecimal("1000.00"), "Merchant goodwill refund");

        assertThat(refundTxn.getTransactionType()).isEqualTo("REFUND");
        assertThat(refundTxn.getOriginalTransactionRef()).isEqualTo("CTX-ORIG-001");
        assertThat(refundTxn.getAdjustmentReason()).isEqualTo("Merchant goodwill refund");
        assertThat(refundTxn.getStatus()).isEqualTo("SETTLED");
        assertThat(refundTxn.getBillingAmount()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(originalTxn.getStatus()).isEqualTo("PARTIALLY_REFUNDED");
        assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("51000.00"));
    }

    @Test
    @DisplayName("reverseTransaction: credits the funded account, marks the original as reversed, and triggers Islamic lifecycle refresh")
    void reverseTransaction_IslamicLifecycle() {
        CardTransaction originalTxn = CardTransaction.builder()
                .id(201L)
                .transactionRef("CTX-ORIG-002")
                .card(debitCard)
                .account(account)
                .transactionType("PURCHASE")
                .channel("POS")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("USD")
                .billingAmount(new BigDecimal("5000.00"))
                .billingCurrency("USD")
                .islamicCardId(99L)
                .status("AUTHORIZED")
                .transactionDate(Instant.now())
                .build();

        when(txnRepository.findById(201L)).thenReturn(Optional.of(originalTxn));
        when(txnRepository.sumSettledAdjustmentsForOriginal(201L)).thenReturn(BigDecimal.ZERO);
        when(txnRepository.save(any(CardTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(islamicCardAuthorizationService.resolveSettlementGlCode(99L)).thenReturn("2100-ISL-CARD-SETTLE");
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(51L).build());

        CardTransaction reversalTxn = cardService.reverseTransaction(201L, null, "Terminal timeout");

        assertThat(reversalTxn.getTransactionType()).isEqualTo("REVERSAL");
        assertThat(reversalTxn.getOriginalTransactionRef()).isEqualTo("CTX-ORIG-002");
        assertThat(reversalTxn.getBillingAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(originalTxn.getStatus()).isEqualTo("REVERSED");
        verify(accountPostingService).postCreditAgainstGl(eq(account), any(), eq(new BigDecimal("5000.00")), anyString(), any(), anyString(), eq("2100-ISL-CARD-SETTLE"), anyString(), eq("CTX-ORIG-002"));
        verify(islamicCardAuthorizationService).afterLifecyclePosting(99L, "REVERSAL");
    }
}
