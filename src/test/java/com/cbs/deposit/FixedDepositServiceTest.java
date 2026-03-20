package com.cbs.deposit;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.deposit.dto.CreateFixedDepositRequest;
import com.cbs.deposit.dto.FixedDepositResponse;
import com.cbs.deposit.entity.*;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.deposit.service.FixedDepositService;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.provider.interest.DayCountEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FixedDepositServiceTest {

    @Mock private FixedDepositRepository fdRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private ProductRepository productRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private CurrentActorProvider currentActorProvider;
    @Mock private DayCountEngine dayCountEngine;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private FixedDepositService fixedDepositService;

    private Customer customer;
    private Account account;
    private Product product;

    @BeforeEach
    void setUp() {
        customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        product = Product.builder().id(1L).code("FD-USD").name("Fixed Deposit USD")
                .productCategory(ProductCategory.FIXED_DEPOSIT).currencyCode("USD")
                .glAccountCode("2300").glInterestExpenseCode("5300")
                .isActive(true).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer).product(product)
                .currencyCode("USD").status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("100000")).availableBalance(new BigDecimal("100000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO).build();
    }

    @Nested
    @DisplayName("Capability 11: Fixed Deposit Booking")
    class BookingTests {

        @Test
        @DisplayName("Should book fixed deposit and debit funding account")
        void bookDeposit_Success() {
            CreateFixedDepositRequest request = CreateFixedDepositRequest.builder()
                    .accountId(1L).productCode("FD-USD")
                    .principalAmount(new BigDecimal("50000")).tenureDays(90)
                    .interestRate(new BigDecimal("5.0000")).build();

            CbsProperties.InterestConfig interestConfig = new CbsProperties.InterestConfig();
            when(cbsProperties.getInterest()).thenReturn(interestConfig);
            when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
            when(productRepository.findByCode("FD-USD")).thenReturn(Optional.of(product));
            when(fdRepository.getNextDepositSequence()).thenReturn(100001L);
            when(fdRepository.save(any(FixedDeposit.class))).thenAnswer(inv -> {
                FixedDeposit fd = inv.getArgument(0);
                fd.setId(1L);
                return fd;
            });
            when(accountPostingService.postDebitAgainstGl(any(Account.class), any(TransactionType.class),
                    any(BigDecimal.class), anyString(), any(TransactionChannel.class), anyString(),
                    anyString(), anyString(), anyString())).thenReturn(new TransactionJournal());

            FixedDepositResponse result = fixedDepositService.bookDeposit(request);

            assertThat(result).isNotNull();
            assertThat(result.getDepositNumber()).startsWith("FD");
            assertThat(result.getPrincipalAmount()).isEqualByComparingTo(new BigDecimal("50000"));
            assertThat(result.getStatus()).isEqualTo(FixedDepositStatus.ACTIVE);
            verify(accountPostingService).postDebitAgainstGl(any(Account.class), eq(TransactionType.DEBIT),
                    eq(new BigDecimal("50000")), anyString(), eq(TransactionChannel.SYSTEM), anyString(),
                    eq("2300"), eq("FIXED_DEPOSIT"), anyString());
        }

        @Test
        @DisplayName("Should reject booking with insufficient balance")
        void bookDeposit_InsufficientBalance() {
            account.setAvailableBalance(new BigDecimal("1000"));
            CreateFixedDepositRequest request = CreateFixedDepositRequest.builder()
                    .accountId(1L).productCode("FD-USD")
                    .principalAmount(new BigDecimal("50000")).tenureDays(90)
                    .interestRate(new BigDecimal("5.0000")).build();

            when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
            when(productRepository.findByCode("FD-USD")).thenReturn(Optional.of(product));

            assertThatThrownBy(() -> fixedDepositService.bookDeposit(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient balance");
        }
    }

    @Nested
    @DisplayName("Capability 11: Interest Accrual & Maturity")
    class AccrualTests {

        @Test
        @DisplayName("Should accrue daily interest on active fixed deposit")
        void accrueInterest_Success() {
            FixedDeposit fd = FixedDeposit.builder().id(1L).depositNumber("FD000000100001")
                    .account(account).customer(customer).product(product)
                    .principalAmount(new BigDecimal("50000")).currentValue(new BigDecimal("50000"))
                    .accruedInterest(BigDecimal.ZERO).interestRate(new BigDecimal("5.0000"))
                    .status(FixedDepositStatus.ACTIVE).startDate(LocalDate.now().minusDays(30))
                    .maturityDate(LocalDate.now().plusDays(60)).build();

            BigDecimal dailyInterest = new BigDecimal("6.8493");
            when(fdRepository.findById(1L)).thenReturn(Optional.of(fd));
            when(dayCountEngine.calculateDailyAccrual(any(), any(), any())).thenReturn(dailyInterest);
            when(fdRepository.save(any())).thenReturn(fd);

            BigDecimal result = fixedDepositService.accrueInterest(1L);
            assertThat(result).isEqualByComparingTo(dailyInterest);
            verify(fdRepository).save(fd);
        }

        @Test
        @DisplayName("Should process matured deposits")
        void processMatured_CreditAccount() {
            FixedDeposit fd = FixedDeposit.builder().id(1L).depositNumber("FD000000100001")
                    .account(account).customer(customer).product(product).currencyCode("USD")
                    .principalAmount(new BigDecimal("50000")).currentValue(new BigDecimal("50685"))
                    .accruedInterest(new BigDecimal("685.0000")).totalInterestEarned(BigDecimal.ZERO)
                    .interestRate(new BigDecimal("5.0000"))
                    .status(FixedDepositStatus.ACTIVE)
                    .maturityAction(MaturityAction.CREDIT_ACCOUNT)
                    .startDate(LocalDate.now().minusDays(90))
                    .maturityDate(LocalDate.now().minusDays(1))
                    .rolloverCount(0).build();

            when(fdRepository.findMaturedDeposits(any())).thenReturn(List.of(fd));
            when(accountPostingService.postCreditAgainstGl(any(Account.class), any(TransactionType.class),
                    any(BigDecimal.class), anyString(), any(TransactionChannel.class), anyString(),
                    anyList(), anyString(), anyString())).thenReturn(new TransactionJournal());
            when(fdRepository.save(any())).thenReturn(fd);

            int processed = fixedDepositService.processMaturedDeposits();
            assertThat(processed).isEqualTo(1);
            assertThat(fd.getStatus()).isEqualTo(FixedDepositStatus.MATURED);
        }

        @Test
        @DisplayName("Should rollover principal only and credit interest")
        void processMatured_RolloverPrincipal() {
            FixedDeposit fd = FixedDeposit.builder().id(2L).depositNumber("FD000000100002")
                    .account(account).customer(customer).product(product).currencyCode("USD")
                    .principalAmount(new BigDecimal("50000")).currentValue(new BigDecimal("50685"))
                    .accruedInterest(new BigDecimal("685.0000")).totalInterestEarned(BigDecimal.ZERO)
                    .interestRate(new BigDecimal("5.0000")).tenureDays(90)
                    .status(FixedDepositStatus.ACTIVE)
                    .maturityAction(MaturityAction.ROLLOVER_PRINCIPAL)
                    .startDate(LocalDate.now().minusDays(90))
                    .maturityDate(LocalDate.now().minusDays(1))
                    .rolloverCount(0).maxRollovers(3).build();

            when(fdRepository.findMaturedDeposits(any())).thenReturn(List.of(fd));
            when(accountPostingService.postCreditAgainstGl(any(Account.class), any(TransactionType.class),
                    any(BigDecimal.class), anyString(), any(TransactionChannel.class), anyString(),
                    anyString(), anyString(), anyString())).thenReturn(new TransactionJournal());
            when(fdRepository.save(any())).thenReturn(fd);

            fixedDepositService.processMaturedDeposits();
            assertThat(fd.getStatus()).isEqualTo(FixedDepositStatus.ACTIVE);
            assertThat(fd.getRolloverCount()).isEqualTo(1);
            assertThat(fd.getMaturityDate()).isAfter(LocalDate.now());
        }
    }

    @Nested
    @DisplayName("Capability 11: Early Termination")
    class EarlyTerminationTests {

        @Test
        @DisplayName("Should early terminate with penalty")
        void earlyTerminate_WithPenalty() {
            FixedDeposit fd = FixedDeposit.builder().id(3L).depositNumber("FD000000100003")
                    .account(account).customer(customer).product(product).currencyCode("USD")
                    .principalAmount(new BigDecimal("50000")).currentValue(new BigDecimal("50300"))
                    .accruedInterest(new BigDecimal("300.0000")).totalInterestEarned(BigDecimal.ZERO)
                    .interestRate(new BigDecimal("5.0000"))
                    .status(FixedDepositStatus.ACTIVE)
                    .allowsEarlyTermination(true)
                    .earlyTerminationPenaltyType(PenaltyType.PERCENTAGE)
                    .earlyTerminationPenaltyValue(new BigDecimal("50"))
                    .startDate(LocalDate.now().minusDays(45))
                    .maturityDate(LocalDate.now().plusDays(45))
                    .build();

            when(fdRepository.findByIdWithDetails(3L)).thenReturn(Optional.of(fd));
            when(accountPostingService.postCreditAgainstGl(any(Account.class), any(TransactionType.class),
                    any(BigDecimal.class), anyString(), any(TransactionChannel.class), anyString(),
                    anyList(), anyString(), anyString())).thenReturn(new TransactionJournal());
            when(fdRepository.save(any())).thenReturn(fd);

            FixedDepositResponse result = fixedDepositService.earlyTerminate(3L, "Need funds urgently");
            assertThat(result.getStatus()).isEqualTo(FixedDepositStatus.BROKEN);
        }

        @Test
        @DisplayName("Should reject early termination when not allowed")
        void earlyTerminate_NotAllowed() {
            FixedDeposit fd = FixedDeposit.builder().id(4L)
                    .account(account).customer(customer).product(product)
                    .status(FixedDepositStatus.ACTIVE).allowsEarlyTermination(false).build();

            when(fdRepository.findByIdWithDetails(4L)).thenReturn(Optional.of(fd));

            assertThatThrownBy(() -> fixedDepositService.earlyTerminate(4L, "reason"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not allowed");
        }
    }
}
