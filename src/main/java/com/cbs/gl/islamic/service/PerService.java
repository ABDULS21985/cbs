package com.cbs.gl.islamic.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.dto.PerDashboard;
import com.cbs.gl.islamic.dto.PerPolicyRequest;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.PerPolicy;
import com.cbs.gl.islamic.entity.PerRetentionAllocation;
import com.cbs.gl.islamic.entity.PerTransaction;
import com.cbs.gl.islamic.entity.PerTransactionType;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.PerPolicyRepository;
import com.cbs.gl.islamic.repository.PerTransactionRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.shariah.repository.FatwaRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PerService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal INFINITE_CAP = new BigDecimal("999999999999.99");

    private final PerPolicyRepository perPolicyRepository;
    private final PerTransactionRepository perTransactionRepository;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final InvestmentPoolParticipantRepository participantRepository;
    private final FatwaRecordRepository fatwaRecordRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PerPolicy createPolicy(PerPolicyRequest request) {
        if (perPolicyRepository.findByPolicyCode(request.getPolicyCode()).isPresent()) {
            throw new BusinessException("PER policy already exists: " + request.getPolicyCode(), "DUPLICATE_PER_POLICY");
        }
        InvestmentPool pool = getPool(request.getInvestmentPoolId());
        validateFatwa(request.getFatwaId());

        PerPolicy policy = PerPolicy.builder()
                .policyCode(request.getPolicyCode().trim().toUpperCase())
                .name(request.getName())
                .nameAr(request.getNameAr())
                .investmentPoolId(request.getInvestmentPoolId())
                .retentionRate(scaleRate(request.getRetentionRate()))
                .maximumRetentionRate(scaleRate(request.getMaximumRetentionRate()))
                .releaseThreshold(scaleRate(request.getReleaseThreshold() != null ? request.getReleaseThreshold() : request.getTargetDistributionRate()))
                .targetDistributionRate(scaleRate(request.getTargetDistributionRate()))
                .maximumReserveBalance(scaleMoney(request.getMaximumReserveBalance()))
                .maximumReservePercentOfPool(scaleRate(request.getMaximumReservePercentOfPool()))
                .retentionFromBankShare(Boolean.TRUE.equals(request.getRetentionFromBankShare()))
                .retentionAllocation(request.getRetentionAllocation() != null
                        ? request.getRetentionAllocation()
                        : PerRetentionAllocation.FROM_GROSS_BEFORE_SPLIT)
                .approvalRequired(Boolean.TRUE.equals(request.getApprovalRequired()))
                .fatwaId(request.getFatwaId())
                .ssbReviewDate(request.getSsbReviewDate())
                .nextSsbReviewDate(request.getNextSsbReviewDate())
                .status(ReservePolicyStatus.ACTIVE)
                .effectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now())
                .effectiveTo(request.getEffectiveTo())
                .tenantId(pool.getTenantId())
                .build();
        PerPolicy saved = perPolicyRepository.save(policy);
        pool.setPerPolicyId(saved.getId());
        investmentPoolRepository.save(pool);
        return saved;
    }

    @Transactional
    public PerPolicy updatePolicy(Long policyId, PerPolicyRequest request) {
        PerPolicy policy = getPolicy(policyId);
        validateFatwa(request.getFatwaId());
        if (request.getName() != null) {
            policy.setName(request.getName());
        }
        if (request.getNameAr() != null) {
            policy.setNameAr(request.getNameAr());
        }
        if (request.getRetentionRate() != null) {
            policy.setRetentionRate(scaleRate(request.getRetentionRate()));
        }
        if (request.getMaximumRetentionRate() != null) {
            policy.setMaximumRetentionRate(scaleRate(request.getMaximumRetentionRate()));
        }
        if (request.getReleaseThreshold() != null) {
            policy.setReleaseThreshold(scaleRate(request.getReleaseThreshold()));
        }
        if (request.getTargetDistributionRate() != null) {
            policy.setTargetDistributionRate(scaleRate(request.getTargetDistributionRate()));
        }
        if (request.getMaximumReserveBalance() != null) {
            policy.setMaximumReserveBalance(scaleMoney(request.getMaximumReserveBalance()));
        }
        if (request.getMaximumReservePercentOfPool() != null) {
            policy.setMaximumReservePercentOfPool(scaleRate(request.getMaximumReservePercentOfPool()));
        }
        if (request.getRetentionFromBankShare() != null) {
            policy.setRetentionFromBankShare(request.getRetentionFromBankShare());
        }
        if (request.getRetentionAllocation() != null) {
            policy.setRetentionAllocation(request.getRetentionAllocation());
        }
        if (request.getApprovalRequired() != null) {
            policy.setApprovalRequired(request.getApprovalRequired());
        }
        if (request.getFatwaId() != null) {
            policy.setFatwaId(request.getFatwaId());
        }
        policy.setSsbReviewDate(request.getSsbReviewDate());
        policy.setNextSsbReviewDate(request.getNextSsbReviewDate());
        if (request.getEffectiveFrom() != null) {
            policy.setEffectiveFrom(request.getEffectiveFrom());
        }
        policy.setEffectiveTo(request.getEffectiveTo());
        return perPolicyRepository.save(policy);
    }

    public PerPolicy getPolicy(Long policyId) {
        return perPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("PerPolicy", "id", policyId));
    }

    public PerPolicy getPolicyByPoolCode(String poolCode) {
        InvestmentPool pool = investmentPoolRepository.findByPoolCode(poolCode)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "poolCode", poolCode));
        return getActivePolicy(pool.getId());
    }

    public List<PerPolicy> getActivePolicies() {
        return perPolicyRepository.findByStatus(ReservePolicyStatus.ACTIVE);
    }

    public PerCalculationResult calculatePerAdjustment(Long poolId, BigDecimal grossProfit, LocalDate periodFrom, LocalDate periodTo) {
        PerPolicy policy = getActivePolicy(poolId);
        InvestmentPool pool = getPool(poolId);
        BigDecimal poolBalance = resolvePoolBalance(poolId);
        BigDecimal actualRate = percentage(grossProfit, poolBalance);
        BigDecimal targetRate = scaleRate(policy.getTargetDistributionRate());
        BigDecimal perBalanceBefore = getPerBalance(poolId);
        BigDecimal remainingCapacity = remainingCapacity(policy, poolBalance, perBalanceBefore);

        String adjustmentType = "NONE";
        BigDecimal adjustmentAmount = ZERO;
        BigDecimal distributedProfit = scaleMoney(grossProfit);
        BigDecimal perBalanceAfter = perBalanceBefore;

        if (actualRate.compareTo(targetRate) > 0 && remainingCapacity.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal retentionCandidate = applyAllocation(
                    amountForRateDifference(actualRate.subtract(targetRate), poolBalance),
                    policy.getRetentionAllocation(),
                    pool);
            retentionCandidate = retentionCandidate.multiply(scaleRate(policy.getRetentionRate()))
                    .divide(HUNDRED, 8, RoundingMode.HALF_UP);
            BigDecimal maxByRate = scaleMoney(grossProfit)
                    .multiply(scaleRate(policy.getMaximumRetentionRate()))
                    .divide(HUNDRED, 8, RoundingMode.HALF_UP);
            adjustmentAmount = minPositive(retentionCandidate, maxByRate, remainingCapacity);
            if (adjustmentAmount.compareTo(BigDecimal.ZERO) > 0) {
                adjustmentType = "RETENTION";
                distributedProfit = scaleMoney(grossProfit).subtract(scaleMoney(adjustmentAmount));
                perBalanceAfter = perBalanceBefore.add(scaleMoney(adjustmentAmount));
            }
        } else if (actualRate.compareTo(scaleRate(policy.getReleaseThreshold())) < 0 && perBalanceBefore.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal neededRelease = amountForRateDifference(targetRate.subtract(actualRate), poolBalance);
            adjustmentAmount = scaleMoney(neededRelease.min(perBalanceBefore));
            if (adjustmentAmount.compareTo(BigDecimal.ZERO) > 0) {
                adjustmentType = "RELEASE";
                distributedProfit = scaleMoney(grossProfit).add(adjustmentAmount);
                perBalanceAfter = perBalanceBefore.subtract(adjustmentAmount);
            }
        }

        BigDecimal smoothedRate = percentage(distributedProfit, poolBalance);
        return PerCalculationResult.builder()
                .adjustmentType(adjustmentType)
                .adjustmentAmount(scaleMoney(adjustmentAmount))
                .grossProfit(scaleMoney(grossProfit))
                .distributedProfit(scaleMoney(distributedProfit))
                .actualProfitRate(actualRate)
                .smoothedProfitRate(smoothedRate)
                .perBalanceBefore(perBalanceBefore)
                .perBalanceAfter(perBalanceAfter)
                .remainingCapacity(remainingCapacity(policy, poolBalance, perBalanceAfter))
                .maximumReached(remainingCapacity(policy, poolBalance, perBalanceAfter).compareTo(BigDecimal.ZERO) <= 0)
                .build();
    }

    @Transactional
    public void retainToPer(Long poolId, BigDecimal amount, LocalDate periodFrom, LocalDate periodTo,
                            BigDecimal grossProfit, BigDecimal actualRate, BigDecimal smoothedRate) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        PerPolicy policy = getActivePolicy(poolId);
        BigDecimal balanceBefore = getPerBalance(poolId);
        JournalEntryRef journalRef = postReserveJournal(poolId, amount, IslamicTransactionType.PER_RETENTION, periodTo, "PER retention");
        PerTransaction transaction = PerTransaction.builder()
                .policyId(policy.getId())
                .poolId(poolId)
                .transactionType(PerTransactionType.RETENTION)
                .amount(scaleMoney(amount))
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceBefore.add(scaleMoney(amount)))
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .grossProfitForPeriod(scaleMoney(grossProfit))
                .actualProfitRate(scaleRate(actualRate))
                .distributedProfitRate(scaleRate(smoothedRate))
                .journalRef(journalRef.reference())
                .narration("PER retention")
                .processedAt(Instant.now())
                .processedBy(currentActorProvider.getCurrentActor())
                .build();
        perTransactionRepository.save(transaction);
    }

    @Transactional
    public void releaseFromPer(Long poolId, BigDecimal amount, LocalDate periodFrom, LocalDate periodTo,
                               BigDecimal grossProfit, BigDecimal actualRate, BigDecimal smoothedRate, String approvedBy) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        PerPolicy policy = getActivePolicy(poolId);
        BigDecimal balanceBefore = getPerBalance(poolId);
        JournalEntryRef journalRef = postReserveJournal(poolId, amount, IslamicTransactionType.PER_RELEASE, periodTo, "PER release");
        PerTransaction transaction = PerTransaction.builder()
                .policyId(policy.getId())
                .poolId(poolId)
                .transactionType(PerTransactionType.RELEASE)
                .amount(scaleMoney(amount))
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceBefore.subtract(scaleMoney(amount)))
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .grossProfitForPeriod(scaleMoney(grossProfit))
                .actualProfitRate(scaleRate(actualRate))
                .distributedProfitRate(scaleRate(smoothedRate))
                .journalRef(journalRef.reference())
                .narration("PER release")
                .approvedBy(StringUtilsOrFallback.valueOrFallback(approvedBy, currentActorProvider.getCurrentActor()))
                .processedAt(Instant.now())
                .processedBy(currentActorProvider.getCurrentActor())
                .build();
        perTransactionRepository.save(transaction);
    }

    public BigDecimal getPerBalance(Long poolId) {
        return perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId)
                .map(PerTransaction::getBalanceAfter)
                .orElseGet(() -> balanceFromPoolGl(poolId));
    }

    public List<PerTransaction> getPerHistory(Long poolId, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.of(1900, 1, 1);
        LocalDate effectiveTo = to != null ? to : LocalDate.of(2999, 12, 31);
        return perTransactionRepository
                .findByPoolIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqualOrderByProcessedAtAsc(poolId, effectiveFrom, effectiveTo);
    }

    public PerDashboard getPerDashboard() {
        BigDecimal totalPer = ZERO;
        List<String> poolsNearMaximum = new ArrayList<>();
        List<String> recentMovements = perTransactionRepository.findByProcessedAtAfterOrderByProcessedAtDesc(Instant.now().minusSeconds(30L * 24 * 3600))
                .stream()
                .limit(10)
                .map(tx -> tx.getTransactionType() + ":" + tx.getPoolId() + ":" + tx.getAmount())
                .toList();

        for (PerPolicy policy : getActivePolicies()) {
            BigDecimal balance = getPerBalance(policy.getInvestmentPoolId());
            totalPer = totalPer.add(balance);
            BigDecimal remaining = remainingCapacity(policy, resolvePoolBalance(policy.getInvestmentPoolId()), balance);
            if (remaining.compareTo(balance.max(BigDecimal.ONE).multiply(new BigDecimal("0.10"))) <= 0) {
                poolsNearMaximum.add(getPool(policy.getInvestmentPoolId()).getPoolCode());
            }
        }

        return PerDashboard.builder()
                .totalPerAcrossPools(totalPer)
                .poolsNearMaximum(poolsNearMaximum)
                .recentMovements(recentMovements)
                .build();
    }

    private PerPolicy getActivePolicy(Long poolId) {
        return perPolicyRepository.findByInvestmentPoolId(poolId)
                .filter(policy -> policy.getStatus() == ReservePolicyStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("Active PER policy not found for pool: " + poolId, "PER_POLICY_NOT_FOUND"));
    }

    private InvestmentPool getPool(Long poolId) {
        return investmentPoolRepository.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
    }

    private void validateFatwa(Long fatwaId) {
        if (fatwaId != null && !fatwaRecordRepository.existsById(fatwaId)) {
            throw new BusinessException("Fatwa not found: " + fatwaId, "INVALID_FATWA");
        }
    }

    private BigDecimal resolvePoolBalance(Long poolId) {
        BigDecimal balance = participantRepository.sumParticipationBalanceByPoolId(poolId);
        return scaleMoney(balance);
    }

    private BigDecimal percentage(BigDecimal amount, BigDecimal base) {
        if (amount == null || base == null || base.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return amount.divide(base, 8, RoundingMode.HALF_UP)
                .multiply(HUNDRED)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal amountForRateDifference(BigDecimal rateDifference, BigDecimal poolBalance) {
        if (rateDifference == null || poolBalance == null || poolBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return ZERO;
        }
        return poolBalance.multiply(rateDifference).divide(HUNDRED, 8, RoundingMode.HALF_UP);
    }

    private BigDecimal remainingCapacity(PerPolicy policy, BigDecimal poolBalance, BigDecimal currentBalance) {
        List<BigDecimal> caps = new ArrayList<>();
        if (policy.getMaximumReserveBalance() != null) {
            caps.add(policy.getMaximumReserveBalance().subtract(currentBalance));
        }
        if (policy.getMaximumReservePercentOfPool() != null && poolBalance.compareTo(BigDecimal.ZERO) > 0) {
            caps.add(poolBalance.multiply(policy.getMaximumReservePercentOfPool()).divide(HUNDRED, 8, RoundingMode.HALF_UP)
                    .subtract(currentBalance));
        }
        if (caps.isEmpty()) {
            return INFINITE_CAP;
        }
        return caps.stream().reduce(INFINITE_CAP, BigDecimal::min).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal applyAllocation(BigDecimal amount, PerRetentionAllocation allocation, InvestmentPool pool) {
        if (amount == null) {
            return ZERO;
        }
        return switch (allocation) {
            case FROM_BANK_SHARE_ONLY -> amount
                    .multiply(scaleRate(pool.getProfitSharingRatioBank()))
                    .divide(HUNDRED, 8, RoundingMode.HALF_UP);
            case FROM_BOTH_PROPORTIONAL, FROM_GROSS_BEFORE_SPLIT -> amount;
        };
    }

    private BigDecimal minPositive(BigDecimal... values) {
        BigDecimal current = INFINITE_CAP;
        for (BigDecimal value : values) {
            if (value != null && value.compareTo(BigDecimal.ZERO) > 0 && value.compareTo(current) < 0) {
                current = value;
            }
        }
        return current == INFINITE_CAP ? ZERO : scaleMoney(current);
    }

    private BigDecimal balanceFromPoolGl(Long poolId) {
        InvestmentPool pool = getPool(poolId);
        if (pool.getGlPerAccountCode() == null) {
            return ZERO;
        }
        return glBalanceRepository.findByGlCodeAndBalanceDate(pool.getGlPerAccountCode(), LocalDate.now()).stream()
                .map(GlBalance::getClosingBalance)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private JournalEntryRef postReserveJournal(Long poolId, BigDecimal amount, IslamicTransactionType txnType,
                                               LocalDate valueDate, String narration) {
        JournalEntry posted = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("ALL")
                .txnType(txnType)
                .poolId(poolId)
                .amount(scaleMoney(amount))
                .valueDate(valueDate != null ? valueDate : LocalDate.now())
                .reference(txnType.name() + "-" + poolId + "-" + Instant.now().toEpochMilli())
                .narration(narration)
                .build());
        return new JournalEntryRef(posted.getJournalNumber());
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaleRate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP)
                : value.setScale(4, RoundingMode.HALF_UP);
    }

    private record JournalEntryRef(String reference) {
    }

    private static final class StringUtilsOrFallback {
        private static String valueOrFallback(String value, String fallback) {
            return org.springframework.util.StringUtils.hasText(value) ? value : fallback;
        }
    }
}
