package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.ConservationCheck;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolProfitCalculationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProfitAllocationService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final PoolProfitCalculationRepository calculationRepo;
    private final PoolProfitAllocationRepository allocationRepo;
    private final MudarabahAccountRepository mudarabahAccountRepo;
    private final PoolWeightageService weightageService;
    private final InvestmentPoolRepository poolRepo;
    private final CurrentActorProvider actorProvider;

    /**
     * Allocates the depositor pool from an approved profit calculation to individual participants
     * based on their weightage and profit-sharing ratios (PSR).
     */
    public ProfitAllocationBatch allocateProfit(Long poolId, Long profitCalculationId) {
        PoolProfitCalculation calc = calculationRepo.findById(profitCalculationId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", profitCalculationId));

        if (calc.getCalculationStatus() != CalculationStatus.APPROVED) {
            throw new com.cbs.common.exception.BusinessException(
                    "Calculation must be APPROVED before allocation, current status: " + calc.getCalculationStatus(),
                    "INVALID_STATE");
        }

        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));

        BigDecimal depositorPool = calc.getDepositorPool();
        boolean isLoss = calc.isLoss();
        long periodDays = ChronoUnit.DAYS.between(calc.getPeriodFrom(), calc.getPeriodTo());
        if (periodDays == 0) {
            periodDays = 1;
        }

        // Calculate weightages for all participants in the pool
        Map<Long, BigDecimal> weightages = weightageService.calculateAllWeightages(
                poolId, calc.getPeriodFrom(), calc.getPeriodTo());

        // Allocate to each participant
        List<PoolProfitAllocation> allocations = new ArrayList<>();
        BigDecimal totalCustomerProfit = ZERO;
        BigDecimal totalBankProfit = ZERO;

        for (Map.Entry<Long, BigDecimal> entry : weightages.entrySet()) {
            Long accountId = entry.getKey();
            BigDecimal weight = entry.getValue();

            // Participant share = depositorPool * weightage%
            BigDecimal participantShare = depositorPool
                    .multiply(weight)
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);

            // Look up the mudarabah account for PSR
            MudarabahAccount ma = mudarabahAccountRepo.findByAccountId(accountId).orElse(null);
            BigDecimal customerPsr = ma != null
                    ? ma.getProfitSharingRatioCustomer()
                    : new BigDecimal("70.0000");
            BigDecimal bankPsr = ma != null
                    ? ma.getProfitSharingRatioBank()
                    : new BigDecimal("30.0000");

            BigDecimal customerProfit;
            BigDecimal bankProfit;
            if (participantShare.compareTo(ZERO) >= 0) {
                // Profit: split by PSR
                customerProfit = participantShare
                        .multiply(customerPsr)
                        .divide(HUNDRED, 4, RoundingMode.HALF_UP);
                bankProfit = participantShare.subtract(customerProfit);
            } else {
                // Loss: full loss to customer, no bank share
                customerProfit = participantShare;
                bankProfit = ZERO;
            }

            totalCustomerProfit = totalCustomerProfit.add(customerProfit);
            totalBankProfit = totalBankProfit.add(bankProfit);

            PoolProfitAllocation allocation = PoolProfitAllocation.builder()
                    .poolId(poolId)
                    .accountId(accountId)
                    .mudarabahAccountId(ma != null ? ma.getId() : 0L)
                    .periodFrom(calc.getPeriodFrom())
                    .periodTo(calc.getPeriodTo())
                    .poolTotalDailyProduct(ZERO)
                    .totalDailyProduct(ZERO)
                    .weightagePercentage(weight)
                    .poolGrossProfit(calc.getNetDistributableProfit())
                    .grossShareBeforePer(participantShare)
                    .perAdjustment(ZERO)
                    .irrDeduction(ZERO)
                    .netShareAfterReserves(participantShare)
                    .customerPsr(customerPsr)
                    .customerProfitShare(customerProfit)
                    .bankProfitShare(bankProfit)
                    .effectiveProfitRate(calculateEffectiveRate(customerProfit, ma, periodDays))
                    .distributionStatus(ProfitAllocationStatus.CALCULATED)
                    .build();

            allocations.add(allocationRepo.save(allocation));
        }

        // Conservation check: sum of all allocations must equal the depositor pool
        BigDecimal sumAllocations = allocations.stream()
                .map(a -> a.getCustomerProfitShare().add(a.getBankProfitShare()))
                .reduce(ZERO, BigDecimal::add);
        BigDecimal diff = sumAllocations.subtract(depositorPool).abs();
        boolean conservationPasses = diff.compareTo(new BigDecimal("0.01")) <= 0;

        // Apply rounding adjustment to the largest allocation if needed
        if (!conservationPasses && !allocations.isEmpty()) {
            BigDecimal adjustment = depositorPool.subtract(sumAllocations);
            PoolProfitAllocation largest = allocations.stream()
                    .max(Comparator.comparing(a -> a.getCustomerProfitShare().abs()))
                    .get();
            largest.setCustomerProfitShare(largest.getCustomerProfitShare().add(adjustment));
            allocationRepo.save(largest);
        }

        ConservationCheck cc = ConservationCheck.builder()
                .inputAmount(depositorPool)
                .sumOfAllocations(sumAllocations)
                .difference(diff)
                .isPassing(conservationPasses || diff.compareTo(new BigDecimal("0.10")) <= 0)
                .tolerance(new BigDecimal("0.01"))
                .status(conservationPasses ? "PASSED" : "ADJUSTED")
                .build();

        BigDecimal avgRate = allocations.isEmpty()
                ? ZERO
                : allocations.stream()
                        .map(PoolProfitAllocation::getEffectiveProfitRate)
                        .filter(r -> r != null)
                        .reduce(ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(allocations.size()), 4, RoundingMode.HALF_UP);

        log.info("Profit allocated: pool={}, participants={}, totalCustomer={}, totalBank={}, conservation={}",
                pool.getPoolCode(), allocations.size(), totalCustomerProfit, totalBankProfit, cc.getStatus());

        return ProfitAllocationBatch.builder()
                .batchId(profitCalculationId)
                .poolId(poolId)
                .poolCode(pool.getPoolCode())
                .profitCalculationId(profitCalculationId)
                .periodFrom(calc.getPeriodFrom())
                .periodTo(calc.getPeriodTo())
                .depositorPoolBeforeReserves(calc.getDepositorPool())
                .depositorPoolAfterReserves(depositorPool)
                .participantCount(allocations.size())
                .totalCustomerProfit(totalCustomerProfit)
                .totalBankProfit(totalBankProfit)
                .averageEffectiveRate(avgRate)
                .isLoss(isLoss)
                .status("CALCULATED")
                .conservationCheck(cc)
                .build();
    }

    /**
     * Approves all CALCULATED allocations for the given pool and period.
     */
    public void approveAllocations(Long poolId, LocalDate periodFrom, LocalDate periodTo, String approvedBy) {
        List<PoolProfitAllocation> allocations = allocationRepo
                .findByPoolIdAndPeriodFromAndPeriodTo(poolId, periodFrom, periodTo);

        for (PoolProfitAllocation a : allocations) {
            if (a.getDistributionStatus() == ProfitAllocationStatus.CALCULATED) {
                a.setDistributionStatus(ProfitAllocationStatus.APPROVED);
                allocationRepo.save(a);
            }
        }

        log.info("Allocations approved: pool={}, period={}-{}, count={}, approvedBy={}",
                poolId, periodFrom, periodTo, allocations.size(), approvedBy);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private BigDecimal calculateEffectiveRate(BigDecimal profit, MudarabahAccount ma, long periodDays) {
        if (ma == null || ma.getAccount() == null) {
            return ZERO;
        }
        BigDecimal balance = ma.getAccount().getBookBalance();
        if (balance.compareTo(ZERO) <= 0 || periodDays <= 0) {
            return ZERO;
        }
        // Annualised effective rate = (profit / balance) * (365 / periodDays) * 100
        return profit
                .multiply(BigDecimal.valueOf(365))
                .divide(balance.multiply(BigDecimal.valueOf(periodDays)), 4, RoundingMode.HALF_UP)
                .multiply(HUNDRED);
    }
}
