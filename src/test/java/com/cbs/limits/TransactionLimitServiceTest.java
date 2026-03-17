package com.cbs.limits;

import com.cbs.account.entity.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.limits.entity.*;
import com.cbs.limits.repository.*;
import com.cbs.limits.service.TransactionLimitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionLimitServiceTest {

    @Mock private TransactionLimitRepository limitRepository;
    @Mock private TransactionLimitUsageRepository usageRepository;

    @InjectMocks private TransactionLimitService limitService;

    private Account account;
    private TransactionLimit globalLimit;

    @BeforeEach
    void setUp() {
        Customer customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer)
                .currencyCode("USD").product(Product.builder().id(1L).code("CA-STD").build()).build();

        globalLimit = TransactionLimit.builder().id(1L)
                .limitType(LimitType.DAILY_DEBIT).scope(LimitScope.GLOBAL)
                .maxAmount(new BigDecimal("500000")).maxCount(100)
                .currencyCode("USD").isActive(true).effectiveFrom(LocalDate.now()).build();
    }

    @Test
    @DisplayName("Should allow transaction within daily limit")
    void withinLimit() {
        TransactionLimitUsage usage = TransactionLimitUsage.builder()
                .accountId(1L).limitType(LimitType.DAILY_DEBIT)
                .usageDate(LocalDate.now()).totalAmount(new BigDecimal("100000")).totalCount(5)
                .currencyCode("USD").build();

        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.CUSTOMER), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.ACCOUNT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.PRODUCT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.GLOBAL), any(), any()))
                .thenReturn(List.of(globalLimit));
        when(usageRepository.findByAccountIdAndLimitTypeAndUsageDate(1L, LimitType.DAILY_DEBIT, LocalDate.now()))
                .thenReturn(Optional.of(usage));
        when(usageRepository.save(any())).thenReturn(usage);

        // 100000 existing + 50000 new = 150000, limit is 500000 — should pass
        limitService.validateAndRecordUsage(account, LimitType.DAILY_DEBIT, new BigDecimal("50000"), "ONLINE");
        verify(usageRepository).save(any());
    }

    @Test
    @DisplayName("Should reject transaction exceeding daily cumulative limit")
    void exceedsCumulativeLimit() {
        TransactionLimitUsage usage = TransactionLimitUsage.builder()
                .accountId(1L).limitType(LimitType.DAILY_DEBIT)
                .usageDate(LocalDate.now()).totalAmount(new BigDecimal("490000")).totalCount(50)
                .currencyCode("USD").build();

        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.CUSTOMER), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.ACCOUNT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.PRODUCT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.GLOBAL), any(), any()))
                .thenReturn(List.of(globalLimit));
        when(usageRepository.findByAccountIdAndLimitTypeAndUsageDate(1L, LimitType.DAILY_DEBIT, LocalDate.now()))
                .thenReturn(Optional.of(usage));

        // 490000 existing + 20000 new = 510000 > 500000 limit
        assertThatThrownBy(() -> limitService.validateAndRecordUsage(
                account, LimitType.DAILY_DEBIT, new BigDecimal("20000"), "ONLINE"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DAILY_DEBIT");
    }

    @Test
    @DisplayName("Should reject single transaction exceeding per-transaction limit")
    void exceedsSingleTxnLimit() {
        TransactionLimit singleLimit = TransactionLimit.builder().id(2L)
                .limitType(LimitType.SINGLE_TRANSACTION).scope(LimitScope.GLOBAL)
                .maxAmount(new BigDecimal("100000")).currencyCode("USD").isActive(true)
                .effectiveFrom(LocalDate.now()).build();

        when(limitRepository.findApplicableLimits(eq(LimitType.SINGLE_TRANSACTION), eq(LimitScope.CUSTOMER), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.SINGLE_TRANSACTION), eq(LimitScope.ACCOUNT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.SINGLE_TRANSACTION), eq(LimitScope.PRODUCT), any(), any()))
                .thenReturn(List.of());
        when(limitRepository.findApplicableLimits(eq(LimitType.SINGLE_TRANSACTION), eq(LimitScope.GLOBAL), any(), any()))
                .thenReturn(List.of(singleLimit));

        assertThatThrownBy(() -> limitService.validateAndRecordUsage(
                account, LimitType.SINGLE_TRANSACTION, new BigDecimal("150000"), "ATM"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("single transaction limit");
    }

    @Test
    @DisplayName("Customer override takes precedence over global limit")
    void customerOverridePrecedence() {
        TransactionLimit customerOverride = TransactionLimit.builder().id(3L)
                .limitType(LimitType.DAILY_DEBIT).scope(LimitScope.CUSTOMER).scopeRefId(1L)
                .maxAmount(new BigDecimal("1000000")).maxCount(200)
                .currencyCode("USD").isActive(true).effectiveFrom(LocalDate.now()).build();

        TransactionLimitUsage usage = TransactionLimitUsage.builder()
                .accountId(1L).limitType(LimitType.DAILY_DEBIT)
                .usageDate(LocalDate.now()).totalAmount(new BigDecimal("600000")).totalCount(80)
                .currencyCode("USD").build();

        when(limitRepository.findApplicableLimits(eq(LimitType.DAILY_DEBIT), eq(LimitScope.CUSTOMER), any(), any()))
                .thenReturn(List.of(customerOverride));
        when(usageRepository.findByAccountIdAndLimitTypeAndUsageDate(1L, LimitType.DAILY_DEBIT, LocalDate.now()))
                .thenReturn(Optional.of(usage));
        when(usageRepository.save(any())).thenReturn(usage);

        // 600000 + 100000 = 700000 < 1000000 customer override — should pass even though > 500000 global
        limitService.validateAndRecordUsage(account, LimitType.DAILY_DEBIT, new BigDecimal("100000"), "BRANCH");
        verify(usageRepository).save(any());
    }
}
