package com.cbs.card;

import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.card.dispute.*;
import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.tokenisation.*;
import com.cbs.common.audit.CurrentActorProvider;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CardTokenAndDisputeTest {

    // ========== TOKENISATION ==========
    @Mock private CardTokenRepository tokenRepository;
    @Mock private CardRepository cardRepository;
    @InjectMocks private CardTokenService tokenService;

    // ========== DISPUTES ==========
    @Mock private CardDisputeRepository disputeRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CurrentActorProvider currentActorProvider;
    @Mock private CbsProperties cbsProperties;
    @InjectMocks private CardDisputeService disputeService;

    private Card activeCard;
    private Account account;

    @BeforeEach
    void setUp() {
        SyntheticCapabilityGuard.enableSyntheticServicesForTesting();
        when(currentActorProvider.getCurrentActor()).thenReturn("officer1");
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setExternalClearingGlCode("2101");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        Customer c = Customer.builder().id(1L).firstName("Jane").lastName("Doe").customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(10L).accountNumber("1000000010").customer(c).currencyCode("USD")
                .bookBalance(new BigDecimal("100000")).availableBalance(new BigDecimal("100000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();
        activeCard = Card.builder().id(1L).cardReference("CRD-TEST001").account(account).customer(c)
                .cardType(CardType.DEBIT).cardScheme(CardScheme.VISA).cardholderName("JANE DOE")
                .expiryDate(LocalDate.now().plusYears(3)).currencyCode("USD").status(CardStatus.ACTIVE)
                .cardNumberHash("abc123").cardNumberMasked("411111******1234").build();
    }

    // ========== TOKENISATION TESTS ==========

    @Test
    @DisplayName("Should provision Apple Pay token for active card")
    void provisionToken_Success() {
        when(cardRepository.findById(1L)).thenReturn(Optional.of(activeCard));
        when(tokenRepository.countByCardIdAndStatus(1L, TokenStatus.ACTIVE)).thenReturn(0L);
        when(tokenRepository.save(any())).thenAnswer(inv -> { CardToken t = inv.getArgument(0); t.setId(1L); return t; });

        CardToken result = tokenService.provisionToken(1L, WalletProvider.APPLE_PAY, "iPhone 15 Pro", "DEV001", "PHONE", null);

        assertThat(result.getWalletProvider()).isEqualTo(WalletProvider.APPLE_PAY);
        assertThat(result.getStatus()).isEqualTo(TokenStatus.ACTIVE);
        assertThat(result.getDeviceName()).isEqualTo("iPhone 15 Pro");
        assertThat(result.getTokenNumberSuffix()).hasSize(4);
    }

    @Test
    @DisplayName("Should suspend and resume token")
    void suspendAndResumeToken() {
        CardToken token = CardToken.builder().id(1L).tokenRef("TKN-001").cardId(1L).customerId(1L)
                .status(TokenStatus.ACTIVE).walletProvider(WalletProvider.GOOGLE_PAY)
                .tokenNumberHash("hash").tokenNumberSuffix("1234").build();

        when(tokenRepository.findById(1L)).thenReturn(Optional.of(token));
        when(tokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardToken suspended = tokenService.suspendToken(1L, "Suspected compromise");
        assertThat(suspended.getStatus()).isEqualTo(TokenStatus.SUSPENDED);

        CardToken resumed = tokenService.resumeToken(1L);
        assertThat(resumed.getStatus()).isEqualTo(TokenStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should deactivate all tokens when card is hotlisted")
    void deactivateAllOnHotlist() {
        CardToken t1 = CardToken.builder().id(1L).status(TokenStatus.ACTIVE).build();
        CardToken t2 = CardToken.builder().id(2L).status(TokenStatus.ACTIVE).build();
        CardToken t3 = CardToken.builder().id(3L).status(TokenStatus.SUSPENDED).build();

        when(tokenRepository.findByCardIdAndStatus(1L, TokenStatus.ACTIVE)).thenReturn(List.of(t1, t2));
        when(tokenRepository.findByCardIdAndStatus(1L, TokenStatus.SUSPENDED)).thenReturn(List.of(t3));
        when(tokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int count = tokenService.deactivateAllTokensForCard(1L, "Card reported stolen");

        assertThat(count).isEqualTo(3);
        assertThat(t1.getStatus()).isEqualTo(TokenStatus.DEACTIVATED);
        assertThat(t2.getStatus()).isEqualTo(TokenStatus.DEACTIVATED);
        assertThat(t3.getStatus()).isEqualTo(TokenStatus.DEACTIVATED);
    }

    // ========== DISPUTE TESTS ==========

    @Test
    @DisplayName("Should initiate dispute with scheme-compliant deadlines")
    void initiateDispute_Success() {
        when(disputeRepository.getNextDisputeSequence()).thenReturn(1L);
        when(disputeRepository.save(any())).thenAnswer(inv -> { CardDispute d = inv.getArgument(0); d.setId(1L); return d; });

        CardDispute result = disputeService.initiateDispute(1L, 1L, 10L, null, "CTX-001",
                LocalDate.now().minusDays(5), new BigDecimal("500"), "USD",
                "Amazon", "AMZN001", DisputeType.MERCHANDISE_NOT_RECEIVED,
                "Item never delivered", new BigDecimal("500"), "VISA");

        assertThat(result.getStatus()).isEqualTo(DisputeStatus.INITIATED);
        assertThat(result.getFilingDeadline()).isEqualTo(LocalDate.now().minusDays(5).plusDays(120));
        assertThat(result.getTimeline()).hasSize(1);
    }

    @Test
    @DisplayName("Fraud dispute gets 540-day filing deadline")
    void fraudDispute_ExtendedDeadline() {
        when(disputeRepository.getNextDisputeSequence()).thenReturn(2L);
        when(disputeRepository.save(any())).thenAnswer(inv -> { CardDispute d = inv.getArgument(0); d.setId(2L); return d; });

        LocalDate txnDate = LocalDate.now().minusDays(10);
        CardDispute result = disputeService.initiateDispute(1L, 1L, 10L, null, null,
                txnDate, new BigDecimal("2000"), "USD", "Unknown", null,
                DisputeType.FRAUD, "Unauthorized transaction", new BigDecimal("2000"), "MASTERCARD");

        assertThat(result.getFilingDeadline()).isEqualTo(txnDate.plusDays(540));
    }

    @Test
    @DisplayName("Should issue provisional credit and advance to INVESTIGATION")
    void provisionalCredit_Success() {
        CardDispute dispute = CardDispute.builder().id(1L).disputeRef("DSP000000000001")
                .accountId(10L).disputeAmount(new BigDecimal("500")).disputeCurrency("USD")
                .status(DisputeStatus.INITIATED).build();
        dispute.setTimeline(new java.util.ArrayList<>());

        when(disputeRepository.findById(1L)).thenReturn(Optional.of(dispute));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
        when(disputeRepository.save(any())).thenReturn(dispute);
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(1L).build());
        when(accountRepository.save(any())).thenReturn(account);

        CardDispute result = disputeService.issueProvisionalCredit(1L);

        assertThat(result.getProvisionalCreditAmount()).isEqualByComparingTo(new BigDecimal("500"));
        assertThat(result.getStatus()).isEqualTo(DisputeStatus.INVESTIGATION);
        verify(accountPostingService).postCreditAgainstGl(eq(account), any(), eq(new BigDecimal("500")),
                contains("provisional credit"), any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Merchant-favour resolution reverses provisional credit")
    void merchantFavour_ReversesCredit() {
        CardDispute dispute = CardDispute.builder().id(2L).disputeRef("DSP000000000002")
                .accountId(10L).disputeAmount(new BigDecimal("300")).disputeCurrency("USD")
                .provisionalCreditAmount(new BigDecimal("300")).provisionalCreditDate(LocalDate.now().minusDays(5))
                .status(DisputeStatus.REPRESENTMENT).build();
        dispute.setTimeline(new java.util.ArrayList<>());

        when(disputeRepository.findById(2L)).thenReturn(Optional.of(dispute));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
        when(disputeRepository.save(any())).thenReturn(dispute);
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(2L).build());
        when(accountRepository.save(any())).thenReturn(account);

        CardDispute result = disputeService.resolveDispute(2L, "MERCHANT_FAVOUR", new BigDecimal("300"), "Merchant evidence compelling");

        assertThat(result.getStatus()).isEqualTo(DisputeStatus.RESOLVED_MERCHANT);
        assertThat(result.getProvisionalCreditReversed()).isTrue();
        verify(accountPostingService).postDebitAgainstGl(eq(account), any(), eq(new BigDecimal("300")),
                contains("reversal"), any(), anyString(), anyString(), anyString(), anyString());
    }
}
