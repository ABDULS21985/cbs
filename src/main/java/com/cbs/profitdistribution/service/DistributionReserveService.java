package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.service.IrrService;
import com.cbs.gl.islamic.service.PerService;
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

        BigDecimal adjustment = perResult.getAdjustmentAmount();
        BigDecimal afterPer = perResult.getDistributedProfit();
        String txnType = "NONE";

        if ("RETENTION".equals(perResult.getAdjustmentType()) && adjustment.compareTo(ZERO) > 0) {
            // Retain excess profit into PER
            perService.retainToPer(poolId, adjustment, periodFrom, periodTo,
                    depositorPool, perResult.getActualProfitRate(), perResult.getSmoothedProfitRate());
            txnType = "RETENTION";
        } else if ("RELEASE".equals(perResult.getAdjustmentType()) && adjustment.compareTo(ZERO) > 0) {
            // Release from PER to supplement low profit
            perService.releaseFromPer(poolId, adjustment, periodFrom, periodTo,
                    depositorPool, perResult.getActualProfitRate(), perResult.getSmoothedProfitRate(),
                    actorProvider.getCurrentActor());
            txnType = "RELEASE";
            afterPer = depositorPool.add(adjustment);
        }

        // Record the distribution reserve transaction
        if (!"NONE".equals(txnType)) {
            DistributionReserveTransaction drt = DistributionReserveTransaction.builder()
                    .distributionRunId(distributionRunId)
                    .poolId(poolId)
                    .reserveType(DistributionReserveType.PER)
                    .transactionType("RETENTION".equals(txnType)
                            ? ReserveTransactionType.RETENTION
                            : ReserveTransactionType.RELEASE)
                    .amount(adjustment)
                    .balanceBefore(perResult.getPerBalanceBefore())
                    .balanceAfter(perResult.getPerBalanceAfter())
                    .triggerReason(String.format("PER %s: actual rate %s vs target, adjustment %s",
                            txnType, perResult.getActualProfitRate(), adjustment))
                    .amountBeforeReserve(depositorPool)
                    .amountAfterReserve(afterPer)
                    .processedAt(LocalDateTime.now())
                    .processedBy(actorProvider.getCurrentActor())
                    .build();
            reserveTransactionRepo.save(drt);
        }

        log.info("PER executed: pool={}, type={}, adjustment={}, before={}, after={}",
                poolId, txnType, adjustment, depositorPool, afterPer);

        return ReserveExecutionResult.builder()
                .reserveType("PER")
                .transactionType(txnType)
                .adjustmentAmount(adjustment)
                .amountBeforeReserve(depositorPool)
                .amountAfterReserve(afterPer)
                .reserveBalanceAfter(perResult.getPerBalanceAfter())
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

        if (!isLoss && depositorPoolAfterPer.compareTo(ZERO) > 0) {
            // Profit scenario: retain a portion into IRR
            IrrRetentionResult result = irrService.calculateIrrRetention(
                    poolId, depositorPoolAfterPer, periodFrom, periodTo);
            adjustment = result.getAdjustmentAmount();

            if (adjustment.compareTo(ZERO) > 0) {
                irrService.retainToIrr(poolId, adjustment, periodFrom, periodTo);
                txnType = "RETENTION";
                afterIrr = result.getDistributableProfitAfterRetention();
                balanceAfter = result.getIrrBalanceAfter();
            }
        } else if (isLoss) {
            // Loss scenario: release IRR to absorb loss
            BigDecimal lossAmount = depositorPoolAfterPer.abs();
            IrrReleaseResult result = irrService.calculateIrrRelease(poolId, lossAmount);

            if (result.getTriggered() && result.getAbsorbed().compareTo(ZERO) > 0) {
                irrService.releaseIrrForLossAbsorption(
                        poolId, lossAmount, "Pool loss absorption", actorProvider.getCurrentActor());
                adjustment = result.getAbsorbed();
                txnType = "RELEASE";
                afterIrr = depositorPoolAfterPer.add(result.getAbsorbed());
                balanceAfter = result.getIrrBalanceAfter();
            }
        }

        // Record the distribution reserve transaction
        if (!"NONE".equals(txnType)) {
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
                    .amountBeforeReserve(depositorPoolAfterPer)
                    .amountAfterReserve(afterIrr)
                    .processedAt(LocalDateTime.now())
                    .processedBy(actorProvider.getCurrentActor())
                    .build();
            reserveTransactionRepo.save(drt);
        }

        log.info("IRR executed: pool={}, type={}, adjustment={}, before={}, after={}",
                poolId, txnType, adjustment, depositorPoolAfterPer, afterIrr);

        return ReserveExecutionResult.builder()
                .reserveType("IRR")
                .transactionType(txnType)
                .adjustmentAmount(adjustment)
                .amountBeforeReserve(depositorPoolAfterPer)
                .amountAfterReserve(afterIrr)
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

        BigDecimal totalImpact = depositorPool.subtract(irrResult.getAmountAfterReserve());
        String desc = String.format("PER %s SAR %s, IRR %s SAR %s",
                perResult.getTransactionType(), perResult.getAdjustmentAmount(),
                irrResult.getTransactionType(), irrResult.getAdjustmentAmount());

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
}
