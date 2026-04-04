package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PoolWeightageServiceTest {

    @Mock private PoolWeightageRecordRepository weightageRecordRepository;
    @Mock private PoolProfitAllocationRepository allocationRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;

    @InjectMocks private PoolWeightageService service;

    private static final Long POOL_ID = 1L;
    private LocalDate periodStart;
    private LocalDate periodEnd;

    @BeforeEach
    void setUp() {
        periodStart = LocalDate.of(2026, 3, 1);
        periodEnd = LocalDate.of(2026, 3, 31);
    }

    private Account buildAccount(Long id, String accountNumber, BigDecimal balance) {
        return Account.builder()
                .id(id)
                .accountNumber(accountNumber)
                .accountName("Test Account " + id)
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(balance)
                .availableBalance(balance)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();
    }

    private MudarabahAccount buildMudarabahAccount(Long id, Long accountId,
                                                     BigDecimal psrCustomer, BigDecimal psrBank) {
        return MudarabahAccount.builder()
                .id(id)
                .contractReference("MDR-SAV-2026-" + String.format("%06d", id))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.SAVINGS)
                .profitSharingRatioCustomer(psrCustomer)
                .profitSharingRatioBank(psrBank)
                .investmentPoolId(POOL_ID)
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .lossDisclosureAccepted(true)
                .contractVersion(1)
                .psrAgreedVersion(1)
                .build();
    }

    // -----------------------------------------------------------------------
    // Daily product / weightage calculation tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Deposit on day 15 of 30-day period gives approximately 50% weightage")
    void dailyProduct_depositOnDay15_halfWeightage() {
        // Account 1: 10000 SAR balance all 30 days -> DP = 10000 * 30 = 300000
        // Account 2: 10000 SAR balance from day 15 -> DP = 10000 * 15 = 150000
        // Total pool DP = 450000
        // Account 1 weight = 300000 / 450000 * 100 = 66.67%
        // Account 2 weight = 150000 / 450000 * 100 = 33.33% (approximately half of account 1)

        BigDecimal account2DP = new BigDecimal("150000");
        BigDecimal poolDP = new BigDecimal("450000");

        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 2L, periodStart, periodEnd))
                .thenReturn(account2DP);
        when(weightageRecordRepository.sumPoolDailyProduct(POOL_ID, periodStart, periodEnd))
                .thenReturn(poolDP);

        BigDecimal weight2 = service.calculateWeightage(POOL_ID, 2L, periodStart, periodEnd);

        // Account 2 deposited at day 15, should have ~33.33% (half of 66.67%)
        assertThat(weight2).isGreaterThan(BigDecimal.ZERO);
        assertThat(weight2).isLessThan(new BigDecimal("50")); // Less than 50%
        // Exact: 150000/450000 * 100 = 33.33333333
        assertThat(weight2).isEqualByComparingTo(
                account2DP.multiply(new BigDecimal("100"))
                        .divide(poolDP, 8, RoundingMode.HALF_UP));
    }

    @Test
    @DisplayName("Two participants with equal balance all period get equal weightage")
    void twoParticipants_equalBalance_equalWeightage() {
        BigDecimal equalDP = new BigDecimal("300000"); // 10000 * 30 days
        BigDecimal poolDP = new BigDecimal("600000");

        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 1L, periodStart, periodEnd))
                .thenReturn(equalDP);
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 2L, periodStart, periodEnd))
                .thenReturn(equalDP);
        when(weightageRecordRepository.sumPoolDailyProduct(POOL_ID, periodStart, periodEnd))
                .thenReturn(poolDP);

        BigDecimal weight1 = service.calculateWeightage(POOL_ID, 1L, periodStart, periodEnd);
        BigDecimal weight2 = service.calculateWeightage(POOL_ID, 2L, periodStart, periodEnd);

        // Both should be exactly 50%
        assertThat(weight1).isEqualByComparingTo("50.00000000");
        assertThat(weight2).isEqualByComparingTo("50.00000000");
    }

    @Test
    @DisplayName("First participant full period, second deposits day 15 gives correct weights")
    void twoParticipants_oneDepositsDay15_correctWeights() {
        // Account 1: 10000 all 30 days -> DP = 300000
        // Account 2: 10000 from day 15 -> DP = 150000
        BigDecimal dp1 = new BigDecimal("300000");
        BigDecimal dp2 = new BigDecimal("150000");
        BigDecimal poolDP = dp1.add(dp2); // 450000

        when(weightageRecordRepository.sumPoolDailyProduct(POOL_ID, periodStart, periodEnd))
                .thenReturn(poolDP);
        when(weightageRecordRepository.findActiveAccountIds(POOL_ID, periodStart, periodEnd))
                .thenReturn(List.of(1L, 2L));
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 1L, periodStart, periodEnd))
                .thenReturn(dp1);
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 2L, periodStart, periodEnd))
                .thenReturn(dp2);

        var weightages = service.calculateAllWeightages(POOL_ID, periodStart, periodEnd);

        assertThat(weightages).hasSize(2);
        // Account 1: 300000/450000 * 100 = 66.66666667
        assertThat(weightages.get(1L)).isEqualByComparingTo(
                dp1.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP));
        // Account 2: 150000/450000 * 100 = 33.33333333
        assertThat(weightages.get(2L)).isEqualByComparingTo(
                dp2.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP));

        // First participant should have roughly 2x the weight of the second
        assertThat(weightages.get(1L).doubleValue())
                .isCloseTo(weightages.get(2L).doubleValue() * 2, org.assertj.core.data.Offset.offset(0.01));
    }

    // -----------------------------------------------------------------------
    // Profit allocation tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Profit allocation respects individual PSR per account")
    void profitAllocation_respectsIndividualPsr() {
        BigDecimal poolGrossProfit = new BigDecimal("10000.00");

        // Account 1: PSR 70:30, weight 50%
        // Account 2: PSR 60:40, weight 50%
        BigDecimal dp = new BigDecimal("150000"); // Each account
        BigDecimal poolDP = new BigDecimal("300000");

        MudarabahAccount ma1 = buildMudarabahAccount(10L, 1L,
                new BigDecimal("70.0000"), new BigDecimal("30.0000"));
        MudarabahAccount ma2 = buildMudarabahAccount(20L, 2L,
                new BigDecimal("60.0000"), new BigDecimal("40.0000"));

        when(weightageRecordRepository.sumPoolDailyProduct(POOL_ID, periodStart, periodEnd))
                .thenReturn(poolDP);
        when(weightageRecordRepository.findActiveAccountIds(POOL_ID, periodStart, periodEnd))
                .thenReturn(List.of(1L, 2L));
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 1L, periodStart, periodEnd))
                .thenReturn(dp);
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 2L, periodStart, periodEnd))
                .thenReturn(dp);
        when(mudarabahAccountRepository.findByAccountId(1L)).thenReturn(Optional.of(ma1));
        when(mudarabahAccountRepository.findByAccountId(2L)).thenReturn(Optional.of(ma2));
        when(allocationRepository.save(any(PoolProfitAllocation.class)))
                .thenAnswer(invocation -> {
                    PoolProfitAllocation a = invocation.getArgument(0);
                    a.setId(System.nanoTime());
                    return a;
                });
        when(accountRepository.findById(anyLong())).thenReturn(Optional.of(
                buildAccount(1L, "MDR001", new BigDecimal("10000"))));

        var allocations = service.allocateProfit(POOL_ID, poolGrossProfit, periodStart, periodEnd);

        assertThat(allocations).hasSize(2);

        // Both have 50% weight, each gets gross share of 5000
        // Account 1: customer gets 5000 * 70% = 3500
        // Account 2: customer gets 5000 * 60% = 3000
        var alloc1 = allocations.stream()
                .filter(a -> a.getCustomerPsr().compareTo(new BigDecimal("70.0000")) == 0)
                .findFirst().orElseThrow();
        var alloc2 = allocations.stream()
                .filter(a -> a.getCustomerPsr().compareTo(new BigDecimal("60.0000")) == 0)
                .findFirst().orElseThrow();

        assertThat(alloc1.getCustomerProfitShare()).isEqualByComparingTo("3500.0000");
        assertThat(alloc2.getCustomerProfitShare()).isEqualByComparingTo("3000.0000");
    }

    @Test
    @DisplayName("Sum of all profit allocations equals pool gross profit (conservation check)")
    void allocateProfit_sumEqualsGrossProfit() {
        BigDecimal poolGrossProfit = new BigDecimal("25000.00");

        BigDecimal dp1 = new BigDecimal("200000");
        BigDecimal dp2 = new BigDecimal("100000");
        BigDecimal poolDP = dp1.add(dp2); // 300000

        MudarabahAccount ma1 = buildMudarabahAccount(10L, 1L,
                new BigDecimal("70.0000"), new BigDecimal("30.0000"));
        MudarabahAccount ma2 = buildMudarabahAccount(20L, 2L,
                new BigDecimal("70.0000"), new BigDecimal("30.0000"));

        when(weightageRecordRepository.sumPoolDailyProduct(POOL_ID, periodStart, periodEnd))
                .thenReturn(poolDP);
        when(weightageRecordRepository.findActiveAccountIds(POOL_ID, periodStart, periodEnd))
                .thenReturn(List.of(1L, 2L));
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 1L, periodStart, periodEnd))
                .thenReturn(dp1);
        when(weightageRecordRepository.sumDailyProduct(POOL_ID, 2L, periodStart, periodEnd))
                .thenReturn(dp2);
        when(mudarabahAccountRepository.findByAccountId(1L)).thenReturn(Optional.of(ma1));
        when(mudarabahAccountRepository.findByAccountId(2L)).thenReturn(Optional.of(ma2));
        when(allocationRepository.save(any(PoolProfitAllocation.class)))
                .thenAnswer(invocation -> {
                    PoolProfitAllocation a = invocation.getArgument(0);
                    a.setId(System.nanoTime());
                    return a;
                });
        when(accountRepository.findById(anyLong())).thenReturn(Optional.of(
                buildAccount(1L, "MDR001", new BigDecimal("10000"))));

        var allocations = service.allocateProfit(POOL_ID, poolGrossProfit, periodStart, periodEnd);

        // Sum of (customer profit + bank profit) for all accounts should equal gross profit
        BigDecimal totalCustomer = allocations.stream()
                .map(a -> new BigDecimal(a.getCustomerProfitShare().toString()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalBank = allocations.stream()
                .map(a -> new BigDecimal(a.getBankProfitShare().toString()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDistributed = totalCustomer.add(totalBank);

        // Due to rounding, allow a small tolerance
        assertThat(totalDistributed.subtract(poolGrossProfit).abs())
                .isLessThan(new BigDecimal("0.01"));
    }
}
