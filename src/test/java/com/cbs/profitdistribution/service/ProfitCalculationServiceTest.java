package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.profitdistribution.dto.PoolProfitCalculationResponse;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.ExpenseType;
import com.cbs.profitdistribution.entity.IncomeType;
import com.cbs.profitdistribution.entity.PoolExpenseRecord;
import com.cbs.profitdistribution.entity.PoolIncomeRecord;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolExpenseRecordRepository;
import com.cbs.profitdistribution.repository.PoolIncomeRecordRepository;
import com.cbs.profitdistribution.repository.PoolProfitCalculationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfitCalculationServiceTest {

    @Mock
    private PoolProfitCalculationRepository calculationRepo;

    @Mock
    private PoolIncomeRecordRepository incomeRepo;

    @Mock
    private PoolExpenseRecordRepository expenseRepo;

    @Mock
    private InvestmentPoolRepository poolRepo;

    @Mock
    private PoolWeightageRecordRepository weightageRepo;

    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private ProfitCalculationService service;

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

    // ── Calculation Tests ──────────────────────────────────────────────

    @Test
    void calculatePoolProfit_excludesCharityFromDistributable() {
        // Total income = 100k, charity = 10k -> distributable = 90k
        PoolIncomeRecord regular = PoolIncomeRecord.builder()
                .id(1L).poolId(1L).incomeType(IncomeType.MURABAHA_PROFIT)
                .amount(new BigDecimal("90000")).isCharityIncome(false)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolIncomeRecord charity = PoolIncomeRecord.builder()
                .id(2L).poolId(1L).incomeType(IncomeType.LATE_PAYMENT_CHARITY)
                .amount(new BigDecimal("10000")).isCharityIncome(true)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(regular, charity));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(Collections.emptyList());
        when(weightageRepo.sumPoolDailyProduct(eq(1L), any(), any()))
                .thenReturn(null);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(calculationRepo.save(any())).thenAnswer(inv -> {
            PoolProfitCalculation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        PoolProfitCalculationResponse response = service.calculatePoolProfit(1L, periodFrom, periodTo);

        assertEquals(0, new BigDecimal("90000").compareTo(response.getDistributableGrossIncome()));
    }

    @Test
    void calculatePoolProfit_ndpIsIncomeMinusExpenses() {
        // Distributable 90k (after excluding 10k charity), expenses 20k -> NDP = 70k
        PoolIncomeRecord regular = PoolIncomeRecord.builder()
                .id(1L).poolId(1L).incomeType(IncomeType.MURABAHA_PROFIT)
                .amount(new BigDecimal("90000")).isCharityIncome(false)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolIncomeRecord charity = PoolIncomeRecord.builder()
                .id(2L).poolId(1L).incomeType(IncomeType.LATE_PAYMENT_CHARITY)
                .amount(new BigDecimal("10000")).isCharityIncome(true)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolExpenseRecord expense = PoolExpenseRecord.builder()
                .id(3L).poolId(1L).expenseType(ExpenseType.MUDARIB_FEE)
                .amount(new BigDecimal("20000"))
                .periodFrom(periodFrom).periodTo(periodTo).build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(regular, charity));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(expense));
        when(weightageRepo.sumPoolDailyProduct(eq(1L), any(), any()))
                .thenReturn(null);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(calculationRepo.save(any())).thenAnswer(inv -> {
            PoolProfitCalculation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        PoolProfitCalculationResponse response = service.calculatePoolProfit(1L, periodFrom, periodTo);

        assertEquals(0, new BigDecimal("70000").compareTo(response.getNetDistributableProfit()));
    }

    @Test
    void calculatePoolProfit_lossScenario_bankGetsNothing() {
        // Income 10k, expenses 30k -> NDP = -20k (loss), bank share should be 0
        PoolIncomeRecord income = PoolIncomeRecord.builder()
                .id(1L).poolId(1L).incomeType(IncomeType.MURABAHA_PROFIT)
                .amount(new BigDecimal("10000")).isCharityIncome(false)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolExpenseRecord expense = PoolExpenseRecord.builder()
                .id(2L).poolId(1L).expenseType(ExpenseType.MUDARIB_FEE)
                .amount(new BigDecimal("30000"))
                .periodFrom(periodFrom).periodTo(periodTo).build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(income));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(expense));
        when(weightageRepo.sumPoolDailyProduct(eq(1L), any(), any()))
                .thenReturn(null);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(calculationRepo.save(any())).thenAnswer(inv -> {
            PoolProfitCalculation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        PoolProfitCalculationResponse response = service.calculatePoolProfit(1L, periodFrom, periodTo);

        assertTrue(response.isLoss());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getBankMudaribShare()));
        // Full loss goes to depositor pool (NDP is negative)
        assertEquals(0, new BigDecimal("-20000").compareTo(response.getDepositorPool()));
    }

    @Test
    void calculatePoolProfit_profitScenario_conservation() {
        // NDP = 70k, bankShare (40% of 70k = 28k) + depositorPool (42k) == 70k
        PoolIncomeRecord income = PoolIncomeRecord.builder()
                .id(1L).poolId(1L).incomeType(IncomeType.MURABAHA_PROFIT)
                .amount(new BigDecimal("90000")).isCharityIncome(false)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolExpenseRecord expense = PoolExpenseRecord.builder()
                .id(2L).poolId(1L).expenseType(ExpenseType.MUDARIB_FEE)
                .amount(new BigDecimal("20000"))
                .periodFrom(periodFrom).periodTo(periodTo).build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(income));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(expense));
        when(weightageRepo.sumPoolDailyProduct(eq(1L), any(), any()))
                .thenReturn(null);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(calculationRepo.save(any())).thenAnswer(inv -> {
            PoolProfitCalculation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        PoolProfitCalculationResponse response = service.calculatePoolProfit(1L, periodFrom, periodTo);

        BigDecimal ndp = response.getNetDistributableProfit();
        BigDecimal bankShare = response.getBankMudaribShare();
        BigDecimal depositorPool = response.getDepositorPool();

        // Conservation: bankShare + depositorPool == NDP
        assertEquals(0, ndp.compareTo(bankShare.add(depositorPool)));
        assertFalse(response.isLoss());
    }

    @Test
    void calculatePoolProfit_effectiveRateAnnualized() {
        // NDP / avgBalance * (365/days) * 100
        // NDP = 70k, avgBalance = 5M (fallback from pool), days = 31
        // effectiveRate = (70000 / (5000000 * 31)) * 365 * 100
        PoolIncomeRecord income = PoolIncomeRecord.builder()
                .id(1L).poolId(1L).incomeType(IncomeType.MURABAHA_PROFIT)
                .amount(new BigDecimal("90000")).isCharityIncome(false)
                .periodFrom(periodFrom).periodTo(periodTo).build();

        PoolExpenseRecord expense = PoolExpenseRecord.builder()
                .id(2L).poolId(1L).expenseType(ExpenseType.MUDARIB_FEE)
                .amount(new BigDecimal("20000"))
                .periodFrom(periodFrom).periodTo(periodTo).build();

        when(poolRepo.findById(1L)).thenReturn(Optional.of(pool));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(income));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(1L, periodFrom, periodTo))
                .thenReturn(List.of(expense));
        when(weightageRepo.sumPoolDailyProduct(eq(1L), any(), any()))
                .thenReturn(null);
        when(actorProvider.getCurrentActor()).thenReturn("calc-user");
        when(calculationRepo.save(any())).thenAnswer(inv -> {
            PoolProfitCalculation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        PoolProfitCalculationResponse response = service.calculatePoolProfit(1L, periodFrom, periodTo);

        // NDP = 70000, avgBalance = 5000000 (pool total balance fallback), days = 30
        // effectiveRate = (70000 * 365) / (5000000 * 30) * 100
        BigDecimal ndp = response.getNetDistributableProfit();
        long days = response.getPeriodDays();
        BigDecimal avgBalance = response.getAveragePoolBalance();
        BigDecimal expectedRate = ndp
                .multiply(BigDecimal.valueOf(365))
                .divide(avgBalance.multiply(BigDecimal.valueOf(days)), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));

        assertEquals(0, expectedRate.compareTo(response.getEffectiveReturnRate()));
        assertTrue(response.getEffectiveReturnRate().compareTo(BigDecimal.ZERO) > 0);
    }

    // ── Validation Tests ───────────────────────────────────────────────

    @Test
    void validateCalculation_arithmeticMismatch_throws() {
        // stored NDP does not match distributableGross - totalExpenses
        PoolProfitCalculation calc = PoolProfitCalculation.builder()
                .id(1L)
                .poolId(1L)
                .calculationRef("PPC-POOL001-20260101-0001")
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .grossIncome(new BigDecimal("90000"))
                .distributableGrossIncome(new BigDecimal("90000"))
                .totalExpenses(new BigDecimal("20000"))
                .netDistributableProfit(new BigDecimal("60000")) // Wrong! Should be 70000
                .calculationStatus(CalculationStatus.DRAFT)
                .build();

        when(calculationRepo.findById(1L)).thenReturn(Optional.of(calc));
        when(incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(any(), any(), any()))
                .thenReturn(List.of(PoolIncomeRecord.builder()
                        .amount(new BigDecimal("90000"))
                        .incomeType(IncomeType.MURABAHA_PROFIT)
                        .build()));
        when(expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(any(), any(), any()))
                .thenReturn(List.of(PoolExpenseRecord.builder()
                        .amount(new BigDecimal("20000"))
                        .expenseType(ExpenseType.MUDARIB_FEE)
                        .build()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.validateCalculation(1L, "validator-user"));

        assertNotNull(ex.getMessage());
    }

    @Test
    void approveCalculation_fourEyes_samePersonRejected() {
        PoolProfitCalculation calc = PoolProfitCalculation.builder()
                .id(1L)
                .poolId(1L)
                .calculationRef("PPC-POOL001-20260101-0001")
                .calculationStatus(CalculationStatus.VALIDATED)
                .calculatedBy("user-A")
                .validatedBy("user-B")
                .build();

        when(calculationRepo.findById(1L)).thenReturn(Optional.of(calc));

        // Same person as calculatedBy tries to approve
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.approveCalculation(1L, "user-A"));

        assertTrue(ex.getMessage().contains("Four-eyes principle"));
    }
}
