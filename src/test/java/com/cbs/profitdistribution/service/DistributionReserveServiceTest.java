package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.IrrTransactionRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.PerTransactionRepository;
import com.cbs.gl.islamic.service.IrrService;
import com.cbs.gl.islamic.service.PerService;
import com.cbs.profitdistribution.dto.ReserveExecutionResult;
import com.cbs.profitdistribution.dto.ReserveExecutionSummary;
import com.cbs.profitdistribution.entity.DistributionReserveTransaction;
import com.cbs.profitdistribution.repository.DistributionReserveTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistributionReserveServiceTest {

    @Mock
    private PerService perService;

    @Mock
    private IrrService irrService;

    @Mock
    private DistributionReserveTransactionRepository reserveTransactionRepo;

    @Mock
    private PerTransactionRepository perTransactionRepository;

    @Mock
    private IrrTransactionRepository irrTransactionRepository;

    @Mock
    private InvestmentPoolRepository poolRepo;

    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private DistributionReserveService service;

    private Long poolId;
    private Long runId;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private InvestmentPool pool;

    @BeforeEach
    void setUp() {
        poolId = 1L;
        runId = 10L;
        periodFrom = LocalDate.of(2026, 1, 1);
        periodTo = LocalDate.of(2026, 1, 31);
        pool = InvestmentPool.builder().id(poolId).tenantId(1L).poolCode("POOL-001").build();
        lenient().when(poolRepo.findById(poolId)).thenReturn(java.util.Optional.of(pool));
        lenient().when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId)).thenReturn(java.util.Optional.empty());
        lenient().when(irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId)).thenReturn(java.util.Optional.empty());
    }

    // ── PER Tests ──────────────────────────────────────────────────────

    @Test
    void executePer_retention_reducesDepositorPool() {
        BigDecimal depositorPool = new BigDecimal("100000");

        PerCalculationResult perResult = PerCalculationResult.builder()
                .adjustmentType("RETENTION")
                .adjustmentAmount(new BigDecimal("5000"))
                .grossProfit(depositorPool)
                .distributedProfit(new BigDecimal("95000"))
                .actualProfitRate(new BigDecimal("5.5"))
                .smoothedProfitRate(new BigDecimal("5.0"))
                .perBalanceBefore(new BigDecimal("50000"))
                .perBalanceAfter(new BigDecimal("55000"))
                .remainingCapacity(new BigDecimal("45000"))
                .build();

        when(perService.calculatePerAdjustment(poolId, depositorPool, periodFrom, periodTo))
                .thenReturn(perResult);
        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(reserveTransactionRepo.save(any(DistributionReserveTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReserveExecutionResult result = service.executePer(poolId, depositorPool, periodFrom, periodTo, runId);

        assertEquals("PER", result.getReserveType());
        assertEquals("RETENTION", result.getTransactionType());
        assertEquals(0, new BigDecimal("5000").compareTo(result.getAdjustmentAmount()));
        assertEquals(0, new BigDecimal("95000").compareTo(result.getAmountAfterReserve()));
        verify(perService).retainToPer(eq(poolId), eq(new BigDecimal("5000")),
                eq(periodFrom), eq(periodTo), eq(depositorPool),
                eq(new BigDecimal("5.5")), eq(new BigDecimal("5.0")));
    }

    @Test
    void executePer_release_increasesDepositorPool() {
        BigDecimal depositorPool = new BigDecimal("100000");

        PerCalculationResult perResult = PerCalculationResult.builder()
                .adjustmentType("RELEASE")
                .adjustmentAmount(new BigDecimal("3000"))
                .grossProfit(depositorPool)
                .distributedProfit(new BigDecimal("103000"))
                .actualProfitRate(new BigDecimal("4.0"))
                .smoothedProfitRate(new BigDecimal("5.0"))
                .perBalanceBefore(new BigDecimal("50000"))
                .perBalanceAfter(new BigDecimal("47000"))
                .remainingCapacity(new BigDecimal("53000"))
                .build();

        when(perService.calculatePerAdjustment(poolId, depositorPool, periodFrom, periodTo))
                .thenReturn(perResult);
        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(reserveTransactionRepo.save(any(DistributionReserveTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReserveExecutionResult result = service.executePer(poolId, depositorPool, periodFrom, periodTo, runId);

        assertEquals("RELEASE", result.getTransactionType());
        assertEquals(0, new BigDecimal("103000").compareTo(result.getAmountAfterReserve()));
        verify(perService).releaseFromPer(eq(poolId), eq(new BigDecimal("3000")),
                eq(periodFrom), eq(periodTo), eq(depositorPool),
                eq(new BigDecimal("4.0")), eq(new BigDecimal("5.0")),
                eq("system-user"));
    }

    // ── IRR Tests ──────────────────────────────────────────────────────

    @Test
    void executeIrr_retention_afterPer() {
        // Post-PER amount is 95k (profit scenario, not a loss)
        BigDecimal depositorPoolAfterPer = new BigDecimal("95000");

        IrrRetentionResult irrResult = IrrRetentionResult.builder()
                .adjustmentAmount(new BigDecimal("3000"))
                .distributableProfitBeforeRetention(depositorPoolAfterPer)
                .distributableProfitAfterRetention(new BigDecimal("92000"))
                .irrBalanceBefore(new BigDecimal("20000"))
                .irrBalanceAfter(new BigDecimal("23000"))
                .remainingCapacity(new BigDecimal("77000"))
                .maximumReached(false)
                .build();

        when(irrService.getIrrBalance(poolId)).thenReturn(new BigDecimal("20000"));
        when(irrService.calculateIrrRetention(poolId, depositorPoolAfterPer, periodFrom, periodTo))
                .thenReturn(irrResult);
        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(reserveTransactionRepo.save(any(DistributionReserveTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReserveExecutionResult result = service.executeIrr(
                poolId, depositorPoolAfterPer, false, periodFrom, periodTo, runId);

        assertEquals("IRR", result.getReserveType());
        assertEquals("RETENTION", result.getTransactionType());
        assertEquals(0, new BigDecimal("3000").compareTo(result.getAdjustmentAmount()));
        assertEquals(0, new BigDecimal("92000").compareTo(result.getAmountAfterReserve()));
        // Verify IRR retention was called with the post-PER amount, not the original
        verify(irrService).calculateIrrRetention(poolId, depositorPoolAfterPer, periodFrom, periodTo);
        verify(irrService).retainToIrr(poolId, new BigDecimal("3000"), periodFrom, periodTo);
    }

    @Test
    void executeIrr_lossAbsorption_irrReleased() {
        // Loss scenario: depositorPool after PER is -50k, IRR absorbs 20k
        BigDecimal depositorPoolAfterPer = new BigDecimal("-50000");

        IrrReleaseResult releaseResult = IrrReleaseResult.builder()
                .triggered(true)
                .lossAmount(new BigDecimal("50000"))
                .absorbed(new BigDecimal("20000"))
                .remainingLoss(new BigDecimal("30000"))
                .irrBalanceBefore(new BigDecimal("20000"))
                .irrBalanceAfter(BigDecimal.ZERO)
                .build();

        when(irrService.getIrrBalance(poolId)).thenReturn(new BigDecimal("20000"));
        when(irrService.calculateIrrRelease(poolId, new BigDecimal("50000")))
                .thenReturn(releaseResult);
        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(reserveTransactionRepo.save(any(DistributionReserveTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReserveExecutionResult result = service.executeIrr(
                poolId, depositorPoolAfterPer, true, periodFrom, periodTo, runId);

        assertEquals("RELEASE", result.getTransactionType());
        assertEquals(0, new BigDecimal("20000").compareTo(result.getAdjustmentAmount()));
        // After absorption: -50000 + 20000 = -30000
        assertEquals(0, new BigDecimal("-30000").compareTo(result.getAmountAfterReserve()));
        verify(irrService).releaseIrrForLossAbsorption(
                eq(poolId), eq(new BigDecimal("20000")), eq("Pool loss absorption"), eq("system-user"));
    }

    @Test
    void executeIrr_noIrrBalance_fullLossPassthrough() {
        // Loss scenario with no IRR balance available
        BigDecimal depositorPoolAfterPer = new BigDecimal("-50000");

        IrrReleaseResult releaseResult = IrrReleaseResult.builder()
                .triggered(false)
                .lossAmount(new BigDecimal("50000"))
                .absorbed(BigDecimal.ZERO)
                .remainingLoss(new BigDecimal("50000"))
                .irrBalanceBefore(BigDecimal.ZERO)
                .irrBalanceAfter(BigDecimal.ZERO)
                .build();

        when(irrService.getIrrBalance(poolId)).thenReturn(BigDecimal.ZERO);
        when(irrService.calculateIrrRelease(poolId, new BigDecimal("50000")))
                .thenReturn(releaseResult);

        ReserveExecutionResult result = service.executeIrr(
                poolId, depositorPoolAfterPer, true, periodFrom, periodTo, runId);

        assertEquals("NONE", result.getTransactionType());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getAdjustmentAmount()));
        // Full loss passes through unchanged
        assertEquals(0, new BigDecimal("-50000").compareTo(result.getAmountAfterReserve()));
        verify(irrService, never()).releaseIrrForLossAbsorption(any(), any(), any(), any());
    }

    // ── Combined Reserve Execution Test ────────────────────────────────

    @Test
    void executeReserves_combinedSummary_correctFinalAmount() {
        // PER retains 5k from 100k -> 95k; IRR retains 3k from 95k -> 92k
        BigDecimal depositorPool = new BigDecimal("100000");

        // PER calculation result
        PerCalculationResult perCalcResult = PerCalculationResult.builder()
                .adjustmentType("RETENTION")
                .adjustmentAmount(new BigDecimal("5000"))
                .grossProfit(depositorPool)
                .distributedProfit(new BigDecimal("95000"))
                .actualProfitRate(new BigDecimal("5.5"))
                .smoothedProfitRate(new BigDecimal("5.0"))
                .perBalanceBefore(new BigDecimal("50000"))
                .perBalanceAfter(new BigDecimal("55000"))
                .remainingCapacity(new BigDecimal("45000"))
                .build();

        when(perService.calculatePerAdjustment(poolId, depositorPool, periodFrom, periodTo))
                .thenReturn(perCalcResult);

        // IRR calculation result (called with post-PER amount 95k)
        IrrRetentionResult irrRetResult = IrrRetentionResult.builder()
                .adjustmentAmount(new BigDecimal("3000"))
                .distributableProfitBeforeRetention(new BigDecimal("95000"))
                .distributableProfitAfterRetention(new BigDecimal("92000"))
                .irrBalanceBefore(new BigDecimal("20000"))
                .irrBalanceAfter(new BigDecimal("23000"))
                .remainingCapacity(new BigDecimal("77000"))
                .maximumReached(false)
                .build();

        when(irrService.getIrrBalance(poolId)).thenReturn(new BigDecimal("20000"));
        when(irrService.calculateIrrRetention(poolId, new BigDecimal("95000"), periodFrom, periodTo))
                .thenReturn(irrRetResult);

        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(reserveTransactionRepo.save(any(DistributionReserveTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReserveExecutionSummary summary = service.executeReserves(
                poolId, depositorPool, false, periodFrom, periodTo, runId);

        assertEquals(0, new BigDecimal("100000").compareTo(summary.getOriginalDepositorPool()));
        assertEquals(0, new BigDecimal("95000").compareTo(summary.getAfterPer()));
        assertEquals(0, new BigDecimal("92000").compareTo(summary.getAfterIrr()));
        assertEquals(0, new BigDecimal("92000").compareTo(summary.getFinalDistributableAmount()));
        // Total impact: 100k - 92k = 8k
        assertEquals(0, new BigDecimal("8000").compareTo(summary.getTotalReserveImpact()));
    }
}
