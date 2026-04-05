package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.dto.PoolProfitAllocationResponse;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.ConservationCheck;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolAssetAssignmentRepository;
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
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final PoolProfitCalculationRepository calculationRepo;
    private final PoolProfitAllocationRepository allocationRepo;
    private final MudarabahAccountRepository mudarabahAccountRepo;
    private final PoolWeightageService weightageService;
    private final PoolWeightageRecordRepository weightageRecordRepo;
    private final InvestmentPoolRepository poolRepo;
    private final PoolAssetAssignmentRepository poolAssetAssignmentRepo;
    private final CurrentActorProvider actorProvider;

    public ProfitAllocationBatch allocateProfit(Long poolId, Long profitCalculationId) {
        return allocateProfit(poolId, profitCalculationId, null, ZERO, ZERO);
    }

    public ProfitAllocationBatch allocateProfit(Long poolId,
                                                Long profitCalculationId,
                                                BigDecimal depositorPoolAfterReserves,
                                                BigDecimal signedPerAdjustment,
                                                BigDecimal signedIrrAdjustment) {
        PoolProfitCalculation calc = getApprovedOrUsedCalculation(profitCalculationId);
        InvestmentPool pool = getPool(poolId);

        if (!poolId.equals(calc.getPoolId())) {
            throw new BusinessException("Calculation does not belong to the specified pool", "CALCULATION_POOL_MISMATCH");
        }

        BigDecimal preReservePool = defaultAmount(calc.getDepositorPool());
        BigDecimal distributablePool = depositorPoolAfterReserves != null
                ? depositorPoolAfterReserves
                : preReservePool;
        long periodDays = Math.max(ChronoUnit.DAYS.between(calc.getPeriodFrom(), calc.getPeriodTo()) + 1, 1);

        Map<Long, BigDecimal> weightages = weightageService.calculateAllWeightages(
                poolId, calc.getPeriodFrom(), calc.getPeriodTo());
        if (weightages.isEmpty()) {
            throw new BusinessException("No daily weightages recorded for the allocation period", "NO_WEIGHTAGE_DATA");
        }

        BigDecimal totalWeight = weightages.values().stream().reduce(ZERO, BigDecimal::add);
        if (totalWeight.subtract(HUNDRED).abs().compareTo(TOLERANCE) > 0) {
            throw new BusinessException(
                    "Weightage conservation failed: expected 100 but found " + totalWeight.toPlainString(),
                    "WEIGHTAGE_CONSERVATION_FAILED");
        }

        List<PoolProfitAllocation> existing = allocationRepo.findByPoolIdAndPeriodFromAndPeriodTo(
                poolId, calc.getPeriodFrom(), calc.getPeriodTo());
        boolean hasDistributedAllocations = existing.stream().anyMatch(
                allocation -> allocation.getDistributionStatus() == ProfitAllocationStatus.DISTRIBUTED);
        if (hasDistributedAllocations) {
            throw new BusinessException(
                    "Cannot recalculate allocations after distribution has started",
                    "ALLOCATIONS_ALREADY_DISTRIBUTED");
        }
        if (!existing.isEmpty()) {
            allocationRepo.deleteByPoolIdAndPeriodFromAndPeriodTo(poolId, calc.getPeriodFrom(), calc.getPeriodTo());
        }

        List<PoolProfitAllocation> savedAllocations = new ArrayList<>();
        BigDecimal totalCustomerProfit = ZERO;
        BigDecimal totalBankProfit = ZERO;

        for (Map.Entry<Long, BigDecimal> entry : weightages.entrySet()) {
            Long accountId = entry.getKey();
            BigDecimal weight = entry.getValue();
            MudarabahAccount mudarabahAccount = mudarabahAccountRepo.findByAccountId(accountId)
                    .orElseThrow(() -> new ResourceNotFoundException("MudarabahAccount", "accountId", accountId));

            BigDecimal totalDailyProduct = defaultAmount(weightageRecordRepo.sumDailyProduct(
                    poolId, accountId, calc.getPeriodFrom(), calc.getPeriodTo()));
            BigDecimal grossShareBeforePer = preReservePool.multiply(weight)
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal perEffect = signedPerAdjustment.negate().multiply(weight)
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal irrDeduction = signedIrrAdjustment.multiply(weight)
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal netShareAfterReserves = grossShareBeforePer.add(perEffect).subtract(irrDeduction);

            BigDecimal customerProfitShare;
            BigDecimal bankProfitShare;
            if (netShareAfterReserves.compareTo(ZERO) >= 0) {
                customerProfitShare = netShareAfterReserves.multiply(mudarabahAccount.getProfitSharingRatioCustomer())
                        .divide(HUNDRED, 4, RoundingMode.HALF_UP);
                bankProfitShare = netShareAfterReserves.subtract(customerProfitShare);
            } else {
                // Loss allocation: check pool type for contract-type awareness
                // For Mudarabah: losses are 100% borne by capital provider (depositor)
                // For Musharakah: losses are proportional to capital contribution
                boolean isMusharakahPool = !poolAssetAssignmentRepo
                        .findByPoolIdAndContractTypeCode(poolId, "MUSHARAKAH").isEmpty();
                // Fallback: also check pool name and description for MUSHARAKAH indicator
                if (!isMusharakahPool) {
                    String poolName = pool.getName() != null ? pool.getName().toUpperCase(java.util.Locale.ROOT) : "";
                    String poolDesc = pool.getDescription() != null ? pool.getDescription().toUpperCase(java.util.Locale.ROOT) : "";
                    String poolCode = pool.getPoolCode() != null ? pool.getPoolCode().toUpperCase(java.util.Locale.ROOT) : "";
                    isMusharakahPool = poolName.contains("MUSHARAKAH")
                            || poolDesc.contains("MUSHARAKAH")
                            || poolCode.contains("MUSHARAKAH");
                }
                if (isMusharakahPool) {
                    // Musharakah: loss shared proportionally based on bank share percentage
                    BigDecimal bankShareRatio = pool.getProfitSharingRatioBank() != null
                            ? pool.getProfitSharingRatioBank().divide(HUNDRED, 4, RoundingMode.HALF_UP)
                            : ZERO;
                    bankProfitShare = netShareAfterReserves.multiply(bankShareRatio).setScale(4, RoundingMode.HALF_UP);
                    customerProfitShare = netShareAfterReserves.subtract(bankProfitShare);
                    log.info("Musharakah loss allocation: customer={}, bank={} (ratio={})",
                            customerProfitShare, bankProfitShare, bankShareRatio);
                } else {
                    // Mudarabah: 100% loss to capital provider (depositor), bank bears no loss
                    customerProfitShare = netShareAfterReserves;
                    bankProfitShare = ZERO;
                }
            }

            PoolProfitAllocation allocation = PoolProfitAllocation.builder()
                    .poolId(poolId)
                    .accountId(accountId)
                    .mudarabahAccountId(mudarabahAccount.getId())
                    .periodFrom(calc.getPeriodFrom())
                    .periodTo(calc.getPeriodTo())
                    .poolTotalDailyProduct(defaultAmount(weightageRecordRepo.sumPoolDailyProduct(
                            poolId, calc.getPeriodFrom(), calc.getPeriodTo())))
                    .totalDailyProduct(totalDailyProduct)
                    .weightagePercentage(weight)
                    .poolGrossProfit(calc.getNetDistributableProfit())
                    .grossShareBeforePer(grossShareBeforePer)
                    .perAdjustment(perEffect)
                    .irrDeduction(irrDeduction)
                    .netShareAfterReserves(netShareAfterReserves)
                    .customerPsr(mudarabahAccount.getProfitSharingRatioCustomer())
                    .customerProfitShare(customerProfitShare)
                    .bankProfitShare(bankProfitShare)
                    .effectiveProfitRate(calculateEffectiveRate(customerProfitShare, totalDailyProduct, periodDays))
                    .distributionStatus(ProfitAllocationStatus.CALCULATED)
                    .tenantId(mudarabahAccount.getTenantId())
                    .build();
            savedAllocations.add(allocationRepo.save(allocation));
            totalCustomerProfit = totalCustomerProfit.add(customerProfitShare);
            totalBankProfit = totalBankProfit.add(bankProfitShare);
        }

        BigDecimal roundingAdjustment = applyRoundingAdjustment(savedAllocations, distributablePool);
        BigDecimal sumOfAllocations = savedAllocations.stream()
                .map(PoolProfitAllocation::getNetShareAfterReserves)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal difference = distributablePool.subtract(sumOfAllocations);
        ConservationCheck conservationCheck = ConservationCheck.builder()
                .inputAmount(distributablePool)
                .sumOfAllocations(sumOfAllocations)
                .difference(difference)
                .isPassing(difference.abs().compareTo(TOLERANCE) <= 0)
                .tolerance(TOLERANCE)
                .status(difference.abs().compareTo(TOLERANCE) <= 0 ? "PASSED" : "ADJUSTED")
                .build();

        calc.setCalculationStatus(CalculationStatus.USED_IN_DISTRIBUTION);
        calculationRepo.save(calc);

        return buildBatch(pool, calc, signedPerAdjustment, signedIrrAdjustment, distributablePool,
                totalCustomerProfit, totalBankProfit, roundingAdjustment, conservationCheck, savedAllocations);
    }

    public ProfitAllocationBatch getBatch(Long batchId) {
        PoolProfitCalculation calc = calculationRepo.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", batchId));
        InvestmentPool pool = getPool(calc.getPoolId());
        List<PoolProfitAllocation> allocations = allocationRepo.findByPoolIdAndPeriodFromAndPeriodTo(
                calc.getPoolId(), calc.getPeriodFrom(), calc.getPeriodTo());
        BigDecimal totalCustomerProfit = allocations.stream()
                .map(PoolProfitAllocation::getCustomerProfitShare)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal totalBankProfit = allocations.stream()
                .map(PoolProfitAllocation::getBankProfitShare)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal sumOfAllocations = allocations.stream()
                .map(PoolProfitAllocation::getNetShareAfterReserves)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal difference = calc.getDepositorPool().subtract(sumOfAllocations);

        return buildBatch(pool, calc, ZERO, ZERO, calc.getDepositorPool(), totalCustomerProfit, totalBankProfit,
                ZERO, ConservationCheck.builder()
                        .inputAmount(calc.getDepositorPool())
                        .sumOfAllocations(sumOfAllocations)
                        .difference(difference)
                        .isPassing(difference.abs().compareTo(TOLERANCE) <= 0)
                        .tolerance(TOLERANCE)
                        .status(difference.abs().compareTo(TOLERANCE) <= 0 ? "PASSED" : "FAILED")
                        .build(),
                allocations);
    }

    public ProfitAllocationBatch recalculateAllocations(Long batchId) {
        PoolProfitCalculation calc = calculationRepo.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", batchId));
        if (calc.getCalculationStatus() != CalculationStatus.APPROVED
                && calc.getCalculationStatus() != CalculationStatus.USED_IN_DISTRIBUTION) {
            throw new BusinessException("Allocation recalculation requires an approved calculation", "INVALID_STATE");
        }
        calc.setCalculationStatus(CalculationStatus.APPROVED);
        calculationRepo.save(calc);
        return allocateProfit(calc.getPoolId(), batchId);
    }

    public void approveAllocations(Long batchId, String approvedBy) {
        PoolProfitCalculation calc = calculationRepo.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", batchId));
        approveAllocations(calc.getPoolId(), calc.getPeriodFrom(), calc.getPeriodTo(), approvedBy);
    }

    public void approveAllocations(Long poolId, LocalDate periodFrom, LocalDate periodTo, String approvedBy) {
        List<PoolProfitAllocation> allocations = allocationRepo
                .findByPoolIdAndPeriodFromAndPeriodTo(poolId, periodFrom, periodTo);
        if (allocations.isEmpty()) {
            throw new BusinessException("No calculated allocations found for approval", "ALLOCATIONS_NOT_FOUND");
        }

        boolean anyCreatedByNull = allocations.stream()
                .anyMatch(allocation -> allocation.getCreatedBy() == null);
        if (anyCreatedByNull) {
            log.warn("AUDIT: Some allocations have null createdBy. Four-eyes check will be skipped for those, "
                    + "but this should be investigated. poolId={}, period={}-{}", poolId, periodFrom, periodTo);
        }
        boolean makerCheckerViolation = allocations.stream()
                .map(PoolProfitAllocation::getCreatedBy)
                .filter(java.util.Objects::nonNull)
                .anyMatch(approvedBy::equals);
        if (makerCheckerViolation) {
            throw new BusinessException(
                    "Four-eyes principle violated: allocation approver cannot be the allocator",
                    "FOUR_EYES_VIOLATION");
        }

        for (PoolProfitAllocation allocation : allocations) {
            if (allocation.getDistributionStatus() == ProfitAllocationStatus.CALCULATED) {
                allocation.setDistributionStatus(ProfitAllocationStatus.APPROVED);
                allocationRepo.save(allocation);
            }
        }

        log.info("Allocations approved: pool={}, period={}-{}, approvedBy={}",
                poolId, periodFrom, periodTo, approvedBy);
    }

    @Transactional(readOnly = true)
    public List<ProfitAllocationBatch> getAllocationsByPool(Long poolId) {
        return calculationRepo.findByPoolIdOrderByPeriodFromDesc(poolId).stream()
                .filter(calc -> !allocationRepo.findByPoolIdAndPeriodFromAndPeriodTo(
                        poolId, calc.getPeriodFrom(), calc.getPeriodTo()).isEmpty())
                .map(calc -> getBatch(calc.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PoolProfitAllocationResponse> getAccountAllocationHistory(Long accountId) {
        return allocationRepo.findByAccountIdOrderByPeriodDesc(accountId).stream()
                .map(this::toResponse)
                .toList();
    }

    public BigDecimal applyRoundingAdjustment(List<PoolProfitAllocation> allocations, BigDecimal expectedTotal) {
        if (allocations.isEmpty()) {
            return ZERO;
        }
        BigDecimal currentTotal = allocations.stream()
                .map(PoolProfitAllocation::getNetShareAfterReserves)
                .reduce(ZERO, BigDecimal::add);
        // Apply rounding adjustment to BANK share of largest allocation to preserve customer PSR integrity
        BigDecimal adjustment = expectedTotal.subtract(currentTotal);
        if (adjustment.abs().compareTo(TOLERANCE) <= 0) {
            return ZERO;
        }
        if (adjustment.abs().compareTo(new BigDecimal("0.10")) > 0) {
            log.warn("Large rounding adjustment {} detected in profit allocation - may indicate calculation error", adjustment);
        }
        // Adjust bank profit share (not customer) to maintain PSR integrity
        // Sort by bank share descending to absorb from those with the most room
        List<PoolProfitAllocation> sorted = new java.util.ArrayList<>(allocations);
        sorted.sort(Comparator.comparing((PoolProfitAllocation a) -> a.getBankProfitShare()).reversed());

        BigDecimal remainingAdjustment = adjustment;
        for (PoolProfitAllocation alloc : sorted) {
            if (remainingAdjustment.compareTo(ZERO) == 0) break;

            BigDecimal newBankShare = alloc.getBankProfitShare().add(remainingAdjustment);
            if (newBankShare.compareTo(ZERO) >= 0) {
                // This allocation can absorb the entire remaining adjustment
                alloc.setNetShareAfterReserves(alloc.getNetShareAfterReserves().add(remainingAdjustment));
                alloc.setBankProfitShare(newBankShare);
                allocationRepo.save(alloc);
                remainingAdjustment = ZERO;
            } else {
                // This allocation can only absorb part - reduce its bank share to zero
                BigDecimal absorbed = alloc.getBankProfitShare();
                alloc.setNetShareAfterReserves(alloc.getNetShareAfterReserves().subtract(absorbed));
                alloc.setBankProfitShare(ZERO);
                allocationRepo.save(alloc);
                remainingAdjustment = remainingAdjustment.add(absorbed);
            }
        }
        if (remainingAdjustment.compareTo(ZERO) != 0) {
            // Residual that could not be absorbed by bank shares - apply to customer share of largest
            log.warn("AUDIT: Rounding adjustment residual {} could not be fully absorbed by bank shares. "
                    + "Applying remainder to customer share of largest allocation.", remainingAdjustment);
            PoolProfitAllocation largest = sorted.getFirst();
            largest.setNetShareAfterReserves(largest.getNetShareAfterReserves().add(remainingAdjustment));
            largest.setCustomerProfitShare(largest.getCustomerProfitShare().add(remainingAdjustment));
            allocationRepo.save(largest);
        }
        return adjustment;
    }

    private PoolProfitCalculation getApprovedOrUsedCalculation(Long calculationId) {
        PoolProfitCalculation calc = calculationRepo.findById(calculationId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolProfitCalculation", "id", calculationId));
        if (calc.getCalculationStatus() != CalculationStatus.APPROVED
                && calc.getCalculationStatus() != CalculationStatus.USED_IN_DISTRIBUTION) {
            throw new BusinessException(
                    "Calculation must be APPROVED before allocation, current status: " + calc.getCalculationStatus(),
                    "INVALID_STATE");
        }
        return calc;
    }

    private InvestmentPool getPool(Long poolId) {
        return poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
    }

    private ProfitAllocationBatch buildBatch(InvestmentPool pool,
                                             PoolProfitCalculation calc,
                                             BigDecimal signedPerAdjustment,
                                             BigDecimal signedIrrAdjustment,
                                             BigDecimal distributablePool,
                                             BigDecimal totalCustomerProfit,
                                             BigDecimal totalBankProfit,
                                             BigDecimal roundingAdjustment,
                                             ConservationCheck conservationCheck,
                                             List<PoolProfitAllocation> allocations) {
        List<BigDecimal> rates = allocations.stream()
                .map(PoolProfitAllocation::getEffectiveProfitRate)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
        BigDecimal averageRate = rates.isEmpty()
                ? ZERO
                : rates.stream().reduce(ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(rates.size()), 4, RoundingMode.HALF_UP);

        return ProfitAllocationBatch.builder()
                .batchId(calc.getId())
                .poolId(pool.getId())
                .poolCode(pool.getPoolCode())
                .profitCalculationId(calc.getId())
                .periodFrom(calc.getPeriodFrom())
                .periodTo(calc.getPeriodTo())
                .depositorPoolBeforeReserves(calc.getDepositorPool())
                .perAdjustment(signedPerAdjustment)
                .irrDeduction(signedIrrAdjustment)
                .depositorPoolAfterReserves(distributablePool)
                .participantCount(allocations.size())
                .totalCustomerProfit(totalCustomerProfit)
                .totalBankProfit(totalBankProfit)
                .averageEffectiveRate(averageRate)
                .minimumEffectiveRate(rates.isEmpty() ? ZERO : rates.getFirst())
                .maximumEffectiveRate(rates.isEmpty() ? ZERO : rates.getLast())
                .roundingAdjustment(roundingAdjustment)
                .isLoss(calc.isLoss())
                .status(resolveBatchStatus(allocations))
                .conservationCheck(conservationCheck)
                .allocations(allocations.stream().map(this::toResponse).toList())
                .build();
    }

    private String resolveBatchStatus(List<PoolProfitAllocation> allocations) {
        if (allocations.isEmpty()) {
            return "EMPTY";
        }
        if (allocations.stream().allMatch(allocation -> allocation.getDistributionStatus() == ProfitAllocationStatus.DISTRIBUTED)) {
            return "DISTRIBUTED";
        }
        if (allocations.stream().allMatch(allocation -> allocation.getDistributionStatus() == ProfitAllocationStatus.APPROVED)) {
            return "APPROVED";
        }
        return "CALCULATED";
    }

    private BigDecimal calculateEffectiveRate(BigDecimal profitShare, BigDecimal totalDailyProduct, long periodDays) {
        if (totalDailyProduct == null || totalDailyProduct.compareTo(ZERO) <= 0 || periodDays <= 0) {
            return ZERO;
        }
        BigDecimal averageBalance = totalDailyProduct.divide(BigDecimal.valueOf(periodDays), 4, RoundingMode.HALF_UP);
        if (averageBalance.compareTo(ZERO) <= 0) {
            return ZERO;
        }
        return profitShare.multiply(BigDecimal.valueOf(365))
                .divide(averageBalance.multiply(BigDecimal.valueOf(periodDays)), 4, RoundingMode.HALF_UP)
                .multiply(HUNDRED);
    }

    private PoolProfitAllocationResponse toResponse(PoolProfitAllocation allocation) {
        MudarabahAccount account = mudarabahAccountRepo.findById(allocation.getMudarabahAccountId()).orElse(null);
        return PoolProfitAllocationResponse.builder()
                .id(allocation.getId())
                .poolId(allocation.getPoolId())
                .accountId(allocation.getAccountId())
                .accountNumber(account != null && account.getAccount() != null ? account.getAccount().getAccountNumber() : null)
                .periodFrom(allocation.getPeriodFrom())
                .periodTo(allocation.getPeriodTo())
                .totalDailyProduct(allocation.getTotalDailyProduct())
                .weightagePercentage(allocation.getWeightagePercentage())
                .poolGrossProfit(allocation.getPoolGrossProfit())
                .grossShareBeforePer(allocation.getGrossShareBeforePer())
                .perAdjustment(allocation.getPerAdjustment())
                .irrDeduction(allocation.getIrrDeduction())
                .netShareAfterReserves(allocation.getNetShareAfterReserves())
                .customerPsr(allocation.getCustomerPsr())
                .customerProfitShare(allocation.getCustomerProfitShare())
                .bankProfitShare(allocation.getBankProfitShare())
                .effectiveProfitRate(allocation.getEffectiveProfitRate())
                .distributionStatus(allocation.getDistributionStatus().name())
                .distributedAt(allocation.getDistributedAt())
                .journalRef(allocation.getJournalRef())
                .build();
    }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value : ZERO;
    }
}
