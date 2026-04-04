package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.InitiateDistributionRunRequest;
import com.cbs.profitdistribution.dto.PoolProfitCalculationResponse;
import com.cbs.profitdistribution.dto.ProfitDistributionRunResponse;
import com.cbs.profitdistribution.entity.DistributionRunStatus;
import com.cbs.profitdistribution.entity.DistributionRunStepLog;
import com.cbs.profitdistribution.entity.ProfitDistributionRun;
import com.cbs.profitdistribution.repository.DistributionRunStepLogRepository;
import com.cbs.profitdistribution.repository.ProfitDistributionRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfitDistributionRunServiceTest {

    @Mock
    private ProfitDistributionRunRepository runRepo;

    @Mock
    private DistributionRunStepLogRepository stepLogRepo;

    @Mock
    private ProfitCalculationService calculationService;

    @Mock
    private ProfitAllocationService allocationService;

    @Mock
    private DistributionReserveService reserveService;

    @Mock
    private PoolWeightageService weightageService;

    @Mock
    private PoolWeightageRecordRepository weightageRecordRepository;

    @Mock
    private PoolProfitAllocationRepository allocationRepository;

    @Mock
    private InvestmentPoolRepository poolRepo;

    @Mock
    private PoolAssetManagementService poolAssetManagementService;

    @Mock
    private TransactionJournalRepository transactionJournalRepository;

    @Mock
    private AccountPostingService accountPostingService;

    @Mock
    private GeneralLedgerService generalLedgerService;

    @Mock
    private JournalEntryRepository journalEntryRepository;

    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private ProfitDistributionRunService service;

    private InvestmentPool pool;
    private LocalDate periodFrom;
    private LocalDate periodTo;

    @BeforeEach
    void setUp() {
        pool = InvestmentPool.builder()
                .id(1L)
                .poolCode("POOL-001")
                .name("General Investment Pool")
                .poolType(PoolType.UNRESTRICTED)
                .currencyCode("SAR")
                .totalPoolBalance(new BigDecimal("5000000"))
                .profitSharingRatioBank(new BigDecimal("40"))
                .profitSharingRatioInvestors(new BigDecimal("60"))
                .status(PoolStatus.ACTIVE)
                .build();

        periodFrom = LocalDate.of(2026, 1, 1);
        periodTo = LocalDate.of(2026, 1, 31);
    }

    // ── Initiation Tests ───────────────────────────────────────────────

    @Test
    void initiateRun_success() {
        InitiateDistributionRunRequest request = InitiateDistributionRunRequest.builder()
                .poolId(1L)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .periodType("MONTHLY")
                .build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(runRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(Optional.empty());
        when(weightageRecordRepository.countDistinctRecordDates(1L, periodFrom, periodTo)).thenReturn(31L);
        when(actorProvider.getCurrentActor()).thenReturn("initiator-user");
        when(runRepo.save(any(ProfitDistributionRun.class))).thenAnswer(inv -> {
            ProfitDistributionRun run = inv.getArgument(0);
            run.setId(100L);
            return run;
        });
        when(stepLogRepo.save(any(DistributionRunStepLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProfitDistributionRunResponse response = service.initiateRun(request);

        assertNotNull(response);
        assertEquals(DistributionRunStatus.INITIATED, response.getStatus());
        assertEquals(1L, response.getPoolId());
        assertEquals("POOL-001", response.getPoolCode());
        verify(runRepo).save(any(ProfitDistributionRun.class));
    }

    @Test
    void initiateRun_duplicatePoolPeriod_rejected() {
        InitiateDistributionRunRequest request = InitiateDistributionRunRequest.builder()
                .poolId(1L)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .periodType("MONTHLY")
                .build();

        ProfitDistributionRun existingRun = ProfitDistributionRun.builder()
                .id(50L)
                .runRef("PDR-POOL001-20260101-0001")
                .poolId(1L)
                .poolCode("POOL-001")
                .status(DistributionRunStatus.INITIATED)
                .build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(runRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(Optional.of(existingRun));
        when(weightageRecordRepository.countDistinctRecordDates(1L, periodFrom, periodTo)).thenReturn(31L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.initiateRun(request));

        assertTrue(ex.getMessage().contains("Distribution run already exists"));
        verify(runRepo, never()).save(any());
    }

    // ── Calculation Step Test ──────────────────────────────────────────

    @Test
    void executeCalculation_movesToCalculated() {
        ProfitDistributionRun run = ProfitDistributionRun.builder()
                .id(100L)
                .runRef("PDR-POOL001-20260101-0001")
                .poolId(1L)
                .poolCode("POOL-001")
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .status(DistributionRunStatus.INITIATED)
                .build();

        PoolProfitCalculationResponse calcResponse = PoolProfitCalculationResponse.builder()
                .id(200L)
                .poolId(1L)
                .grossIncome(new BigDecimal("100000"))
                .charityIncome(new BigDecimal("10000"))
                .totalExpenses(new BigDecimal("20000"))
                .netDistributableProfit(new BigDecimal("70000"))
                .bankMudaribShare(new BigDecimal("28000"))
                .depositorPool(new BigDecimal("42000"))
                .isLoss(false)
                .build();

        when(runRepo.findById(100L)).thenReturn(Optional.of(run));
        when(calculationService.calculatePoolProfit(1L, periodFrom, periodTo))
                .thenReturn(calcResponse);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(runRepo.save(any(ProfitDistributionRun.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stepLogRepo.save(any(DistributionRunStepLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(100L))
                .thenReturn(Collections.emptyList());

        ProfitDistributionRunResponse response = service.executeCalculation(100L);

        assertEquals(DistributionRunStatus.CALCULATED, response.getStatus());
        assertEquals(200L, response.getProfitCalculationId());
        assertEquals(0, new BigDecimal("70000").compareTo(response.getNetDistributableProfit()));
        assertFalse(response.isLoss());
    }

    // ── Four-Eyes Enforcement Test ─────────────────────────────────────

    @Test
    void approveAllocation_fourEyes_enforced() {
        ProfitDistributionRun run = ProfitDistributionRun.builder()
                .id(100L)
                .runRef("PDR-POOL001-20260101-0001")
                .poolId(1L)
                .poolCode("POOL-001")
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .status(DistributionRunStatus.ALLOCATED)
                .calculatedBy("user-A")
                .calculationApprovedBy("user-B")
                .build();

        when(runRepo.findById(100L)).thenReturn(Optional.of(run));

        // Same person as calculatedBy tries to approve allocation
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.approveAllocation(100L, "user-A"));

        assertTrue(ex.getMessage().contains("Four-eyes principle"));
        verify(allocationService, never()).approveAllocations(any(), any(), any(), any());
    }

    // ── Status Transition Test ─────────────────────────────────────────

    @Test
    void statusTransition_wrongOrder_rejected() {
        // Run is in INITIATED status, try to allocate (requires RESERVES_APPLIED)
        ProfitDistributionRun run = ProfitDistributionRun.builder()
                .id(100L)
                .runRef("PDR-POOL001-20260101-0001")
                .poolId(1L)
                .poolCode("POOL-001")
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .status(DistributionRunStatus.INITIATED)
                .build();

        when(runRepo.findById(100L)).thenReturn(Optional.of(run));

        // Try to approve allocation from INITIATED (should require ALLOCATED status)
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.approveAllocation(100L, "approver-user"));

        assertTrue(ex.getMessage().contains("Expected status"));
    }
}
