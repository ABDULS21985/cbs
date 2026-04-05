package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.mudarabah.dto.OpenWakalaAccountRequest;
import com.cbs.mudarabah.entity.RiskLevel;
import com.cbs.mudarabah.entity.StatementFrequency;
import com.cbs.mudarabah.entity.WakalaAccountSubType;
import com.cbs.mudarabah.entity.WakalaDepositAccount;
import com.cbs.mudarabah.entity.WakalaType;
import com.cbs.mudarabah.repository.WakalaDepositAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WakalaDepositServiceTest {

    @Mock private WakalaDepositAccountRepository wakalaRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
        @Mock private CustomerRepository customerRepository;

    @InjectMocks private WakalaDepositService service;

    private Account baseAccount;
        private Customer customer;

    @BeforeEach
    void setUp() {
        baseAccount = Account.builder()
                .id(1L)
                .accountNumber("WKL0000000001")
                .accountName("Wakala Investment Deposit")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .build();

        customer = Customer.builder()
                .id(100L)
                .status(CustomerStatus.ACTIVE)
                .build();
    }

    private OpenWakalaAccountRequest percentageFeeRequest() {
        return OpenWakalaAccountRequest.builder()
                .customerId(100L)
                .productCode("WKL-DEP")
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("100000.00"))
                .wakalaType("PERCENTAGE_FEE")
                .wakalahFeeRate(new BigDecimal("2.0000"))
                .accountSubType("SAVINGS_WAKALA")
                .lossDisclosureAccepted(true)
                .riskLevel("MEDIUM")
                .build();
    }

    private WakalaDepositAccount buildWakalaAccount(Account account, WakalaType type,
                                                      BigDecimal feeRate, BigDecimal feeAmount) {
        return WakalaDepositAccount.builder()
                .id(10L)
                .account(account)
                .contractReference("WKL-DEP-2026-000001")
                .contractSignedDate(LocalDate.now())
                .contractTypeCode("WAKALAH")
                .wakalaType(type)
                .wakalahFeeRate(feeRate)
                .wakalahFeeAmount(feeAmount)
                .feeFrequency(StatementFrequency.ANNUALLY)
                .feeAccrued(BigDecimal.ZERO)
                .totalFeesCharged(BigDecimal.ZERO)
                .riskLevel(RiskLevel.MEDIUM)
                .accountSubType(WakalaAccountSubType.SAVINGS_WAKALA)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .cumulativeFeesDeducted(BigDecimal.ZERO)
                .lossExposure(true)
                .lossDisclosureAccepted(true)
                .bankNegligenceLiability(true)
                .earlyWithdrawalAllowed(true)
                .build();
    }

    // -----------------------------------------------------------------------
    // openWakalaAccount tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Open Wakala account with percentage fee sets fee rate correctly")
    void openWakalaAccount_percentageFee_success() {
                when(customerRepository.findById(100L)).thenReturn(Optional.of(customer));
        when(accountRepository.save(any(Account.class))).thenReturn(baseAccount);
        when(wakalaRepository.save(any(WakalaDepositAccount.class)))
                .thenAnswer(invocation -> {
                    WakalaDepositAccount w = invocation.getArgument(0);
                    w.setId(10L);
                    return w;
                });
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), anyString(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        var response = service.openWakalaAccount(percentageFeeRequest());

        assertThat(response).isNotNull();
        assertThat(response.getWakalaType()).isEqualTo("PERCENTAGE_FEE");
        assertThat(response.getWakalahFeeRate()).isEqualByComparingTo("2.0000");
        assertThat(response.isLossDisclosureAccepted()).isTrue();

        // Verify initial deposit GL posting
        verify(accountPostingService).postCreditAgainstGl(
                eq(baseAccount), eq(TransactionType.CREDIT),
                eq(new BigDecimal("100000.00")),
                anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("1100-000-001"), eq("WAKALA"), anyString());

        // Verify Wakala entity saved with correct fee rate
        ArgumentCaptor<WakalaDepositAccount> captor = ArgumentCaptor.forClass(WakalaDepositAccount.class);
        verify(wakalaRepository).save(captor.capture());
        WakalaDepositAccount saved = captor.getValue();
        assertThat(saved.getWakalahFeeRate()).isEqualByComparingTo("2.0000");
        assertThat(saved.getWakalaType()).isEqualTo(WakalaType.PERCENTAGE_FEE);
    }

    @Test
    @DisplayName("Open Wakala account without loss disclosure is rejected")
    void openWakalaAccount_withoutLossDisclosure_rejected() {
        OpenWakalaAccountRequest request = percentageFeeRequest();
        request.setLossDisclosureAccepted(false);

        assertThatThrownBy(() -> service.openWakalaAccount(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("LOSS_DISCLOSURE_REQUIRED");
                });
    }

    // -----------------------------------------------------------------------
    // calculateFeeAndDistribute tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Percentage fee: gross profit minus fee equals customer profit")
    void calculateFeeAndDistribute_percentageFee_correctSplit() {
        Account investedAccount = Account.builder()
                .id(1L)
                .accountNumber("WKL0000000001")
                .accountName("Wakala Investment Deposit")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("100000.00"))
                .availableBalance(new BigDecimal("100000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        WakalaDepositAccount wakala = buildWakalaAccount(
                investedAccount, WakalaType.PERCENTAGE_FEE,
                new BigDecimal("2.0000"), null);

        when(wakalaRepository.findByAccountId(1L)).thenReturn(Optional.of(wakala));
        when(wakalaRepository.save(any(WakalaDepositAccount.class))).thenReturn(wakala);
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), isNull(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        BigDecimal grossProfit = new BigDecimal("5000.00");
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2027, 1, 1); // exactly 365 days

        var response = service.calculateFeeAndDistribute(1L, grossProfit, from, to);

        assertThat(response).isNotNull();
        assertThat(response.getGrossProfit()).isEqualByComparingTo("5000.00");

        // Fee = bookBalance * rate / 100 * days / 365
        // = 100000 * 2 / 100 * 365 / 365 = 2000.0000
        long periodDays = java.time.temporal.ChronoUnit.DAYS.between(from, to);
        BigDecimal expectedFee = new BigDecimal("100000.00")
                .multiply(new BigDecimal("2.0000"))
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(periodDays))
                .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP);

        assertThat(response.getWakalahFee()).isEqualByComparingTo(expectedFee);
        // Customer profit = gross - fee
        BigDecimal expectedCustomerProfit = grossProfit.subtract(expectedFee);
        assertThat(response.getCustomerProfit()).isEqualByComparingTo(expectedCustomerProfit);

        // Verify customer profit credited
        verify(accountPostingService).postCreditAgainstGl(
                eq(investedAccount), eq(TransactionType.CREDIT),
                eq(expectedCustomerProfit),
                anyString(), eq(TransactionChannel.SYSTEM),
                isNull(), anyString(), eq("WAKALA"), anyString());
    }

    @Test
    @DisplayName("Fixed fee is pro-rated for the period")
    void calculateFeeAndDistribute_fixedFee_prorated() {
        Account investedAccount = Account.builder()
                .id(1L)
                .accountNumber("WKL0000000001")
                .accountName("Wakala Investment Deposit")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("100000.00"))
                .availableBalance(new BigDecimal("100000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        WakalaDepositAccount wakala = buildWakalaAccount(
                investedAccount, WakalaType.FIXED_FEE,
                null, new BigDecimal("3650.0000")); // Annual fixed fee

        when(wakalaRepository.findByAccountId(1L)).thenReturn(Optional.of(wakala));
        when(wakalaRepository.save(any(WakalaDepositAccount.class))).thenReturn(wakala);
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), isNull(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        BigDecimal grossProfit = new BigDecimal("5000.00");
        // 30-day period
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);

        var response = service.calculateFeeAndDistribute(1L, grossProfit, from, to);

        // Fee = 3650 * 30 / 365 = 300.0000
        BigDecimal expectedFee = new BigDecimal("3650.0000")
                .multiply(BigDecimal.valueOf(30))
                .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP);

        assertThat(response.getWakalahFee()).isEqualByComparingTo(expectedFee);
        assertThat(response.getCustomerProfit()).isEqualByComparingTo(
                grossProfit.subtract(expectedFee));
    }

    @Test
    @DisplayName("Performance fee is calculated as percentage of gross profit")
    void calculateFeeAndDistribute_performanceFee_fromProfit() {
        Account investedAccount = Account.builder()
                .id(1L)
                .accountNumber("WKL0000000001")
                .accountName("Wakala Investment Deposit")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("100000.00"))
                .availableBalance(new BigDecimal("100000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        WakalaDepositAccount wakala = buildWakalaAccount(
                investedAccount, WakalaType.PERFORMANCE_FEE,
                new BigDecimal("20.0000"), null); // 20% of profit

        when(wakalaRepository.findByAccountId(1L)).thenReturn(Optional.of(wakala));
        when(wakalaRepository.save(any(WakalaDepositAccount.class))).thenReturn(wakala);
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), isNull(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        BigDecimal grossProfit = new BigDecimal("10000.00");
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);

        var response = service.calculateFeeAndDistribute(1L, grossProfit, from, to);

        // Fee = grossProfit * rate / 100 = 10000 * 20 / 100 = 2000
        BigDecimal expectedFee = grossProfit.multiply(new BigDecimal("20.0000"))
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

        assertThat(response.getWakalahFee()).isEqualByComparingTo(expectedFee);
        assertThat(response.getCustomerProfit()).isEqualByComparingTo(
                grossProfit.subtract(expectedFee));

        // Verify: fee=2000, customer gets 8000
        assertThat(response.getWakalahFee()).isEqualByComparingTo("2000.0000");
        assertThat(response.getCustomerProfit()).isEqualByComparingTo("8000.0000");
    }
}
