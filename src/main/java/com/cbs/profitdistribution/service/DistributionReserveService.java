package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IrrTransaction;
import com.cbs.gl.islamic.entity.PerTransaction;
import com.cbs.gl.islamic.repository.IrrTransactionRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.PerTransactionRepository;
import com.cbs.gl.islamic.service.IrrService;
import com.cbs.gl.islamic.service.PerService;
import com.cbs.profitdistribution.dto.ReserveImpactAnalysis;
import com.cbs.profitdistribution.dto.ReserveExecutionResult;
import com.cbs.profitdistribution.dto.ReserveExecutionSummary;
import com.cbs.profitdistribution.entity.DistributionReserveTransaction;
import com.cbs.profitdistribution.entity.DistributionReserveType;
import com.cbs.profitdistribution.entity.ReserveTransactionType;
import com.cbs.profitdistribution.repository.DistributionReserveTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DistributionReserveService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final PerService perService;
    private final IrrService irrService;
    private final PerTransactionRepository perTransactionRepository;
    private final IrrTransactionRepository irrTransactionRepository;
    private final DistributionReserveTransactionRepository reserveTransactionRepo;
    private final InvestmentPoolRepository poolRepo;
    private final CurrentActorProvider actorProvider;

    /**
     * Executes the Profit Equalization Reserve (PER) adjustment for a distribution run.
     * PER smooths profit rates across periods by retaining excess or releasing shortfall.
     */
    public ReserveExecutionResult executePer(Long poolId, BigDecimal depositorPool,
                                              LocalDate periodFrom, LocalDate periodTo,
                                              Long distributionRunId) {

        PerCalculationResult perResult = perService.calculatePerAdjustment(
                poolId, depositorPool, periodFrom, periodTo);

        if (perResult == null) {
            log.warn("PER calculation returned null for pool {}. Skipping PER adjustment.", poolId);
            return ReserveExecutionResult.builder()
                    .reserveType("PER").transactionType("NONE")
                    .adjustmentAmount(BigDecimal.ZERO)
                    .amountBeforeReserve(depositorPool).amountAfterReserve(depositorPool)
                    .reserveBalanceAfter(BigDecimal.ZERO).build();
        }

        BigDecimal adjustment = defaultAmount(perResult.getAdjustmentAmount());
        BigDecimal balanceBefore = defaultAmount(perResult.getPerBalanceBefore());
        BigDecimal balanceAfter = balanceBefore;

        // Validate PER retention doesn't exceed pool-configured cap (SSB-configurable per pool)
        InvestmentPool perPool = poolRepo.findById(poolId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "InvestmentPool", "id", poolId));
        BigDecimal maxPerPct = perPool.getMaxPerRetentionPct();
        BigDecimal maxPerRetention = depositorPool.multiply(maxPerPct)
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        if (adjustment.compareTo(maxPerRetention) > 0) {
            log.warn("PER retention {} exceeds {}% of depositor pool {}. Capping to {}",
                    adjustment, maxPerPct, depositorPool, maxPerRetention);
            adjustment = maxPerRetention;
        }
        // Recalculate afterPer using the potentially capped adjustment amount (not from perResult which may use uncapped)
        BigDecimal afterPer = depositorPool.subtract(adjustment);
        String txnType = "NONE";

        if ("RETENTION".equals(perResult.getAdjustmentType()) && adjustment.compareTo(ZERO) > 0) {
            // Retain excess profit into PER
            perService.retainToPer(poolId, adjustment, periodFrom, periodTo,
                    depositorPool, perResult.getActualProfitRate(), perResult.getSmoothedProfitRate());
            txnType = "RETENTION";
                        balanceAfter = balanceBefore.add(adjustment);
        } else if ("RELEASE".equals(perResult.getAdjustmentType()) && adjustment.compareTo(ZERO) > 0) {
            // Release from PER to supplement low profit
            perService.releaseFromPer(poolId, adjustment, periodFrom, periodTo,
                    depositorPool, perResult.getActualProfitRate(), perResult.getSmoothedProfitRate(),
                    actorProvider.getCurrentActor());
            txnType = "RELEASE";
            afterPer = depositorPool.add(adjustment);
                        balanceAfter = balanceBefore.subtract(adjustment);
        }

        // Record the distribution reserve transaction
        Long transactionId = null;
        String journalRef = null;
        if (!"NONE".equals(txnType)) {
            PerTransaction perTransaction = perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId).orElse(null);
            DistributionReserveTransaction drt = DistributionReserveTransaction.builder()
                    .distributionRunId(distributionRunId)
                    .poolId(poolId)
                    .reserveType(DistributionReserveType.PER)
                    .transactionType("RETENTION".equals(txnType)
                            ? ReserveTransactionType.RETENTION
                            : ReserveTransactionType.RELEASE)
                    .amount(adjustment)
                    .balanceBefore(balanceBefore)
                    .balanceAfter(balanceAfter)
                    .triggerReason(String.format("PER %s: actual rate %s vs target, adjustment %s",
                            txnType, perResult.getActualProfitRate(), adjustment))
                    .perTransactionId(perTransaction != null ? perTransaction.getId() : null)
                    .journalRef(perTransaction != null ? perTransaction.getJournalRef() : null)
                    .amountBeforeReserve(depositorPool)
                    .amountAfterReserve(afterPer)
                    .effectiveRateBefore(perResult.getActualProfitRate())
                    .effectiveRateAfter(perResult.getSmoothedProfitRate())
                    .processedAt(LocalDateTime.now())
                    .processedBy(actorProvider.getCurrentActor())
                    .tenantId(perPool.getTenantId())
                    .build();
            drt = reserveTransactionRepo.save(drt);
            transactionId = drt.getId();
            journalRef = drt.getJournalRef();
        }

        log.info("PER executed: pool={}, type={}, adjustment={}, before={}, after={}",
                poolId, txnType, adjustment, depositorPool, afterPer);

        return ReserveExecutionResult.builder()
                .reserveType("PER")
                .transactionType(txnType)
                .adjustmentAmount(adjustment)
                .amountBeforeReserve(depositorPool)
                .amountAfterReserve(afterPer)
                .transactionId(transactionId)
                .journalRef(journalRef)
                .reserveBalanceAfter(balanceAfter)
                .build();
    }

    /**
     * Executes the Investment Risk Reserve (IRR) adjustment for a distribution run.
     * IRR retains from profit for future loss absorption, or releases to absorb actual losses.
     */
    public ReserveExecutionResult executeIrr(Long poolId, BigDecimal depositorPoolAfterPer,
                                              boolean isLoss, LocalDate periodFrom, LocalDate periodTo,
                                              Long distributionRunId) {

        BigDecimal afterIrr = depositorPoolAfterPer;
        BigDecimal adjustment = ZERO;
        String txnType = "NONE";
        BigDecimal balanceBefore = irrService.getIrrBalance(poolId);
        BigDecimal balanceAfter = balanceBefore;
        InvestmentPool irrPool = poolRepo.findById(poolId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "InvestmentPool", "id", poolId));

        if (!isLoss && depositorPoolAfterPer.compareTo(ZERO) > 0) {
            // Profit scenario: retain a portion into IRR
            IrrRetentionResult result = irrService.calculateIrrRetention(
                    poolId, depositorPoolAfterPer, periodFrom, periodTo);
            adjustment = defaultAmount(result.getAdjustmentAmount());

            // Validate IRR retention doesn't exceed pool-configured cap (SSB-configurable per pool)
            BigDecimal maxIrrPct = irrPool.getMaxIrrRetentionPct();
            BigDecimal maxIrrRetention = depositorPoolAfterPer.multiply(maxIrrPct)
                    .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            if (adjustment.compareTo(maxIrrRetention) > 0) {
                log.warn("IRR retention {} exceeds {}% of post-PER pool {}. Capping to {}",
                        adjustment, maxIrrPct, depositorPoolAfterPer, maxIrrRetention);
                adjustment = maxIrrRetention;
            }

            if (adjustment.compareTo(ZERO) > 0) {
                irrService.retainToIrr(poolId, adjustment, periodFrom, periodTo);
                txnType = "RETENTION";
                                afterIrr = depositorPoolAfterPer.subtract(adjustment);
                                balanceAfter = balanceBefore.add(adjustment);
            }
        } else if (isLoss) {
            // Loss scenario: release IRR to absorb loss
            BigDecimal lossAmount = depositorPoolAfterPer.abs();
            IrrReleaseResult result = irrService.calculateIrrRelease(poolId, lossAmount);

            // Validate and cap IRR release to available balance
            BigDecimal irrBalance = irrService.getIrrBalance(poolId);
            BigDecimal absorbedAmount = result.getAbsorbed();
            if (absorbedAmount != null && irrBalance != null && absorbedAmount.compareTo(irrBalance) > 0) {
                log.warn("IRR release {} exceeds available balance {}. Capping to available balance.", absorbedAmount, irrBalance);
                absorbedAmount = irrBalance;
            }

            if (result.getTriggered() && absorbedAmount != null && absorbedAmount.compareTo(ZERO) > 0) {
                irrService.releaseIrrForLossAbsorption(
                        poolId, absorbedAmount, "Pool loss absorption", actorProvider.getCurrentActor());
                adjustment = absorbedAmount;
                txnType = "RELEASE";
                afterIrr = depositorPoolAfterPer.add(absorbedAmount);
                                balanceAfter = balanceBefore.subtract(adjustment);
            }
        }

        // Record the distribution reserve transaction
        Long transactionId = null;
        String journalRef = null;
        if (!"NONE".equals(txnType)) {
            IrrTransaction irrTransaction = irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId).orElse(null);
            DistributionReserveTransaction drt = DistributionReserveTransaction.builder()
                    .distributionRunId(distributionRunId)
                    .poolId(poolId)
                    .reserveType(DistributionReserveType.IRR)
                    .transactionType("RETENTION".equals(txnType)
                            ? ReserveTransactionType.RETENTION
                            : ReserveTransactionType.RELEASE)
                    .amount(adjustment)
                    .balanceBefore(balanceBefore)
                    .balanceAfter(balanceAfter)
                    .triggerReason(isLoss
                            ? "IRR release for loss absorption"
                            : "IRR retention from distributable profit")
                    .irrTransactionId(irrTransaction != null ? irrTransaction.getId() : null)
                    .journalRef(irrTransaction != null ? irrTransaction.getJournalRef() : null)
                    .amountBeforeReserve(depositorPoolAfterPer)
                    .amountAfterReserve(afterIrr)
                    .processedAt(LocalDateTime.now())
                    .processedBy(actorProvider.getCurrentActor())
                    .tenantId(irrPool.getTenantId())
                    .build();
            drt = reserveTransactionRepo.save(drt);
            transactionId = drt.getId();
            journalRef = drt.getJournalRef();
        }

        log.info("IRR executed: pool={}, type={}, adjustment={}, before={}, after={}",
                poolId, txnType, adjustment, depositorPoolAfterPer, afterIrr);

        return ReserveExecutionResult.builder()
                .reserveType("IRR")
                .transactionType(txnType)
                .adjustmentAmount(adjustment)
                .amountBeforeReserve(depositorPoolAfterPer)
                .amountAfterReserve(afterIrr)
                .transactionId(transactionId)
                .journalRef(journalRef)
                .reserveBalanceAfter(balanceAfter)
                .build();
    }

    /**
     * Orchestrates both PER and IRR reserve adjustments in sequence (PER first, then IRR).
     */
    public ReserveExecutionSummary executeReserves(Long poolId, BigDecimal depositorPool,
                                                    boolean isLoss, LocalDate periodFrom,
                                                    LocalDate periodTo, Long distributionRunId) {

        // PER first, then IRR on the post-PER amount
        ReserveExecutionResult perResult = executePer(
                poolId, depositorPool, periodFrom, periodTo, distributionRunId);

        ReserveExecutionResult irrResult = executeIrr(
                poolId, perResult.getAmountAfterReserve(), isLoss,
                periodFrom, periodTo, distributionRunId);

        // Enforce total reserves don't consume more than pool-configured cap (SSB-configurable per pool)
        BigDecimal totalReserved = depositorPool.subtract(irrResult.getAmountAfterReserve());
        InvestmentPool reservePool = poolRepo.findById(poolId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "InvestmentPool", "id", poolId));
        BigDecimal maxTotalPct = reservePool.getMaxTotalReservePct();
        BigDecimal maxTotalReserve = depositorPool.multiply(maxTotalPct)
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        if (totalReserved.compareTo(maxTotalReserve) > 0) {
            log.error("ALERT: Total reserves ({}) exceed {}% cap of depositor pool ({}).",
                    totalReserved, maxTotalPct, depositorPool);
            throw new com.cbs.common.exception.BusinessException(
                    "Total reserves (" + totalReserved.toPlainString()
                            + ") exceed " + maxTotalPct.toPlainString() + "% of depositor pool ("
                            + depositorPool.toPlainString()
                            + "). Review PER/IRR policies before proceeding.",
                    "RESERVE_CAP_EXCEEDED");
        }

        BigDecimal totalImpact = depositorPool.subtract(irrResult.getAmountAfterReserve());
        String poolCurrency = reservePool.getCurrencyCode() != null
                ? reservePool.getCurrencyCode() : "N/A";
        String desc = String.format("PER %s %s %s, IRR %s %s %s",
                perResult.getTransactionType(), poolCurrency, perResult.getAdjustmentAmount(),
                irrResult.getTransactionType(), poolCurrency, irrResult.getAdjustmentAmount());

        log.info("Reserves executed: pool={}, totalImpact={}, description={}",
                poolId, totalImpact, desc);

        return ReserveExecutionSummary.builder()
                .perResult(perResult)
                .irrResult(irrResult)
                .originalDepositorPool(depositorPool)
                .afterPer(perResult.getAmountAfterReserve())
                .afterIrr(irrResult.getAmountAfterReserve())
                .finalDistributableAmount(irrResult.getAmountAfterReserve())
                .totalReserveImpact(totalImpact)
                .smoothingDescription(desc)
                .build();
    }

    /**
     * Retrieves all reserve transactions for a given distribution run.
     */
    @Transactional(readOnly = true)
    public List<DistributionReserveTransaction> getReserveTransactions(Long runId) {
        return reserveTransactionRepo.findByDistributionRunId(runId);
    }

    @Transactional(readOnly = true)
    public ReserveImpactAnalysis getReserveImpact(Long runId) {
        List<DistributionReserveTransaction> transactions = reserveTransactionRepo.findByDistributionRunId(runId);
        DistributionReserveTransaction per = transactions.stream()
                .filter(tx -> tx.getReserveType() == DistributionReserveType.PER)
                .findFirst()
                .orElse(null);
        DistributionReserveTransaction irr = transactions.stream()
                .filter(tx -> tx.getReserveType() == DistributionReserveType.IRR)
                .findFirst()
                .orElse(null);

        BigDecimal original = per != null
                ? per.getAmountBeforeReserve()
                : irr != null ? irr.getAmountBeforeReserve() : BigDecimal.ZERO;
        BigDecimal afterPer = per != null ? per.getAmountAfterReserve() : original;
        BigDecimal afterIrr = irr != null ? irr.getAmountAfterReserve() : afterPer;
        BigDecimal totalRetained = transactions.stream()
                .filter(tx -> tx.getTransactionType() == ReserveTransactionType.RETENTION)
                .map(DistributionReserveTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReleased = transactions.stream()
                .filter(tx -> tx.getTransactionType() == ReserveTransactionType.RELEASE)
                .map(DistributionReserveTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReserveImpactAnalysis.builder()
                .distributionRunId(runId)
                .originalAmount(original)
                .afterPer(afterPer)
                .afterIrr(afterIrr)
                .finalAmount(afterIrr)
                .totalRetained(totalRetained)
                .totalReleased(totalReleased)
                .netImpact(original.subtract(afterIrr))
                .transactions(transactions.stream()
                        .map(this::toResult)
                        .toList())
                .build();
    }

    public PerService getPerService() {
        return perService;
    }

    public IrrService getIrrService() {
        return irrService;
    }

    private ReserveExecutionResult toResult(DistributionReserveTransaction transaction) {
        return ReserveExecutionResult.builder()
                .reserveType(transaction.getReserveType().name())
                .transactionType(transaction.getTransactionType().name())
                .adjustmentAmount(transaction.getAmount())
                .amountBeforeReserve(transaction.getAmountBeforeReserve())
                .amountAfterReserve(transaction.getAmountAfterReserve())
                .transactionId(transaction.getId())
                .journalRef(transaction.getJournalRef())
                .reserveBalanceAfter(transaction.getBalanceAfter())
                .build();
    }

        private BigDecimal defaultAmount(BigDecimal value) {
                return value != null ? value : ZERO;
        }
}
