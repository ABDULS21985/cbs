package com.cbs.profitdistribution.service;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PeriodType;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolProfitCalculationRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfitAllocationServiceTest {

    @Mock
    private PoolProfitCalculationRepository calculationRepo;

    @Mock
    private PoolProfitAllocationRepository allocationRepo;

    @Mock
    private MudarabahAccountRepository mudarabahAccountRepo;

    @Mock
    private PoolWeightageService weightageService;

    @Mock
    private PoolWeightageRecordRepository weightageRecordRepo;

    @Mock
    private InvestmentPoolRepository poolRepo;

    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private ProfitAllocationService service;

    private final AtomicLong allocationIdSequence = new AtomicLong(100L);
    private PoolProfitCalculation calculation;
    private InvestmentPool pool;
    private MudarabahAccount accountA;
    private MudarabahAccount accountB;

    @BeforeEach
    void setUp() {
        calculation = PoolProfitCalculation.builder()
                .id(10L)
                .poolId(1L)
                .calculationRef("PPC-POOL-001")
                .periodFrom(LocalDate.of(2026, 1, 1))
                .periodTo(LocalDate.of(2026, 1, 31))
                .periodType(PeriodType.MONTHLY)
                .depositorPool(new BigDecimal("100000.0000"))
                .netDistributableProfit(new BigDecimal("150000.0000"))
                .calculationStatus(CalculationStatus.APPROVED)
                .isLoss(false)
                .build();

        pool = InvestmentPool.builder()
                .id(1L)
                .poolCode("POOL-001")
                .currencyCode("SAR")
                .build();

        accountA = mudarabahAccount(11L, 101L, "MDA-001", new BigDecimal("70.0000"), new BigDecimal("30.0000"));
        accountB = mudarabahAccount(12L, 102L, "MDA-002", new BigDecimal("60.0000"), new BigDecimal("40.0000"));

        when(calculationRepo.findById(10L)).thenReturn(Optional.of(calculation));
        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(mudarabahAccountRepo.findByAccountId(101L)).thenReturn(Optional.of(accountA));
        when(mudarabahAccountRepo.findByAccountId(102L)).thenReturn(Optional.of(accountB));
        when(weightageRecordRepo.sumDailyProduct(1L, 101L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(new BigDecimal("1550000.0000"));
        when(weightageRecordRepo.sumDailyProduct(1L, 102L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(new BigDecimal("1550000.0000"));
        when(weightageRecordRepo.sumPoolDailyProduct(1L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(new BigDecimal("3100000.0000"));
        when(allocationRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(List.of());
        when(calculationRepo.save(any(PoolProfitCalculation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(allocationRepo.save(any(PoolProfitAllocation.class))).thenAnswer(invocation -> {
            PoolProfitAllocation allocation = invocation.getArgument(0);
            if (allocation.getId() == null) {
                allocation.setId(allocationIdSequence.incrementAndGet());
            }
            if (allocation.getCreatedAt() == null) {
                allocation.setCreatedAt(Instant.now());
            }
            return allocation;
        });
    }

    @Test
    void allocateProfit_usesReserveAdjustedAmountAndAppliesIndividualPsr() {
        Map<Long, BigDecimal> weightages = new LinkedHashMap<>();
        weightages.put(101L, new BigDecimal("50.00000000"));
        weightages.put(102L, new BigDecimal("50.00000000"));

        when(weightageService.calculateAllWeightages(1L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(weightages);

        ProfitAllocationBatch batch = service.allocateProfit(
                1L,
                10L,
                new BigDecimal("97000.0000"),
                new BigDecimal("5000.0000"),
                new BigDecimal("-2000.0000"));

        assertEquals(0, new BigDecimal("97000.0000").compareTo(batch.getDepositorPoolAfterReserves()));
        assertEquals(2, batch.getParticipantCount());
        assertEquals(0, new BigDecimal("63050.0000").compareTo(batch.getTotalCustomerProfit()));
        assertEquals(0, new BigDecimal("33950.0000").compareTo(batch.getTotalBankProfit()));
        assertEquals(0, new BigDecimal("-2500.0000").compareTo(batch.getAllocations().get(0).getPerAdjustment()));
        assertEquals(0, new BigDecimal("-1000.0000").compareTo(batch.getAllocations().get(0).getIrrDeduction()));
        assertEquals(0, new BigDecimal("48500.0000").compareTo(batch.getAllocations().get(0).getNetShareAfterReserves()));
    }

    @Test
    void allocateProfit_conservationCheckBalancesToExpectedAmount() {
        Map<Long, BigDecimal> weightages = new LinkedHashMap<>();
        weightages.put(101L, new BigDecimal("50.00000000"));
        weightages.put(102L, new BigDecimal("50.00000000"));

        when(weightageService.calculateAllWeightages(1L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(weightages);

        ProfitAllocationBatch batch = service.allocateProfit(1L, 10L);

        assertEquals("PASSED", batch.getConservationCheck().getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(batch.getConservationCheck().getDifference()));
    }

    @Test
    void approveAllocations_sameAllocatorRejected() {
        PoolProfitAllocation allocation = PoolProfitAllocation.builder()
                .id(900L)
                .poolId(1L)
                .accountId(101L)
                .periodFrom(calculation.getPeriodFrom())
                .periodTo(calculation.getPeriodTo())
                .distributionStatus(ProfitAllocationStatus.CALCULATED)
                .createdBy("allocator-user")
                .build();

        when(allocationRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, calculation.getPeriodFrom(), calculation.getPeriodTo()))
                .thenReturn(List.of(allocation));

        assertThrows(BusinessException.class,
                () -> service.approveAllocations(1L, calculation.getPeriodFrom(), calculation.getPeriodTo(), "allocator-user"));
    }

    private MudarabahAccount mudarabahAccount(Long id,
                                              Long accountId,
                                              String accountNumber,
                                              BigDecimal customerPsr,
                                              BigDecimal bankPsr) {
        Account account = Account.builder()
                .id(accountId)
                .accountNumber(accountNumber)
                .bookBalance(new BigDecimal("50000.00"))
                .build();
        return MudarabahAccount.builder()
                .id(id)
                .account(account)
                .contractReference("CONTRACT-" + id)
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.SAVINGS)
                .profitSharingRatioCustomer(customerPsr)
                .profitSharingRatioBank(bankPsr)
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .tenantId(1L)
                .build();
    }
}
