package com.cbs.unit.deposit;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.deposit.dto.CreateFixedDepositRequest;
import com.cbs.deposit.dto.CreateRecurringDepositRequest;
import com.cbs.deposit.dto.FixedDepositResponse;
import com.cbs.deposit.dto.RecurringDepositResponse;
import com.cbs.deposit.entity.*;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.deposit.repository.RecurringDepositInstallmentRepository;
import com.cbs.deposit.repository.RecurringDepositRepository;
import com.cbs.deposit.service.FixedDepositService;
import com.cbs.deposit.service.RecurringDepositService;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.goal.dto.GoalFundRequest;
import com.cbs.goal.entity.GoalStatus;
import com.cbs.goal.entity.SavingsGoal;
import com.cbs.goal.repository.SavingsGoalRepository;
import com.cbs.goal.repository.SavingsGoalTransactionRepository;
import com.cbs.goal.service.SavingsGoalService;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepositServiceTest {

    // ========================================================================
    // FixedDepositService tests
    // ========================================================================

    @Nested
    @DisplayName("FixedDepositService Tests")
    @ExtendWith(MockitoExtension.class)
    class FixedDepositServiceTests {

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
            customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setFirstName("Jane");
            customer.setLastName("Smith");

            account = new Account();
            account.setId(10L);
            account.setAccountNumber("2000000001");
            account.setCustomer(customer);
            account.setCurrencyCode("USD");
            account.setBookBalance(new BigDecimal("100000.00"));
            account.setAvailableBalance(new BigDecimal("100000.00"));
            account.setStatus(AccountStatus.ACTIVE);

            product = new Product();
            product.setId(1L);
            product.setCode("FD-12M");
            product.setName("12 Month Fixed Deposit");
            product.setCurrencyCode("USD");
            product.setGlAccountCode("2300");
            product.setGlInterestExpenseCode("5300");
            product.setIsActive(true);
        }

        @Test
        @DisplayName("bookDeposit creates FD with ACTIVE status and debits funding account")
        void bookDeposit_createsFdWithActiveStatus() {
            CreateFixedDepositRequest request = CreateFixedDepositRequest.builder()
                    .accountId(10L)
                    .productCode("FD-12M")
                    .principalAmount(new BigDecimal("50000.00"))
                    .tenureDays(365)
                    .interestRate(new BigDecimal("7.50"))
                    .build();

            CbsProperties.InterestConfig interestConfig = new CbsProperties.InterestConfig();

            when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
            when(productRepository.findByCode("FD-12M")).thenReturn(Optional.of(product));
            when(fdRepository.getNextDepositSequence()).thenReturn(1L);
            when(cbsProperties.getInterest()).thenReturn(interestConfig);
            when(fdRepository.save(any(FixedDeposit.class))).thenAnswer(inv -> {
                FixedDeposit fd = inv.getArgument(0);
                fd.setId(1L);
                return fd;
            });
            when(accountPostingService.postDebitAgainstGl(any(Account.class), any(com.cbs.account.entity.TransactionType.class),
                    any(BigDecimal.class), anyString(), any(com.cbs.account.entity.TransactionChannel.class), anyString(),
                    anyString(), anyString(), anyString())).thenReturn(new com.cbs.account.entity.TransactionJournal());

            FixedDepositResponse result = fixedDepositService.bookDeposit(request);

            assertThat(result).isNotNull();
            assertThat(result.getDepositNumber()).isEqualTo("FD000000000001");
            assertThat(result.getStatus()).isEqualTo(FixedDepositStatus.ACTIVE);
            verify(accountPostingService).postDebitAgainstGl(any(Account.class),
                    eq(com.cbs.account.entity.TransactionType.DEBIT), eq(new BigDecimal("50000.00")),
                    anyString(), eq(com.cbs.account.entity.TransactionChannel.SYSTEM), anyString(),
                    eq("2300"), eq("FIXED_DEPOSIT"), anyString());
        }

        @Test
        @DisplayName("bookDeposit rejects when balance is insufficient")
        void bookDeposit_rejectsInsufficientBalance() {
            account.setAvailableBalance(new BigDecimal("1000.00"));
            CreateFixedDepositRequest request = CreateFixedDepositRequest.builder()
                    .accountId(10L)
                    .productCode("FD-12M")
                    .principalAmount(new BigDecimal("50000.00"))
                    .tenureDays(365)
                    .interestRate(new BigDecimal("7.50"))
                    .build();

            when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
            when(productRepository.findByCode("FD-12M")).thenReturn(Optional.of(product));

            assertThatThrownBy(() -> fixedDepositService.bookDeposit(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient balance");
        }

        @Test
        @DisplayName("earlyTerminate rejects deposit that disallows early termination")
        void earlyTerminate_rejectsWhenNotAllowed() {
            FixedDeposit fd = new FixedDeposit();
            fd.setId(1L);
            fd.setStatus(FixedDepositStatus.ACTIVE);
            fd.setAllowsEarlyTermination(false);

            when(fdRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(fd));

            assertThatThrownBy(() -> fixedDepositService.earlyTerminate(1L, "Need funds"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not allowed");
        }

        @Test
        @DisplayName("earlyTerminate rejects non-active deposit")
        void earlyTerminate_rejectsNonActiveDeposit() {
            FixedDeposit fd = new FixedDeposit();
            fd.setId(1L);
            fd.setStatus(FixedDepositStatus.MATURED);

            when(fdRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(fd));

            assertThatThrownBy(() -> fixedDepositService.earlyTerminate(1L, "Need funds"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not active");
        }
    }

    // ========================================================================
    // RecurringDepositService tests
    // ========================================================================

    @Nested
    @DisplayName("RecurringDepositService Tests")
    @ExtendWith(MockitoExtension.class)
    class RecurringDepositServiceTests {

        @Mock private RecurringDepositRepository rdRepository;
        @Mock private RecurringDepositInstallmentRepository installmentRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private ProductRepository productRepository;
        @Mock private DayCountEngine dayCountEngine;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private RecurringDepositService recurringDepositService;

        private Account account;
        private Product product;

        @BeforeEach
        void setUp() {
            Customer customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setFirstName("Jane");
            customer.setLastName("Smith");

            account = new Account();
            account.setId(10L);
            account.setAccountNumber("2000000001");
            account.setCustomer(customer);
            account.setCurrencyCode("USD");
            account.setBookBalance(new BigDecimal("50000.00"));
            account.setAvailableBalance(new BigDecimal("50000.00"));

            product = new Product();
            product.setId(2L);
            product.setCode("RD-MONTHLY");
            product.setName("Monthly Recurring Deposit");
            product.setCurrencyCode("USD");
            product.setIsActive(true);
        }

        @Test
        @DisplayName("bookDeposit creates RD with installment schedule")
        void bookDeposit_createsRdWithInstallmentSchedule() {
            CreateRecurringDepositRequest request = CreateRecurringDepositRequest.builder()
                    .accountId(10L)
                    .productCode("RD-MONTHLY")
                    .installmentAmount(new BigDecimal("5000.00"))
                    .frequency(DepositFrequency.MONTHLY)
                    .totalInstallments(12)
                    .interestRate(new BigDecimal("6.00"))
                    .build();

            CbsProperties.InterestConfig interestConfig = new CbsProperties.InterestConfig();

            when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
            when(productRepository.findByCode("RD-MONTHLY")).thenReturn(Optional.of(product));
            when(rdRepository.getNextDepositSequence()).thenReturn(1L);
            when(cbsProperties.getInterest()).thenReturn(interestConfig);
            when(rdRepository.save(any(RecurringDeposit.class))).thenAnswer(inv -> {
                RecurringDeposit rd = inv.getArgument(0);
                rd.setId(1L);
                return rd;
            });
            when(installmentRepository.findByRecurringDepositIdOrderByInstallmentNumberAsc(anyLong()))
                    .thenReturn(java.util.List.of());

            RecurringDepositResponse result = recurringDepositService.bookDeposit(request);

            assertThat(result).isNotNull();
            assertThat(result.getDepositNumber()).isEqualTo("RD000000000001");
            // Verify save is called twice: first for the deposit, then for the installment schedule
            verify(rdRepository, times(2)).save(any(RecurringDeposit.class));
        }
    }

    // ========================================================================
    // SavingsGoalService tests
    // ========================================================================

    @Nested
    @DisplayName("SavingsGoalService Tests")
    @ExtendWith(MockitoExtension.class)
    class SavingsGoalServiceTests {

        @Mock private SavingsGoalRepository goalRepository;
        @Mock private SavingsGoalTransactionRepository goalTxnRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private SavingsGoalService savingsGoalService;

        private Customer customer;
        private Account account;
        private SavingsGoal goal;

        @BeforeEach
        void setUp() {
            customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setFirstName("Jane");
            customer.setLastName("Smith");

            account = new Account();
            account.setId(10L);
            account.setAccountNumber("2000000001");
            account.setCustomer(customer);
            account.setCurrencyCode("USD");
            account.setBookBalance(new BigDecimal("50000.00"));
            account.setAvailableBalance(new BigDecimal("50000.00"));

            goal = new SavingsGoal();
            goal.setId(1L);
            goal.setGoalNumber("GL000000000001");
            goal.setAccount(account);
            goal.setCustomer(customer);
            goal.setGoalName("Vacation Fund");
            goal.setTargetAmount(new BigDecimal("10000.00"));
            goal.setCurrentAmount(new BigDecimal("3000.00"));
            goal.setProgressPercentage(new BigDecimal("30.00"));
            goal.setStatus(GoalStatus.ACTIVE);
            goal.setIsLocked(false);
            goal.setAllowWithdrawalBeforeTarget(true);
            goal.setCurrencyCode("USD");
        }

        @Test
        @DisplayName("withdrawFromGoal rejects locked goal")
        void withdrawFromGoal_rejectsLockedGoal() {
            goal.setIsLocked(true);
            GoalFundRequest request = GoalFundRequest.builder()
                    .amount(new BigDecimal("1000.00"))
                    .build();

            when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));

            assertThatThrownBy(() -> savingsGoalService.withdrawFromGoal(1L, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("locked");
        }

        @Test
        @DisplayName("Goal deposit recalculates progress percentage correctly")
        void goalDeposit_recalculatesProgress() {
            // SavingsGoal.deposit() is a domain method that updates progress
            SavingsGoal testGoal = new SavingsGoal();
            testGoal.setTargetAmount(new BigDecimal("10000.00"));
            testGoal.setCurrentAmount(BigDecimal.ZERO);
            testGoal.setProgressPercentage(BigDecimal.ZERO);
            testGoal.setStatus(GoalStatus.ACTIVE);

            testGoal.deposit(new BigDecimal("5000.00"));

            assertThat(testGoal.getCurrentAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
            assertThat(testGoal.getProgressPercentage()).isEqualByComparingTo(new BigDecimal("50.00"));
            assertThat(testGoal.getStatus()).isEqualTo(GoalStatus.ACTIVE);
        }

        @Test
        @DisplayName("Goal deposit to target amount transitions status to COMPLETED")
        void goalDeposit_completesGoalWhenTargetReached() {
            SavingsGoal testGoal = new SavingsGoal();
            testGoal.setTargetAmount(new BigDecimal("10000.00"));
            testGoal.setCurrentAmount(new BigDecimal("8000.00"));
            testGoal.setProgressPercentage(new BigDecimal("80.00"));
            testGoal.setStatus(GoalStatus.ACTIVE);

            testGoal.deposit(new BigDecimal("2000.00"));

            assertThat(testGoal.getCurrentAmount()).isEqualByComparingTo(new BigDecimal("10000.00"));
            assertThat(testGoal.getProgressPercentage()).isEqualByComparingTo(new BigDecimal("100.00"));
            assertThat(testGoal.getStatus()).isEqualTo(GoalStatus.COMPLETED);
        }
    }
}
