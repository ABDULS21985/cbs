package com.cbs.unit.payments;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.repository.CardTransactionRepository;
import com.cbs.card.service.CardService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.payments.entity.*;
import com.cbs.payments.repository.FxRateRepository;
import com.cbs.payments.repository.PaymentBatchRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.payments.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    // ========================================================================
    // PaymentService Tests
    // ========================================================================

    @Nested
    @DisplayName("PaymentService - Internal Transfer Tests")
    @ExtendWith(MockitoExtension.class)
    class InternalTransferTests {

        @Mock private PaymentInstructionRepository paymentRepository;
        @Mock private PaymentBatchRepository batchRepository;
        @Mock private FxRateRepository fxRateRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private AccountPostingService accountPostingService;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private PaymentService paymentService;

        private Account debitAccount;
        private Account creditAccount;
        private Customer customer;

        @BeforeEach
        void setUp() {
            CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
            ledgerConfig.setExternalClearingGlCode("2100");
            when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
            customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("Jane");
            customer.setLastName("Doe");

            debitAccount = new Account();
            debitAccount.setId(1L);
            debitAccount.setAccountNumber("1000000001");
            debitAccount.setBookBalance(new BigDecimal("10000.00"));
            debitAccount.setAvailableBalance(new BigDecimal("10000.00"));
            debitAccount.setCurrencyCode("USD");
            debitAccount.setCustomer(customer);

            creditAccount = new Account();
            creditAccount.setId(2L);
            creditAccount.setAccountNumber("1000000002");
            creditAccount.setBookBalance(new BigDecimal("5000.00"));
            creditAccount.setAvailableBalance(new BigDecimal("5000.00"));
            creditAccount.setCurrencyCode("USD");
            creditAccount.setCustomer(customer);
        }

        @Test
        @DisplayName("executeInternalTransfer debits sender and credits receiver for same-currency transfer")
        void executeInternalTransfer_sameCurrency_debitsAndCredits() {
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(accountRepository.findById(2L)).thenReturn(Optional.of(creditAccount));
            when(paymentRepository.getNextInstructionSequence()).thenReturn(1L);
            when(paymentRepository.save(any(PaymentInstruction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountPostingService.postTransfer(any(Account.class), any(Account.class), any(BigDecimal.class),
                    any(BigDecimal.class), anyString(), anyString(), any(com.cbs.account.entity.TransactionChannel.class),
                    anyString(), anyString(), anyString()))
                    .thenReturn(new AccountPostingService.TransferPosting(
                            new com.cbs.account.entity.TransactionJournal(),
                            new com.cbs.account.entity.TransactionJournal(),
                            null));

            PaymentInstruction result = paymentService.executeInternalTransfer(
                    1L, 2L, new BigDecimal("1000.00"), "Test transfer");

            assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
            assertThat(result.getPaymentType()).isEqualTo(PaymentType.INTERNAL_TRANSFER);
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("1000.00"));
            verify(accountPostingService).postTransfer(eq(debitAccount), eq(creditAccount),
                    eq(new BigDecimal("1000.00")), eq(new BigDecimal("1000.00")),
                    eq("Test transfer"), eq("Test transfer"),
                    eq(com.cbs.account.entity.TransactionChannel.API), anyString(), eq("PAYMENTS"), anyString());
        }

        @Test
        @DisplayName("executeInternalTransfer throws BusinessException for insufficient balance")
        void executeInternalTransfer_insufficientBalance_throws() {
            debitAccount.setAvailableBalance(new BigDecimal("500.00"));
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(accountRepository.findById(2L)).thenReturn(Optional.of(creditAccount));

            assertThatThrownBy(() -> paymentService.executeInternalTransfer(
                    1L, 2L, new BigDecimal("1000.00"), "Test"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient balance");

            verify(paymentRepository, never()).save(any());
        }

        @Test
        @DisplayName("executeInternalTransfer rejects transfer to the same account")
        void executeInternalTransfer_sameAccount_throws() {
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));

            assertThatThrownBy(() -> paymentService.executeInternalTransfer(
                    1L, 1L, new BigDecimal("100.00"), "Self transfer"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("same account");
        }
    }

    // ========================================================================
    // PaymentService - Domestic Payment Tests
    // ========================================================================

    @Nested
    @DisplayName("PaymentService - Domestic Payment Tests")
    @ExtendWith(MockitoExtension.class)
    class DomesticPaymentTests {

        @Mock private PaymentInstructionRepository paymentRepository;
        @Mock private PaymentBatchRepository batchRepository;
        @Mock private FxRateRepository fxRateRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private AccountPostingService accountPostingService;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private PaymentService paymentService;

        private Account debitAccount;

        @BeforeEach
        void setUp() {
            CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
            ledgerConfig.setExternalClearingGlCode("2100");
            when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
            Customer customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("John");
            customer.setLastName("Smith");

            debitAccount = new Account();
            debitAccount.setId(1L);
            debitAccount.setAccountNumber("1000000001");
            debitAccount.setBookBalance(new BigDecimal("50000.00"));
            debitAccount.setAvailableBalance(new BigDecimal("50000.00"));
            debitAccount.setCurrencyCode("USD");
            debitAccount.setCustomer(customer);
        }

        @Test
        @DisplayName("initiateDomesticPayment completes locally when credit account exists")
        void initiateDomesticPayment_localCredit_completesImmediately() {
            Account localCredit = new Account();
            localCredit.setId(2L);
            localCredit.setAccountNumber("2000000001");
            localCredit.setBookBalance(BigDecimal.ZERO);
            localCredit.setAvailableBalance(BigDecimal.ZERO);

            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(paymentRepository.getNextInstructionSequence()).thenReturn(100L);
            when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(localCredit));
            when(paymentRepository.save(any(PaymentInstruction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountPostingService.postTransfer(any(Account.class), any(Account.class), any(BigDecimal.class),
                    any(BigDecimal.class), anyString(), anyString(), any(com.cbs.account.entity.TransactionChannel.class),
                    anyString(), anyString(), anyString()))
                    .thenReturn(new AccountPostingService.TransferPosting(
                            new com.cbs.account.entity.TransactionJournal(),
                            new com.cbs.account.entity.TransactionJournal(),
                            null));

            PaymentInstruction result = paymentService.initiateDomesticPayment(
                    1L, "2000000001", "Beneficiary", "BANK001",
                    new BigDecimal("5000.00"), "USD", "Invoice payment", true);

            assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
            assertThat(result.getPaymentType()).isEqualTo(PaymentType.DOMESTIC_INSTANT);
            verify(accountPostingService).postTransfer(eq(debitAccount), eq(localCredit),
                    eq(new BigDecimal("5000.00")), eq(new BigDecimal("5000.00")),
                    eq("Invoice payment"), anyString(),
                    eq(com.cbs.account.entity.TransactionChannel.API), anyString(), eq("PAYMENTS"), anyString());
        }

        @Test
        @DisplayName("initiateDomesticPayment submits externally when credit account not local")
        void initiateDomesticPayment_externalCredit_submits() {
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(paymentRepository.getNextInstructionSequence()).thenReturn(101L);
            when(accountRepository.findByAccountNumber("EXT_ACC_001")).thenReturn(Optional.empty());
            when(paymentRepository.save(any(PaymentInstruction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountPostingService.postDebitAgainstGl(any(Account.class), any(com.cbs.account.entity.TransactionType.class),
                    any(BigDecimal.class), anyString(), any(com.cbs.account.entity.TransactionChannel.class), anyString(),
                    anyString(), anyString(), anyString())).thenReturn(new com.cbs.account.entity.TransactionJournal());

            PaymentInstruction result = paymentService.initiateDomesticPayment(
                    1L, "EXT_ACC_001", "External Beneficiary", "EXTBANK",
                    new BigDecimal("2000.00"), "USD", "External payment", false);

            assertThat(result.getStatus()).isEqualTo(PaymentStatus.SUBMITTED);
            assertThat(result.getPaymentType()).isEqualTo(PaymentType.DOMESTIC_BATCH);
        }
    }

    // ========================================================================
    // PaymentService - SWIFT Transfer Tests
    // ========================================================================

    @Nested
    @DisplayName("PaymentService - SWIFT Transfer Tests")
    @ExtendWith(MockitoExtension.class)
    class SwiftTransferTests {

        @Mock private PaymentInstructionRepository paymentRepository;
        @Mock private PaymentBatchRepository batchRepository;
        @Mock private FxRateRepository fxRateRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private AccountPostingService accountPostingService;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private PaymentService paymentService;

        private Account debitAccount;

        @BeforeEach
        void setUp() {
            CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
            ledgerConfig.setExternalClearingGlCode("2100");
            when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
            debitAccount = new Account();
            debitAccount.setId(1L);
            debitAccount.setAccountNumber("1000000001");
            debitAccount.setBookBalance(new BigDecimal("100000.00"));
            debitAccount.setAvailableBalance(new BigDecimal("100000.00"));
            debitAccount.setCurrencyCode("USD");
        }

        @Test
        @DisplayName("initiateSwiftTransfer creates SWIFT payment with charge calculation")
        void initiateSwiftTransfer_calculatesChargesAndSubmits() {
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(paymentRepository.getNextInstructionSequence()).thenReturn(200L);
            when(paymentRepository.save(any(PaymentInstruction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountPostingService.postDebitAgainstGl(any(Account.class), any(com.cbs.account.entity.TransactionType.class),
                    any(BigDecimal.class), anyString(), any(com.cbs.account.entity.TransactionChannel.class), anyString(),
                    anyList(), anyString(), anyString())).thenReturn(new com.cbs.account.entity.TransactionJournal());

            PaymentInstruction result = paymentService.initiateSwiftTransfer(
                    1L, "GB82WEST12345698765432", "John Doe",
                    "WESTGB2L", "Westminster Bank", new BigDecimal("10000.00"),
                    "USD", "USD", "TRADE", "Invoice 123", "SHA");

            assertThat(result.getStatus()).isEqualTo(PaymentStatus.SUBMITTED);
            assertThat(result.getPaymentType()).isEqualTo(PaymentType.INTERNATIONAL_WIRE);
            assertThat(result.getPaymentRail()).isEqualTo("SWIFT");
            assertThat(result.getChargeAmount()).isNotNull();
            assertThat(result.getChargeAmount().compareTo(new BigDecimal("25.00"))).isGreaterThanOrEqualTo(0);
        }

        @Test
        @DisplayName("initiateSwiftTransfer throws for insufficient balance including OUR charges")
        void initiateSwiftTransfer_insufficientBalanceWithCharges_throws() {
            debitAccount.setAvailableBalance(new BigDecimal("10000.00"));
            when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
            when(paymentRepository.getNextInstructionSequence()).thenReturn(201L);

            assertThatThrownBy(() -> paymentService.initiateSwiftTransfer(
                    1L, "GB82WEST12345698765432", "John Doe",
                    "WESTGB2L", "Westminster Bank", new BigDecimal("10000.00"),
                    "USD", "USD", "TRADE", "Invoice 123", "OUR"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient balance");
        }
    }

    // ========================================================================
    // CardService Tests
    // ========================================================================

    @Nested
    @DisplayName("CardService Tests")
    @ExtendWith(MockitoExtension.class)
    class CardServiceTests {

        @Mock private CardRepository cardRepository;
        @Mock private CardTransactionRepository txnRepository;
        @Mock private AccountRepository accountRepository;

        @InjectMocks private CardService cardService;

        private Account account;
        private Card card;

        @BeforeEach
        void setUp() {
            Customer customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("Alice");
            customer.setLastName("Smith");

            account = new Account();
            account.setId(1L);
            account.setAccountNumber("3000000001");
            account.setCurrencyCode("USD");
            account.setCustomer(customer);

            card = Card.builder()
                    .id(10L)
                    .cardReference("CRD-ABC123")
                    .cardNumberHash("hash123")
                    .cardNumberMasked("4111******1234")
                    .account(account)
                    .customer(customer)
                    .cardType(CardType.DEBIT)
                    .cardScheme(CardScheme.VISA)
                    .cardTier("CLASSIC")
                    .cardholderName("Alice Smith")
                    .expiryDate(LocalDate.now().plusYears(3))
                    .status(CardStatus.ACTIVE)
                    .currencyCode("USD")
                    .pinRetriesRemaining(3)
                    .isContactlessEnabled(true)
                    .isOnlineEnabled(true)
                    .isInternationalEnabled(false)
                    .isAtmEnabled(true)
                    .isPosEnabled(true)
                    .outstandingBalance(BigDecimal.ZERO)
                    .build();
        }

        @Test
        @DisplayName("issueCard creates card with ACTIVE status for valid account")
        void issueCard_createsCardWithActiveStatus() {
            when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
            when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

            Card result = cardService.issueCard(1L, CardType.DEBIT, CardScheme.VISA,
                    "GOLD", "Alice Smith", LocalDate.now().plusYears(3),
                    new BigDecimal("50000"), new BigDecimal("20000"),
                    new BigDecimal("100000"), new BigDecimal("10000"), null);

            assertThat(result.getStatus()).isEqualTo(CardStatus.ACTIVE);
            assertThat(result.getCardType()).isEqualTo(CardType.DEBIT);
            assertThat(result.getCardScheme()).isEqualTo(CardScheme.VISA);
            verify(cardRepository).save(any(Card.class));
        }

        @Test
        @DisplayName("blockCard sets status to BLOCKED with reason")
        void blockCard_setsBlockedStatus() {
            when(cardRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(card));
            when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

            Card result = cardService.blockCard(10L, "Suspected fraud");

            assertThat(result.getStatus()).isEqualTo(CardStatus.BLOCKED);
            assertThat(result.getBlockReason()).isEqualTo("Suspected fraud");
        }

        @Test
        @DisplayName("activateCard rejects card not in PENDING_ACTIVATION status")
        void activateCard_rejectsNonPendingCard() {
            card.setStatus(CardStatus.ACTIVE);
            when(cardRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(card));

            assertThatThrownBy(() -> cardService.activateCard(10L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not pending activation");
        }
    }
}
