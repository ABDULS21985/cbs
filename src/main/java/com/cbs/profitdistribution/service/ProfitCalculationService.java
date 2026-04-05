package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.profitdistribution.dto.PoolPerformanceComparison;
import com.cbs.profitdistribution.dto.PoolProfitCalculationResponse;
import com.cbs.profitdistribution.dto.PoolProfitTrend;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PeriodType;
import com.cbs.profitdistribution.entity.PoolExpenseRecord;
import com.cbs.profitdistribution.entity.PoolIncomeRecord;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolExpenseRecordRepository;
import com.cbs.profitdistribution.repository.PoolIncomeRecordRepository;
import com.cbs.profitdistribution.repository.PoolProfitCalculationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProfitCalculationService {

    private final PoolProfitCalculationRepository calculationRepo;
    private final PoolIncomeRecordRepository incomeRepo;
    private final PoolExpenseRecordRepository expenseRepo;
    private final InvestmentPoolRepository poolRepo;
    private final PoolWeightageRecordRepository weightageRepo;
    private final CurrentActorProvider actorProvider;

        private static final Pattern NUMERIC_METADATA_PATTERN = Pattern.compile("(?i)(?:\\\"%s\\\"|%s)\\s*[:=]\\s*\\\"?(-?\\d+(?:\\.\\d+)?)\\\"?");

    // ── Pool Profit Calculation ────────────────────────────────────────

    public PoolProfitCalculationResponse calculatePoolProfit(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));

        // Validate pool PSR bounds
        if (pool.getProfitSharingRatioBank() != null && pool.getProfitSharingRatioBank().compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Pool PSR bank ratio exceeds 100%: " + pool.getProfitSharingRatioBank(), "INVALID_POOL_PSR");
        }

        // Period overlap validation: check for existing approved/used calculations that overlap this period
        List<PoolProfitCalculation> existingCalcs = calculationRepo.findByPoolIdOrderByPeriodFromDesc(poolId);
        for (PoolProfitCalculation existing : existingCalcs) {
            if ((existing.getCalculationStatus() == CalculationStatus.APPROVED
                    || existing.getCalculationStatus() == CalculationStatus.USED_IN_DISTRIBUTION)
                    && existing.getCalculationStatus() != CalculationStatus.SUPERSEDED) {
                boolean overlaps = !periodTo.isBefore(existing.getPeriodFrom())
                        && !periodFrom.isAfter(existing.getPeriodTo());
                if (overlaps) {
                    throw new BusinessException(
                            "Period overlaps with existing " + existing.getCalculationStatus()
                                    + " calculation " + existing.getCalculationRef()
                                    + " (" + existing.getPeriodFrom() + " to " + existing.getPeriodTo() + ")",
                            "PERIOD_OVERLAP");
                }
            }
        }

        // 1. Aggregate income
        List<PoolIncomeRecord> incomes = incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(poolId, periodFrom, periodTo);
        IncomeNormalization incomeNormalization = normalizeIncomeRecords(incomes, pool.getCurrencyCode());
        BigDecimal grossIncome = incomeNormalization.total();
        BigDecimal charityIncome = incomeNormalization.charityTotal();
        BigDecimal distributableGross = grossIncome.subtract(charityIncome);
        Map<String, BigDecimal> incomeBreakdown = incomeNormalization.breakdown();

        // 2. Aggregate expenses
        List<PoolExpenseRecord> expenses = expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(poolId, periodFrom, periodTo);
        ExpenseNormalization expenseNormalization = normalizeExpenseRecords(expenses, pool.getCurrencyCode());
        BigDecimal totalExpenses = expenseNormalization.total();
        Map<String, BigDecimal> expenseBreakdown = expenseNormalization.breakdown();

        // 3. Net Distributable Profit
        BigDecimal ndp = distributableGross.subtract(totalExpenses);
        boolean isLoss = ndp.compareTo(BigDecimal.ZERO) < 0;

        // 4. Bank Mudarib share (only from profit, not from loss)
        BigDecimal bankShare = BigDecimal.ZERO;
        if (!isLoss && ndp.compareTo(BigDecimal.ZERO) > 0) {
            if (pool.getProfitSharingRatioBank() == null) {
                throw new BusinessException(
                        "Pool profit sharing ratio (bank) is not configured for pool " + pool.getPoolCode(),
                        "POOL_PSR_NOT_CONFIGURED");
            }
            bankShare = ndp.multiply(pool.getProfitSharingRatioBank())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        }
        BigDecimal depositorPool = isLoss ? ndp : ndp.subtract(bankShare);

        // 5. Pool metrics
        long periodDays = Math.max(ChronoUnit.DAYS.between(periodFrom, periodTo) + 1, 1);

        BigDecimal avgPoolBalance = BigDecimal.ZERO;
        try {
            BigDecimal totalDP = weightageRepo.sumPoolDailyProduct(poolId, periodFrom, periodTo);
            if (totalDP != null && totalDP.compareTo(BigDecimal.ZERO) > 0) {
                avgPoolBalance = totalDP.divide(BigDecimal.valueOf(periodDays), 4, RoundingMode.HALF_UP);
            } else {
                avgPoolBalance = pool.getTotalPoolBalance();
            }
        } catch (Exception e) {
            log.warn("Failed to compute average pool balance from daily products for pool {}, falling back to total balance",
                    poolId, e);
            avgPoolBalance = pool.getTotalPoolBalance();
        }

        BigDecimal effectiveRate = BigDecimal.ZERO;
        if (avgPoolBalance.compareTo(BigDecimal.ZERO) > 0) {
            effectiveRate = ndp
                    .multiply(BigDecimal.valueOf(365))
                    .divide(avgPoolBalance.multiply(BigDecimal.valueOf(periodDays)), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        }

        // 6. Determine period type
        PeriodType periodType = determinePeriodType(periodDays);

        // 7. Create and persist calculation record
        String calcRef = "PPC-" + pool.getPoolCode() + "-"
                + periodFrom.toString().replace("-", "") + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String calculationNotes = buildCalculationNotes(incomeNormalization, expenseNormalization, pool.getCurrencyCode());

        PoolProfitCalculation calc = PoolProfitCalculation.builder()
                .poolId(poolId)
                .calculationRef(calcRef)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .periodType(periodType)
                .currencyCode(pool.getCurrencyCode())
                .grossIncome(grossIncome)
                .incomeBreakdown(incomeBreakdown)
                .charityIncome(charityIncome)
                .distributableGrossIncome(distributableGross)
                .totalExpenses(totalExpenses)
                .expenseBreakdown(expenseBreakdown)
                .netDistributableProfit(ndp)
                .isLoss(isLoss)
                .averagePoolBalance(avgPoolBalance)
                .periodDays((int) periodDays)
                .effectiveReturnRate(effectiveRate)
                .bankMudaribShare(bankShare)
                .bankMudaribMethod("FROM_POOL_CONFIG")
                .depositorPool(depositorPool)
                .calculationStatus(CalculationStatus.DRAFT)
                .calculatedBy(actorProvider.getCurrentActor())
                .calculatedAt(LocalDateTime.now())
                .notes(calculationNotes)
                .build();

        calc = calculationRepo.save(calc);

        log.info("Pool profit calculated: ref={}, pool={}, ndp={}, isLoss={}, bankShare={}, depositorPool={}",
                calcRef, pool.getPoolCode(), ndp, isLoss, bankShare, depositorPool);

        return toResponse(calc, pool);
    }

    public PoolProfitCalculationResponse recalculatePoolProfit(Long calculationId) {
        PoolProfitCalculation existing = calculationRepo.findById(calculationId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", calculationId));

        if (existing.getCalculationStatus() != CalculationStatus.DRAFT
                && existing.getCalculationStatus() != CalculationStatus.VALIDATED) {
            throw new BusinessException(
                    "Can only recalculate DRAFT or VALIDATED calculations, current status: "
                            + existing.getCalculationStatus(),
                    "INVALID_STATE");
        }

        Long poolId = existing.getPoolId();
        LocalDate periodFrom = existing.getPeriodFrom();
        LocalDate periodTo = existing.getPeriodTo();

        // Create new calculation first to avoid data loss, then soft-delete old one
        existing.setCalculationStatus(CalculationStatus.SUPERSEDED);
        existing.setNotes((existing.getNotes() != null ? existing.getNotes() + "; " : "")
                + "Superseded by recalculation at " + LocalDateTime.now());
        calculationRepo.save(existing);

        return calculatePoolProfit(poolId, periodFrom, periodTo);
    }

    // ── Validation & Approval (Maker-Checker) ──────────────────────────

    public void validateCalculation(Long calculationId, String validatedBy) {
        PoolProfitCalculation calc = calculationRepo.findById(calculationId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", calculationId));

        if (calc.getCalculationStatus() != CalculationStatus.DRAFT) {
            throw new BusinessException(
                    "Only DRAFT calculations can be validated, current status: " + calc.getCalculationStatus(),
                    "INVALID_STATE");
        }

        // Four-eyes check: validator must differ from calculator
        if (validatedBy != null && validatedBy.equals(calc.getCalculatedBy())) {
            throw new BusinessException(
                    "Four-eyes principle violated: validator must differ from the calculator",
                    "FOUR_EYES_VIOLATION");
        }

        IncomeNormalization incomeNormalization = normalizeIncomeRecords(
                incomeRepo.findByPoolIdAndPeriodFromAndPeriodTo(calc.getPoolId(), calc.getPeriodFrom(), calc.getPeriodTo()),
                calc.getCurrencyCode());
        BigDecimal incomeSum = incomeNormalization.total();
        if (incomeSum.compareTo(calc.getGrossIncome()) != 0) {
            throw new BusinessException(
                    "Income mismatch: income records total " + incomeSum.toPlainString()
                            + " but calculation stores " + calc.getGrossIncome().toPlainString(),
                    "INCOME_MISMATCH");
        }

        ExpenseNormalization expenseNormalization = normalizeExpenseRecords(
                expenseRepo.findByPoolIdAndPeriodFromAndPeriodTo(calc.getPoolId(), calc.getPeriodFrom(), calc.getPeriodTo()),
                calc.getCurrencyCode());
        BigDecimal expenseSum = expenseNormalization.total();
        if (expenseSum.compareTo(calc.getTotalExpenses()) != 0) {
            throw new BusinessException(
                    "Expense mismatch: expense records total " + expenseSum.toPlainString()
                            + " but calculation stores " + calc.getTotalExpenses().toPlainString(),
                    "EXPENSE_MISMATCH");
        }

        // Arithmetic check: ndp = distributableGross - totalExpenses
        BigDecimal expectedNdp = calc.getDistributableGrossIncome().subtract(calc.getTotalExpenses());
        if (expectedNdp.compareTo(calc.getNetDistributableProfit()) != 0) {
            throw new BusinessException(
                    "Arithmetic mismatch: expected NDP " + expectedNdp.toPlainString()
                            + " but found " + calc.getNetDistributableProfit().toPlainString(),
                    "ARITHMETIC_MISMATCH");
        }

        // Conservation check: bankShare + depositorPool = ndp (for profit cases)
        if (!calc.isLoss()) {
            BigDecimal total = calc.getBankMudaribShare().add(calc.getDepositorPool());
            if (total.subtract(calc.getNetDistributableProfit()).abs().compareTo(new BigDecimal("0.01")) > 0) {
                throw new BusinessException(
                        "Conservation check failed: bankShare + depositorPool ("
                                + total.toPlainString() + ") does not equal NDP ("
                                + calc.getNetDistributableProfit().toPlainString() + ")",
                        "CONSERVATION_FAILED");
            }
        }

        calc.setCalculationStatus(CalculationStatus.VALIDATED);
        calc.setValidatedBy(validatedBy);
        calc.setValidatedAt(LocalDateTime.now());
        calculationRepo.save(calc);

        log.info("Calculation validated: ref={}, validatedBy={}", calc.getCalculationRef(), validatedBy);
    }

    public void approveCalculation(Long calculationId, String approvedBy) {
        PoolProfitCalculation calc = calculationRepo.findById(calculationId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", calculationId));

        if (calc.getCalculationStatus() != CalculationStatus.VALIDATED) {
            throw new BusinessException(
                    "Calculation must be validated before approval, current status: " + calc.getCalculationStatus(),
                    "INVALID_STATE");
        }

        // Four-eyes principle: approver cannot be the calculator
        if (approvedBy.equals(calc.getCalculatedBy())) {
            throw new BusinessException(
                    "Four-eyes principle violated: approver cannot be the same person who calculated",
                    "FOUR_EYES_VIOLATION");
        }

        // Four-eyes principle: approver cannot be the validator
        if (approvedBy.equals(calc.getValidatedBy())) {
            throw new BusinessException(
                    "Four-eyes principle violated: approver cannot be the same person who validated",
                    "FOUR_EYES_VIOLATION");
        }

        calc.setCalculationStatus(CalculationStatus.APPROVED);
        calc.setApprovedBy(approvedBy);
        calc.setApprovedAt(LocalDateTime.now());
        calculationRepo.save(calc);

        log.info("Calculation approved: ref={}, approvedBy={}", calc.getCalculationRef(), approvedBy);
    }

    // ── Batch Calculation ──────────────────────────────────────────────

    public List<PoolProfitCalculationResponse> calculateAllPoolProfits(LocalDate periodFrom, LocalDate periodTo) {
        List<PoolProfitCalculationResponse> results = new ArrayList<>();
        List<String> failedPools = new ArrayList<>();

        for (InvestmentPool pool : poolRepo.findByStatus(PoolStatus.ACTIVE)) {
            try {
                results.add(calculatePoolProfit(pool.getId(), periodFrom, periodTo));
            } catch (Exception e) {
                failedPools.add(pool.getPoolCode() + ": " + e.getMessage());
                log.error("AUDIT: Profit calculation FAILED for pool {} ({}): {}", pool.getPoolCode(), pool.getId(), e.getMessage());
            }
        }

        if (!failedPools.isEmpty()) {
            log.error("AUDIT: Batch profit calculation completed with {} failures: {}", failedPools.size(), failedPools);
        }

        return results;
    }

    // ── Queries ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PoolProfitCalculationResponse getCalculation(Long id) {
        PoolProfitCalculation calc = calculationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", id));
        InvestmentPool pool = poolRepo.findById(calc.getPoolId())
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", calc.getPoolId()));
        return toResponse(calc, pool);
    }

    @Transactional(readOnly = true)
    public PoolProfitCalculationResponse getCalculationByRef(String ref) {
        PoolProfitCalculation calc = calculationRepo.findByCalculationRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "calculationRef", ref));
        InvestmentPool pool = poolRepo.findById(calc.getPoolId())
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", calc.getPoolId()));
        return toResponse(calc, pool);
    }

    @Transactional(readOnly = true)
    public List<PoolProfitCalculationResponse> getCalculationsByPool(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        return calculationRepo.findByPoolIdOrderByPeriodFromDesc(poolId).stream()
                .map(calc -> toResponse(calc, pool))
                .toList();
    }

    @Transactional(readOnly = true)
    public PoolProfitTrend getProfitTrend(Long poolId, int periods) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        List<PoolProfitCalculation> calculations = calculationRepo.findTop12ByPoolIdOrderByPeriodFromDesc(poolId).stream()
                .limit(Math.max(periods, 1))
                .toList();

        List<PoolProfitTrend.PeriodProfit> periodProfits = new java.util.ArrayList<>();
        BigDecimal previous = null;
        for (int i = calculations.size() - 1; i >= 0; i--) {
            PoolProfitCalculation calculation = calculations.get(i);
            String trend = "FLAT";
            if (previous != null) {
                int compare = calculation.getNetDistributableProfit().compareTo(previous);
                trend = compare > 0 ? "UP" : compare < 0 ? "DOWN" : "FLAT";
            }
            periodProfits.add(PoolProfitTrend.PeriodProfit.builder()
                    .periodFrom(calculation.getPeriodFrom())
                    .periodTo(calculation.getPeriodTo())
                    .netDistributableProfit(calculation.getNetDistributableProfit())
                    .effectiveRate(calculation.getEffectiveReturnRate())
                    .trend(trend)
                    .build());
            previous = calculation.getNetDistributableProfit();
        }

        return PoolProfitTrend.builder()
                .poolId(poolId)
                .poolCode(pool.getPoolCode())
                .periods(periodProfits)
                .build();
    }

    @Transactional(readOnly = true)
    public PoolPerformanceComparison comparePoolPerformance(LocalDate periodFrom, LocalDate periodTo) {
        List<PoolPerformanceComparison.PoolPerformanceEntry> entries = poolRepo.findByStatus(PoolStatus.ACTIVE).stream()
                .map(pool -> calculationRepo.findByPoolIdAndPeriodFromAndPeriodToAndCalculationStatus(
                                pool.getId(), periodFrom, periodTo, CalculationStatus.APPROVED)
                        .orElseGet(() -> calculationRepo.findByPoolIdAndPeriodFromAndPeriodToAndCalculationStatus(
                                        pool.getId(), periodFrom, periodTo, CalculationStatus.USED_IN_DISTRIBUTION)
                                .orElse(null)))
                .filter(java.util.Objects::nonNull)
                .sorted((left, right) -> right.getNetDistributableProfit().compareTo(left.getNetDistributableProfit()))
                .map(calc -> PoolPerformanceComparison.PoolPerformanceEntry.builder()
                        .poolId(calc.getPoolId())
                        .poolCode(poolRepo.findById(calc.getPoolId()).map(InvestmentPool::getPoolCode).orElse(null))
                        .netDistributableProfit(calc.getNetDistributableProfit())
                        .effectiveRate(calc.getEffectiveReturnRate())
                        .build())
                .toList();

        List<PoolPerformanceComparison.PoolPerformanceEntry> ranked = new java.util.ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            PoolPerformanceComparison.PoolPerformanceEntry entry = entries.get(i);
            ranked.add(PoolPerformanceComparison.PoolPerformanceEntry.builder()
                    .poolId(entry.getPoolId())
                    .poolCode(entry.getPoolCode())
                    .netDistributableProfit(entry.getNetDistributableProfit())
                    .effectiveRate(entry.getEffectiveRate())
                    .rank(i + 1)
                    .build());
        }

        return PoolPerformanceComparison.builder()
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .pools(ranked)
                .build();
    }

    @Transactional(readOnly = true)
    public PoolProfitCalculationResponse getApprovedCalculation(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        PoolProfitCalculation calc = calculationRepo
                .findByPoolIdAndPeriodFromAndPeriodToAndCalculationStatus(
                        poolId, periodFrom, periodTo, CalculationStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No approved calculation found for pool " + poolId
                                + " period " + periodFrom + " to " + periodTo));
        return toResponse(calc, pool);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private PeriodType determinePeriodType(long days) {
        if (days <= 31) return PeriodType.MONTHLY;
        if (days <= 92) return PeriodType.QUARTERLY;
        if (days <= 183) return PeriodType.SEMI_ANNUAL;
        if (days <= 366) return PeriodType.ANNUAL;
        return PeriodType.CUSTOM;
    }

    private PoolProfitCalculationResponse toResponse(PoolProfitCalculation c, InvestmentPool pool) {
        return PoolProfitCalculationResponse.builder()
                .id(c.getId())
                .poolId(c.getPoolId())
                .poolCode(pool.getPoolCode())
                .calculationRef(c.getCalculationRef())
                .periodFrom(c.getPeriodFrom())
                .periodTo(c.getPeriodTo())
                .periodType(c.getPeriodType())
                .currencyCode(c.getCurrencyCode())
                .grossIncome(c.getGrossIncome())
                .incomeBreakdown(c.getIncomeBreakdown())
                .charityIncome(c.getCharityIncome())
                .distributableGrossIncome(c.getDistributableGrossIncome())
                .totalExpenses(c.getTotalExpenses())
                .expenseBreakdown(c.getExpenseBreakdown())
                .netDistributableProfit(c.getNetDistributableProfit())
                .isLoss(c.isLoss())
                .averagePoolBalance(c.getAveragePoolBalance())
                .periodDays(c.getPeriodDays())
                .effectiveReturnRate(c.getEffectiveReturnRate())
                .bankMudaribShare(c.getBankMudaribShare())
                .bankMudaribMethod(c.getBankMudaribMethod())
                .depositorPool(c.getDepositorPool())
                .calculationStatus(c.getCalculationStatus())
                .calculatedBy(c.getCalculatedBy())
                .calculatedAt(c.getCalculatedAt())
                .validatedBy(c.getValidatedBy())
                .validatedAt(c.getValidatedAt())
                .approvedBy(c.getApprovedBy())
                .approvedAt(c.getApprovedAt())
                .notes(c.getNotes())
                .tenantId(c.getTenantId())
                .build();
    }

        private IncomeNormalization normalizeIncomeRecords(List<PoolIncomeRecord> incomes, String poolCurrency) {
                BigDecimal total = BigDecimal.ZERO;
                BigDecimal charityTotal = BigDecimal.ZERO;
                Map<String, BigDecimal> breakdown = new LinkedHashMap<>();
                List<String> conversionNotes = new ArrayList<>();

                for (PoolIncomeRecord income : incomes) {
                        NormalizedAmount normalized = normalizeRecordAmount(
                                        income.getAmount(),
                                        income.getCurrencyCode(),
                                        poolCurrency,
                                        income.getNotes(),
                                        null,
                                        "income",
                                        income.getId());
                        total = total.add(normalized.amount());
                        if (income.isCharityIncome()) {
                                charityTotal = charityTotal.add(normalized.amount());
                        }
                        breakdown.merge(income.getIncomeType().name(), normalized.amount(), BigDecimal::add);
                        if (normalized.converted() && normalized.note() != null) {
                                conversionNotes.add(normalized.note());
                        }
                }

                return new IncomeNormalization(total, charityTotal, breakdown, conversionNotes);
        }

        private ExpenseNormalization normalizeExpenseRecords(List<PoolExpenseRecord> expenses, String poolCurrency) {
                BigDecimal total = BigDecimal.ZERO;
                Map<String, BigDecimal> breakdown = new LinkedHashMap<>();
                List<String> conversionNotes = new ArrayList<>();

                for (PoolExpenseRecord expense : expenses) {
                        NormalizedAmount normalized = normalizeRecordAmount(
                                        expense.getAmount(),
                                        expense.getCurrencyCode(),
                                        poolCurrency,
                                        expense.getAllocationBasis(),
                                        expense.getDescription(),
                                        "expense",
                                        expense.getId());
                        total = total.add(normalized.amount());
                        breakdown.merge(expense.getExpenseType().name(), normalized.amount(), BigDecimal::add);
                        if (normalized.converted() && normalized.note() != null) {
                                conversionNotes.add(normalized.note());
                        }
                }

                return new ExpenseNormalization(total, breakdown, conversionNotes);
        }

    private NormalizedAmount normalizeRecordAmount(BigDecimal amount,
                                                   String recordCurrency,
                                                   String poolCurrency,
                                                   String primaryMetadata,
                                                   String secondaryMetadata,
                                                   String recordType,
                                                   Long recordId) {
        BigDecimal baseAmount = defaultAmount(amount);
        if (!StringUtils.hasText(poolCurrency)) {
            return new NormalizedAmount(baseAmount, false, null);
        }

        String effectivePoolCurrency = poolCurrency.trim().toUpperCase(Locale.ROOT);
        String effectiveRecordCurrency = StringUtils.hasText(recordCurrency)
                ? recordCurrency.trim().toUpperCase(Locale.ROOT)
                : effectivePoolCurrency;
        if (!StringUtils.hasText(effectiveRecordCurrency) || effectivePoolCurrency.equals(effectiveRecordCurrency)) {
            return new NormalizedAmount(baseAmount, false, null);
        }

        String metadata = combineMetadata(primaryMetadata, secondaryMetadata);
        BigDecimal poolCurrencyAmount = extractMetadataNumber(metadata,
                "poolCurrencyAmount", "baseAmount", "amountInPoolCurrency");
        if (poolCurrencyAmount != null) {
            return new NormalizedAmount(poolCurrencyAmount.setScale(4, RoundingMode.HALF_UP), true,
                    String.format("%s#%s %s->%s via poolCurrencyAmount", recordType, recordId, effectiveRecordCurrency, effectivePoolCurrency));
        }

        BigDecimal exchangeRate = extractMetadataNumber(metadata, "exchangeRate", "fxRate", "conversionRate");
        if (exchangeRate != null && exchangeRate.compareTo(BigDecimal.ZERO) > 0) {
            return new NormalizedAmount(baseAmount.multiply(exchangeRate).setScale(4, RoundingMode.HALF_UP), true,
                    String.format("%s#%s %s->%s @ %s", recordType, recordId, effectiveRecordCurrency, effectivePoolCurrency, exchangeRate.toPlainString()));
        }

        throw new BusinessException(
                "Pool " + recordType + " record " + recordId + " is in currency " + effectiveRecordCurrency
                        + " but pool currency is " + effectivePoolCurrency
                        + ". Provide poolCurrencyAmount or exchangeRate metadata in notes/allocation basis.",
                "POOL_RECORD_FX_METADATA_REQUIRED");
        }

        private String buildCalculationNotes(IncomeNormalization incomeNormalization,
                                                                                 ExpenseNormalization expenseNormalization,
                                                                                 String poolCurrency) {
                List<String> notes = new ArrayList<>();
                if (!incomeNormalization.conversionNotes().isEmpty()) {
                        notes.add("Income FX normalized to " + poolCurrency + ": " + String.join(", ", incomeNormalization.conversionNotes()));
                }
                if (!expenseNormalization.conversionNotes().isEmpty()) {
                        notes.add("Expense FX normalized to " + poolCurrency + ": " + String.join(", ", expenseNormalization.conversionNotes()));
                }
                return notes.isEmpty() ? null : String.join(" | ", notes);
        }

        private String combineMetadata(String primaryMetadata, String secondaryMetadata) {
                if (StringUtils.hasText(primaryMetadata) && StringUtils.hasText(secondaryMetadata)) {
                        return primaryMetadata + " | " + secondaryMetadata;
                }
                if (StringUtils.hasText(primaryMetadata)) {
                        return primaryMetadata;
                }
                return secondaryMetadata;
        }

        private BigDecimal extractMetadataNumber(String metadata, String... keys) {
                if (!StringUtils.hasText(metadata)) {
                        return null;
                }
                for (String key : keys) {
                        Pattern pattern = Pattern.compile(NUMERIC_METADATA_PATTERN.pattern().formatted(key, key));
                        Matcher matcher = pattern.matcher(metadata);
                        if (matcher.find()) {
                                try {
                                        return new BigDecimal(matcher.group(1));
                                } catch (NumberFormatException ignored) {
                                }
                        }
                }
                return null;
        }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

        private record NormalizedAmount(BigDecimal amount, boolean converted, String note) {
        }

        private record IncomeNormalization(BigDecimal total,
                                                                           BigDecimal charityTotal,
                                                                           Map<String, BigDecimal> breakdown,
                                                                           List<String> conversionNotes) {
        }

        private record ExpenseNormalization(BigDecimal total,
                                                                                Map<String, BigDecimal> breakdown,
                                                                                List<String> conversionNotes) {
        }
}
