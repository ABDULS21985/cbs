package com.cbs.gl.islamic.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.islamic.dto.IrrAdequacyReport;
import com.cbs.gl.islamic.dto.IrrDashboard;
import com.cbs.gl.islamic.dto.IrrPolicyRequest;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IrrPolicy;
import com.cbs.gl.islamic.entity.IrrRetentionAllocation;
import com.cbs.gl.islamic.entity.IrrTransaction;
import com.cbs.gl.islamic.entity.IrrTransactionType;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.IrrPolicyRepository;
import com.cbs.gl.islamic.repository.IrrTransactionRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
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
public class IrrService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal INFINITE_CAP = new BigDecimal("999999999999.99");

    private final IrrPolicyRepository irrPolicyRepository;
    private final IrrTransactionRepository irrTransactionRepository;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final InvestmentPoolParticipantRepository participantRepository;
    private final FatwaRecordRepository fatwaRecordRepository;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public IrrPolicy createPolicy(IrrPolicyRequest request) {
        if (irrPolicyRepository.findByPolicyCode(request.getPolicyCode()).isPresent()) {
            throw new BusinessException("IRR policy already exists: " + request.getPolicyCode(), "DUPLICATE_IRR_POLICY");
        }
        InvestmentPool pool = getPool(request.getInvestmentPoolId());
        validateFatwa(request.getFatwaId());

        IrrPolicy policy = IrrPolicy.builder()
                .policyCode(request.getPolicyCode().trim().toUpperCase())
                .name(request.getName())
                .nameAr(request.getNameAr())
                .investmentPoolId(request.getInvestmentPoolId())
                .retentionRate(scaleRate(request.getRetentionRate()))
                .maximumRetentionRate(scaleRate(request.getMaximumRetentionRate()))
                .maximumReserveBalance(scaleMoney(request.getMaximumReserveBalance()))
                .maximumReservePercentOfPool(scaleRate(request.getMaximumReservePercentOfPool()))
                .triggerThreshold(scaleRate(request.getTriggerThreshold()))
                .retentionAllocation(request.getRetentionAllocation() != null
                        ? request.getRetentionAllocation()
                        : IrrRetentionAllocation.FROM_INVESTOR_SHARE_ONLY)
                .approvalRequired(Boolean.TRUE.equals(request.getApprovalRequired()))
                .fatwaId(request.getFatwaId())
                .ssbReviewDate(request.getSsbReviewDate())
                .nextSsbReviewDate(request.getNextSsbReviewDate())
                .status(ReservePolicyStatus.ACTIVE)
                .effectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now())
                .effectiveTo(request.getEffectiveTo())
                .tenantId(pool.getTenantId())
                .build();
        IrrPolicy saved = irrPolicyRepository.save(policy);
        pool.setIrrPolicyId(saved.getId());
        investmentPoolRepository.save(pool);
        return saved;
    }

    @Transactional
    public IrrPolicy updatePolicy(Long policyId, IrrPolicyRequest request) {
        IrrPolicy policy = getPolicy(policyId);
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
        if (request.getMaximumReserveBalance() != null) {
            policy.setMaximumReserveBalance(scaleMoney(request.getMaximumReserveBalance()));
        }
        if (request.getMaximumReservePercentOfPool() != null) {
            policy.setMaximumReservePercentOfPool(scaleRate(request.getMaximumReservePercentOfPool()));
        }
        if (request.getTriggerThreshold() != null) {
            policy.setTriggerThreshold(scaleRate(request.getTriggerThreshold()));
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
        return irrPolicyRepository.save(policy);
    }

    public IrrPolicy getPolicy(Long policyId) {
        return irrPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("IrrPolicy", "id", policyId));
    }

    public List<IrrPolicy> getActivePolicies() {
        return irrPolicyRepository.findByStatus(ReservePolicyStatus.ACTIVE);
    }

    public IrrRetentionResult calculateIrrRetention(Long poolId, BigDecimal distributableProfit, LocalDate periodFrom, LocalDate periodTo) {
        IrrPolicy policy = getActivePolicy(poolId);
        InvestmentPool pool = getPool(poolId);
        BigDecimal poolBalance = resolvePoolBalance(poolId);
        BigDecimal balanceBefore = getIrrBalance(poolId);
        BigDecimal remainingCapacity = remainingCapacity(policy, poolBalance, balanceBefore);

        BigDecimal candidate = scaleMoney(distributableProfit)
                .multiply(scaleRate(policy.getRetentionRate()))
                .divide(HUNDRED, 8, RoundingMode.HALF_UP);
        candidate = applyAllocation(candidate, policy.getRetentionAllocation(), pool);
        BigDecimal maxByRate = scaleMoney(distributableProfit)
                .multiply(scaleRate(policy.getMaximumRetentionRate()))
                .divide(HUNDRED, 8, RoundingMode.HALF_UP);
        BigDecimal retention = minPositive(candidate, maxByRate, remainingCapacity);
        BigDecimal balanceAfter = balanceBefore.add(retention);

        return IrrRetentionResult.builder()
                .adjustmentAmount(retention)
                .distributableProfitBeforeRetention(scaleMoney(distributableProfit))
                .distributableProfitAfterRetention(scaleMoney(distributableProfit).subtract(retention))
                .irrBalanceBefore(balanceBefore)
                .irrBalanceAfter(balanceAfter)
                .remainingCapacity(remainingCapacity(policy, poolBalance, balanceAfter))
                .maximumReached(remainingCapacity(policy, poolBalance, balanceAfter).compareTo(BigDecimal.ZERO) <= 0)
                .build();
    }

    public IrrReleaseResult calculateIrrRelease(Long poolId, BigDecimal lossAmount) {
        IrrPolicy policy = getActivePolicy(poolId);
        BigDecimal poolBalance = resolvePoolBalance(poolId);
        BigDecimal balanceBefore = getIrrBalance(poolId);
        BigDecimal thresholdAmount = amountFromRateDifference(scaleRate(policy.getTriggerThreshold()), poolBalance);
        boolean triggered = lossAmount.compareTo(thresholdAmount) > 0 || thresholdAmount.compareTo(BigDecimal.ZERO) == 0;
        BigDecimal absorbed = triggered ? scaleMoney(lossAmount).min(balanceBefore) : ZERO;
        BigDecimal remainingLoss = scaleMoney(lossAmount).subtract(absorbed);
        return IrrReleaseResult.builder()
                .lossAmount(scaleMoney(lossAmount))
                .absorbed(absorbed)
                .remainingLoss(remainingLoss)
                .irrBalanceBefore(balanceBefore)
                .irrBalanceAfter(balanceBefore.subtract(absorbed))
                .triggered(triggered)
                .build();
    }

    @Transactional
    public void retainToIrr(Long poolId, BigDecimal amount, LocalDate periodFrom, LocalDate periodTo) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        IrrPolicy policy = getActivePolicy(poolId);
        BigDecimal balanceBefore = getIrrBalance(poolId);
        JournalEntryRef journalRef = postReserveJournal(poolId, amount, IslamicTransactionType.IRR_RETENTION, periodTo, "IRR retention");
        IrrTransaction transaction = IrrTransaction.builder()
                .policyId(policy.getId())
                .poolId(poolId)
                .transactionType(IrrTransactionType.RETENTION)
                .amount(scaleMoney(amount))
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceBefore.add(scaleMoney(amount)))
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .journalRef(journalRef.reference())
                .narration("IRR retention")
                .processedAt(Instant.now())
                .processedBy(currentActorProvider.getCurrentActor())
                .build();
        irrTransactionRepository.save(transaction);
    }

    @Transactional
    public void releaseIrrForLossAbsorption(Long poolId, BigDecimal lossAmount, String triggerEvent, String approvedBy) {
        IrrReleaseResult calculation = calculateIrrRelease(poolId, lossAmount);
        if (!calculation.getTriggered() || calculation.getAbsorbed().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        IrrPolicy policy = getActivePolicy(poolId);
        if (Boolean.TRUE.equals(policy.getApprovalRequired()) && (approvedBy == null || approvedBy.isBlank())) {
            throw new BusinessException("IRR release requires approval", "IRR_APPROVAL_REQUIRED");
        }
        JournalEntryRef journalRef = postReserveJournal(poolId, calculation.getAbsorbed(), IslamicTransactionType.IRR_RELEASE,
                LocalDate.now(), "IRR release for loss absorption");
        IrrTransaction transaction = IrrTransaction.builder()
                .policyId(policy.getId())
                .poolId(poolId)
                .transactionType(IrrTransactionType.RELEASE_LOSS_ABSORPTION)
                .amount(calculation.getAbsorbed())
                .balanceBefore(calculation.getIrrBalanceBefore())
                .balanceAfter(calculation.getIrrBalanceAfter())
                .triggerEvent(triggerEvent)
                .lossAmount(calculation.getLossAmount())
                .lossAbsorbed(calculation.getAbsorbed())
                .remainingLoss(calculation.getRemainingLoss())
                .journalRef(journalRef.reference())
                .narration("IRR loss absorption")
                .approvedBy(org.springframework.util.StringUtils.hasText(approvedBy) ? approvedBy : currentActorProvider.getCurrentActor())
                .processedAt(Instant.now())
                .processedBy(currentActorProvider.getCurrentActor())
                .build();
        irrTransactionRepository.save(transaction);
    }

    @Transactional
    public void releaseIrrOnPoolClosure(Long poolId, String reason) {
        BigDecimal balance = getIrrBalance(poolId);
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        IrrPolicy policy = getActivePolicy(poolId);
        JournalEntryRef journalRef = postReserveJournal(poolId, balance, IslamicTransactionType.POOL_CLOSURE_RELEASE,
                LocalDate.now(), "IRR release on pool closure");
        IrrTransaction transaction = IrrTransaction.builder()
                .policyId(policy.getId())
                .poolId(poolId)
                .transactionType(IrrTransactionType.RELEASE_POOL_CLOSURE)
                .amount(balance)
                .balanceBefore(balance)
                .balanceAfter(ZERO)
                .triggerEvent(reason)
                .journalRef(journalRef.reference())
                .narration("IRR release on pool closure")
                .approvedBy(currentActorProvider.getCurrentActor())
                .processedAt(Instant.now())
                .processedBy(currentActorProvider.getCurrentActor())
                .build();
        irrTransactionRepository.save(transaction);
    }

    public BigDecimal getIrrBalance(Long poolId) {
        return irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(poolId)
                .map(IrrTransaction::getBalanceAfter)
                .orElseGet(() -> balanceFromPoolGl(poolId));
    }

    public List<IrrTransaction> getIrrHistory(Long poolId, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.of(1900, 1, 1);
        LocalDate effectiveTo = to != null ? to : LocalDate.of(2999, 12, 31);
        return irrTransactionRepository
                .findByPoolIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqualOrderByProcessedAtAsc(poolId, effectiveFrom, effectiveTo);
    }

    public IrrDashboard getIrrDashboard() {
        BigDecimal totalIrr = ZERO;
        List<String> poolsNearMaximum = new ArrayList<>();
        List<String> recentLossEvents = irrTransactionRepository.findByProcessedAtAfterOrderByProcessedAtDesc(Instant.now().minusSeconds(30L * 24 * 3600))
                .stream()
                .limit(10)
                .map(tx -> tx.getTransactionType() + ":" + tx.getPoolId() + ":" + tx.getAmount())
                .toList();

        for (IrrPolicy policy : getActivePolicies()) {
            BigDecimal balance = getIrrBalance(policy.getInvestmentPoolId());
            totalIrr = totalIrr.add(balance);
            BigDecimal remaining = remainingCapacity(policy, resolvePoolBalance(policy.getInvestmentPoolId()), balance);
            if (remaining.compareTo(balance.max(BigDecimal.ONE).multiply(new BigDecimal("0.10"))) <= 0) {
                poolsNearMaximum.add(getPool(policy.getInvestmentPoolId()).getPoolCode());
            }
        }

        return IrrDashboard.builder()
                .totalIrrAcrossPools(totalIrr)
                .poolsNearMaximum(poolsNearMaximum)
                .recentLossAbsorptionEvents(recentLossEvents)
                .build();
    }

    public IrrAdequacyReport getIrrAdequacy(Long poolId) {
        InvestmentPool pool = getPool(poolId);
        BigDecimal irrBalance = getIrrBalance(poolId);
        BigDecimal expectedCreditLoss = chartOfAccountsRepository
                .findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.FINANCING_IMPAIRMENT)
                .stream()
                .filter(account -> account.getInvestmentPoolId() == null || poolId.equals(account.getInvestmentPoolId()))
                .map(account -> glBalanceRepository.findByGlCodeAndBalanceDate(account.getGlCode(), LocalDate.now()).stream()
                        .map(GlBalance::getClosingBalance)
                        .reduce(ZERO, BigDecimal::add))
                .reduce(ZERO, BigDecimal::add);
        BigDecimal coverageRatio = expectedCreditLoss.compareTo(BigDecimal.ZERO) > 0
                ? irrBalance.divide(expectedCreditLoss, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        return IrrAdequacyReport.builder()
                .poolCode(pool.getPoolCode())
                .irrBalance(irrBalance)
                .expectedCreditLoss(expectedCreditLoss)
                .coverageRatio(coverageRatio)
                .build();
    }

    private IrrPolicy getActivePolicy(Long poolId) {
        return irrPolicyRepository.findByInvestmentPoolId(poolId)
                .filter(policy -> policy.getStatus() == ReservePolicyStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException("Active IRR policy not found for pool: " + poolId, "IRR_POLICY_NOT_FOUND"));
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
        return scaleMoney(participantRepository.sumParticipationBalanceByPoolId(poolId));
    }

    private BigDecimal amountFromRateDifference(BigDecimal rate, BigDecimal balance) {
        if (rate == null || balance == null || balance.compareTo(BigDecimal.ZERO) <= 0) {
            return ZERO;
        }
        return balance.multiply(rate).divide(HUNDRED, 8, RoundingMode.HALF_UP);
    }

    private BigDecimal remainingCapacity(IrrPolicy policy, BigDecimal poolBalance, BigDecimal currentBalance) {
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

    private BigDecimal applyAllocation(BigDecimal amount, IrrRetentionAllocation allocation, InvestmentPool pool) {
        if (amount == null) {
            return ZERO;
        }
        return switch (allocation) {
            case FROM_INVESTOR_SHARE_ONLY -> amount
                    .multiply(scaleRate(pool.getProfitSharingRatioInvestors()))
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
        if (pool.getGlIrrAccountCode() == null) {
            return ZERO;
        }
        return glBalanceRepository.findByGlCodeAndBalanceDate(pool.getGlIrrAccountCode(), LocalDate.now()).stream()
                .map(GlBalance::getClosingBalance)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private JournalEntryRef postReserveJournal(Long poolId, BigDecimal amount, IslamicTransactionType txnType,
                                               LocalDate valueDate, String narration) {
        var posted = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
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
}
