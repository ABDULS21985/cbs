package com.cbs.account;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.dto.AccountResponse;
import com.cbs.account.entity.*;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.*;
import com.cbs.account.service.AccountService;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
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
class AccountServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private ProductRepository productRepository;
    @Mock private InterestTierRepository interestTierRepository;
    @Mock private AccountSignatoryRepository signatoryRepository;
    @Mock private TransactionJournalRepository transactionRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AccountMapper accountMapper;
    @Mock private AccountValidator accountValidator;

    @InjectMocks
    private AccountService accountService;

    private Customer testCustomer;
    private Product currentProduct;
    private Product savingsProduct;
    private Product tieredProduct;
    private Account testAccount;

    @BeforeEach
    void setUp() {
        testCustomer = Customer.builder()
                .id(1L).cifNumber("CIF0000100000")
                .customerType(CustomerType.INDIVIDUAL).status(CustomerStatus.ACTIVE)
                .firstName("Amina").lastName("Bakare")
                .build();

        currentProduct = Product.builder()
                .id(1L).code("CA-NGN-STD").name("Standard Current Account")
                .productCategory(ProductCategory.CURRENT).currencyCode("NGN")
                .minOpeningBalance(new BigDecimal("5000.00"))
                .minOperatingBalance(new BigDecimal("1000.00"))
                .interestBearing(false).isActive(true)
                .allowsOverdraft(false).allowsChequeBook(true).allowsDebitCard(true)
                .dormancyDays(365)
                .build();

        savingsProduct = Product.builder()
                .id(2L).code("SA-NGN-STD").name("Standard Savings Account")
                .productCategory(ProductCategory.SAVINGS).currencyCode("NGN")
                .minOpeningBalance(new BigDecimal("2000.00"))
                .interestBearing(true).baseInterestRate(new BigDecimal("3.7500"))
                .interestCalcMethod("DAILY_BALANCE").interestPostingFrequency("MONTHLY")
                .isActive(true).dormancyDays(365)
                .build();

        tieredProduct = Product.builder()
                .id(3L).code("SA-NGN-TIER").name("Tiered Savings Account")
                .productCategory(ProductCategory.SAVINGS).currencyCode("NGN")
                .interestBearing(true).baseInterestRate(BigDecimal.ZERO)
                .interestCalcMethod("DAILY_BALANCE").isActive(true).dormancyDays(365)
                .build();

        testAccount = Account.builder()
                .id(1L).accountNumber("1000000001").accountName("Amina Bakare")
                .customer(testCustomer).product(currentProduct).currencyCode("NGN")
                .accountType(AccountType.INDIVIDUAL).status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("50000.00"))
                .availableBalance(new BigDecimal("50000.00"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now()).activatedDate(LocalDate.now())
                .build();
    }

    @Nested
    @DisplayName("Capability 9: Current / Checking Accounts")
    class CurrentAccountTests {

        @Test
        @DisplayName("Should open a current account successfully")
        void openCurrentAccount_Success() {
            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L).productCode("CA-NGN-STD")
                    .accountType(AccountType.INDIVIDUAL)
                    .initialDeposit(new BigDecimal("10000.00"))
                    .branchCode("ABJ001")
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(productRepository.findByCode("CA-NGN-STD")).thenReturn(Optional.of(currentProduct));
            when(accountRepository.getNextAccountNumberSequence()).thenReturn(1000000001L);
            when(accountRepository.save(any(Account.class))).thenReturn(testAccount);
            when(transactionRepository.existsByExternalRef(any())).thenReturn(false);
            when(transactionRepository.getNextTransactionRefSequence()).thenReturn(1L);
            when(transactionRepository.save(any(TransactionJournal.class))).thenReturn(new TransactionJournal());
            when(signatoryRepository.findByAccountIdWithCustomer(anyLong())).thenReturn(List.of());

            AccountResponse mockResponse = AccountResponse.builder()
                    .id(1L).accountNumber("1000000001").productCode("CA-NGN-STD")
                    .status(AccountStatus.ACTIVE).build();
            when(accountMapper.toResponse(any())).thenReturn(mockResponse);
            when(accountMapper.toSignatoryDtoList(any())).thenReturn(List.of());

            AccountResponse result = accountService.openAccount(request);

            assertThat(result).isNotNull();
            assertThat(result.getAccountNumber()).isEqualTo("1000000001");
            verify(accountValidator).validateOpeningDeposit(currentProduct, request.getInitialDeposit());
            verify(accountRepository).save(any(Account.class));
        }

        @Test
        @DisplayName("Should reject account opening for inactive customer")
        void openAccount_InactiveCustomer() {
            testCustomer.setStatus(CustomerStatus.SUSPENDED);

            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L).productCode("CA-NGN-STD")
                    .accountType(AccountType.INDIVIDUAL).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));

            assertThatThrownBy(() -> accountService.openAccount(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("non-active customer");
        }

        @Test
        @DisplayName("Should reject account opening for inactive product")
        void openAccount_InactiveProduct() {
            currentProduct.setIsActive(false);

            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L).productCode("CA-NGN-STD")
                    .accountType(AccountType.INDIVIDUAL).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(productRepository.findByCode("CA-NGN-STD")).thenReturn(Optional.of(currentProduct));

            assertThatThrownBy(() -> accountService.openAccount(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not active");
        }

        @Test
        @DisplayName("Should get account by number")
        void getAccount_Success() {
            when(accountRepository.findByAccountNumberWithDetails("1000000001"))
                    .thenReturn(Optional.of(testAccount));
            when(signatoryRepository.findByAccountIdWithCustomer(1L)).thenReturn(List.of());

            AccountResponse mockResponse = AccountResponse.builder()
                    .id(1L).accountNumber("1000000001").build();
            when(accountMapper.toResponse(testAccount)).thenReturn(mockResponse);
            when(accountMapper.toSignatoryDtoList(any())).thenReturn(List.of());

            AccountResponse result = accountService.getAccount("1000000001");
            assertThat(result.getAccountNumber()).isEqualTo("1000000001");
        }

        @Test
        @DisplayName("Should throw not found for invalid account")
        void getAccount_NotFound() {
            when(accountRepository.findByAccountNumberWithDetails("9999999999"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> accountService.getAccount("9999999999"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Capability 10: Savings Accounts with Tiered Interest")
    class SavingsInterestTests {

        @Test
        @DisplayName("Should resolve base interest rate for standard savings")
        void resolveRate_StandardSavings() {
            when(interestTierRepository.findActiveTiersByProduct(2L)).thenReturn(List.of());

            BigDecimal rate = accountService.resolveInterestRate(savingsProduct, new BigDecimal("100000"));

            assertThat(rate).isEqualByComparingTo(new BigDecimal("3.7500"));
        }

        @Test
        @DisplayName("Should resolve tiered rate for matching balance")
        void resolveRate_TieredSavings() {
            List<InterestTier> tiers = List.of(
                    InterestTier.builder().minBalance(BigDecimal.ZERO)
                            .maxBalance(new BigDecimal("49999.99")).interestRate(new BigDecimal("1.7500"))
                            .isActive(true).build(),
                    InterestTier.builder().minBalance(new BigDecimal("50000.00"))
                            .maxBalance(new BigDecimal("499999.99")).interestRate(new BigDecimal("3.2500"))
                            .isActive(true).build(),
                    InterestTier.builder().minBalance(new BigDecimal("500000.00"))
                            .maxBalance(null).interestRate(new BigDecimal("6.0000"))
                            .isActive(true).build()
            );

            when(interestTierRepository.findActiveTiersByProduct(3L)).thenReturn(tiers);

            // Balance 100,000 should match Tier 2
            BigDecimal rate = accountService.resolveInterestRate(tieredProduct, new BigDecimal("100000"));
            assertThat(rate).isEqualByComparingTo(new BigDecimal("3.2500"));

            // Balance 1,000,000 should match Tier 3
            BigDecimal highRate = accountService.resolveInterestRate(tieredProduct, new BigDecimal("1000000"));
            assertThat(highRate).isEqualByComparingTo(new BigDecimal("6.0000"));

            // Balance 10,000 should match Tier 1
            BigDecimal lowRate = accountService.resolveInterestRate(tieredProduct, new BigDecimal("10000"));
            assertThat(lowRate).isEqualByComparingTo(new BigDecimal("1.7500"));
        }

        @Test
        @DisplayName("Should return zero rate for non-interest-bearing product")
        void resolveRate_NonInterestBearing() {
            BigDecimal rate = accountService.resolveInterestRate(currentProduct, new BigDecimal("50000"));
            assertThat(rate).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should accrue daily interest correctly")
        void accrueInterest_DailyBalance() {
            Account savingsAccount = Account.builder()
                    .id(10L).accountNumber("1000000010").product(savingsProduct)
                    .customer(testCustomer).currencyCode("NGN")
                    .accountType(AccountType.INDIVIDUAL).status(AccountStatus.ACTIVE)
                    .bookBalance(new BigDecimal("1000000.00"))
                    .availableBalance(new BigDecimal("1000000.00"))
                    .accruedInterest(BigDecimal.ZERO)
                    .applicableInterestRate(new BigDecimal("3.7500"))
                    .build();

            when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(savingsAccount));
            when(interestTierRepository.findActiveTiersByProduct(2L)).thenReturn(List.of());
            when(accountRepository.save(any())).thenReturn(savingsAccount);

            BigDecimal accrued = accountService.accrueInterestForAccount(10L);

            // Expected: 1,000,000 * 3.75 / 36500 = 102.7397
            BigDecimal expected = new BigDecimal("1000000").multiply(new BigDecimal("3.7500"))
                    .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);
            assertThat(accrued).isEqualByComparingTo(expected);
            verify(accountRepository).save(savingsAccount);
        }

        @Test
        @DisplayName("Should not accrue interest on zero balance")
        void accrueInterest_ZeroBalance() {
            Account emptyAccount = Account.builder()
                    .id(11L).product(savingsProduct).customer(testCustomer)
                    .status(AccountStatus.ACTIVE)
                    .bookBalance(BigDecimal.ZERO).accruedInterest(BigDecimal.ZERO)
                    .build();

            when(accountRepository.findByIdWithProduct(11L)).thenReturn(Optional.of(emptyAccount));

            BigDecimal accrued = accountService.accrueInterestForAccount(11L);
            assertThat(accrued).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }
}
