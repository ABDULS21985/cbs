package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.mudarabah.dto.PoolPerformanceReport;
import com.cbs.mudarabah.dto.PoolProfitAllocationResponse;
import com.cbs.mudarabah.dto.PoolWeightageSummary;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.PoolWeightageRecord;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PoolWeightageService {

    private final PoolWeightageRecordRepository weightageRecordRepository;
    private final PoolProfitAllocationRepository allocationRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    private static final String PROFIT_DISTRIBUTION_GL = "6100-000-001";
    private static final String BANK_MUDARIB_INCOME_GL = "4200-MDR-001";
    private static final String POOL_LOSS_GL = "6300-000-001";

    // Daily weightage recording
    public void recordDailyWeightages(Long poolId, LocalDate date) {
        List<MudarabahAccount> activeAccounts = mudarabahAccountRepository.findActiveByPoolId(poolId);
        // Determine period start date (first of current month — simplified)
        LocalDate periodStart = date.withDayOfMonth(1);

        for (MudarabahAccount ma : activeAccounts) {
            if (weightageRecordRepository.existsByPoolIdAndAccountIdAndRecordDate(poolId, ma.getAccount().getId(), date)) {
                continue; // Already recorded
            }
            Account account = ma.getAccount();
            BigDecimal closingBalance = account.getBookBalance();

            // Calculate cumulative daily product for the period
            BigDecimal previousCumulative = weightageRecordRepository.sumDailyProduct(
                    poolId, account.getId(), periodStart, date.minusDays(1));

            PoolWeightageRecord record = PoolWeightageRecord.builder()
                    .poolId(poolId)
                    .accountId(account.getId())
                    .mudarabahAccountId(ma.getId())
                    .recordDate(date)
                    .closingBalance(closingBalance)
                    .dailyProduct(closingBalance) // daily product = closing balance for one day
                    .cumulativeDailyProduct(previousCumulative.add(closingBalance))
                    .periodStartDate(periodStart)
                    .isActive(true)
                    .createdAt(java.time.Instant.now())
                    .build();
            weightageRecordRepository.save(record);
        }

        log.info("Daily weightages recorded: poolId={}, date={}, accounts={}", poolId, date, activeAccounts.size());
    }

    public void recordDailyWeightagesForAllPools(LocalDate date) {
        // Get distinct pool IDs from active Mudarabah accounts
        List<MudarabahAccount> all = mudarabahAccountRepository.findAll();
        all.stream()
                .filter(ma -> ma.getInvestmentPoolId() != null)
                .map(MudarabahAccount::getInvestmentPoolId)
                .distinct()
                .forEach(poolId -> {
                    try {
                        recordDailyWeightages(poolId, date);
                    } catch (Exception e) {
                        log.error("Failed to record weightages for pool {}: {}", poolId, e.getMessage());
                    }
                });
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateWeightage(Long poolId, Long accountId, LocalDate periodFrom, LocalDate periodTo) {
        BigDecimal accountDP = weightageRecordRepository.sumDailyProduct(poolId, accountId, periodFrom, periodTo);
        BigDecimal poolDP = weightageRecordRepository.sumPoolDailyProduct(poolId, periodFrom, periodTo);
        if (poolDP.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return accountDP.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> calculateAllWeightages(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        BigDecimal poolDP = weightageRecordRepository.sumPoolDailyProduct(poolId, periodFrom, periodTo);
        if (poolDP.compareTo(BigDecimal.ZERO) == 0) {
            return Map.of();
        }

        List<Long> accountIds = weightageRecordRepository.findActiveAccountIds(poolId, periodFrom, periodTo);
        Map<Long, BigDecimal> weightages = new LinkedHashMap<>();
        for (Long accountId : accountIds) {
            BigDecimal accountDP = weightageRecordRepository.sumDailyProduct(poolId, accountId, periodFrom, periodTo);
            BigDecimal weight = accountDP.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP);
            weightages.put(accountId, weight);
        }
        return weightages;
    }

    // Profit allocation - THE CORE algorithm
    public List<PoolProfitAllocationResponse> allocateProfit(Long poolId, BigDecimal poolGrossProfit,
                                                              LocalDate periodFrom, LocalDate periodTo) {
        BigDecimal poolDP = weightageRecordRepository.sumPoolDailyProduct(poolId, periodFrom, periodTo);
        if (poolDP.compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessException("No daily products recorded for the period", "NO_WEIGHTAGE_DATA");
        }

        List<Long> accountIds = weightageRecordRepository.findActiveAccountIds(poolId, periodFrom, periodTo);
        List<PoolProfitAllocation> allocations = new ArrayList<>();

        for (Long accountId : accountIds) {
            BigDecimal accountDP = weightageRecordRepository.sumDailyProduct(poolId, accountId, periodFrom, periodTo);
            BigDecimal weight = accountDP.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP);
            BigDecimal grossShare = poolGrossProfit.multiply(weight).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

            // PER/IRR adjustments — simplified (in full impl, call PerService/IrrService)
            BigDecimal perAdj = BigDecimal.ZERO;
            BigDecimal irrDed = BigDecimal.ZERO;
            BigDecimal netShare = grossShare.add(perAdj).subtract(irrDed);

            // Look up the Mudarabah account to get PSR
            MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId).orElse(null);
            BigDecimal customerPsr = ma != null ? ma.getProfitSharingRatioCustomer() : new BigDecimal("70.0000");
            BigDecimal bankPsr = ma != null ? ma.getProfitSharingRatioBank() : new BigDecimal("30.0000");

            BigDecimal customerProfit = netShare.multiply(customerPsr).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            BigDecimal bankProfit = netShare.subtract(customerProfit);

            // Calculate effective rate (annualised)
            long periodDays = ChronoUnit.DAYS.between(periodFrom, periodTo);
            if (periodDays == 0) periodDays = 1;
            BigDecimal avgBalance = accountDP.divide(BigDecimal.valueOf(periodDays), 4, RoundingMode.HALF_UP);
            BigDecimal effectiveRate = BigDecimal.ZERO;
            if (avgBalance.compareTo(BigDecimal.ZERO) > 0) {
                effectiveRate = customerProfit.multiply(BigDecimal.valueOf(365))
                        .divide(avgBalance.multiply(BigDecimal.valueOf(periodDays)), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"));
            }

            PoolProfitAllocation allocation = PoolProfitAllocation.builder()
                    .poolId(poolId)
                    .accountId(accountId)
                    .mudarabahAccountId(ma != null ? ma.getId() : 0L)
                    .periodFrom(periodFrom)
                    .periodTo(periodTo)
                    .totalDailyProduct(accountDP)
                    .poolTotalDailyProduct(poolDP)
                    .weightagePercentage(weight)
                    .poolGrossProfit(poolGrossProfit)
                    .grossShareBeforePer(grossShare)
                    .perAdjustment(perAdj)
                    .irrDeduction(irrDed)
                    .netShareAfterReserves(netShare)
                    .customerPsr(customerPsr)
                    .customerProfitShare(customerProfit)
                    .bankProfitShare(bankProfit)
                    .effectiveProfitRate(effectiveRate)
                    .distributionStatus(ProfitAllocationStatus.CALCULATED)
                    .build();

            allocations.add(allocationRepository.save(allocation));
        }

        log.info("Profit allocated: poolId={}, period={} to {}, participants={}, grossProfit={}",
                poolId, periodFrom, periodTo, allocations.size(), poolGrossProfit);

        return allocations.stream().map(this::toAllocationResponse).toList();
    }

    public void approveAllocations(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        List<PoolProfitAllocation> allocations = allocationRepository.findByPoolIdAndPeriodFromAndPeriodTo(poolId, periodFrom, periodTo);
        for (PoolProfitAllocation a : allocations) {
            if (a.getDistributionStatus() == ProfitAllocationStatus.CALCULATED) {
                a.setDistributionStatus(ProfitAllocationStatus.APPROVED);
                allocationRepository.save(a);
            }
        }
        log.info("Allocations approved: poolId={}, period={} to {}", poolId, periodFrom, periodTo);
    }

    public void distributeProfit(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        List<PoolProfitAllocation> allocations = allocationRepository.findByPoolIdAndDistributionStatus(poolId, ProfitAllocationStatus.APPROVED);

        for (PoolProfitAllocation allocation : allocations) {
            if (!allocation.getPeriodFrom().equals(periodFrom) || !allocation.getPeriodTo().equals(periodTo)) {
                continue;
            }

            Account account = accountRepository.findById(allocation.getAccountId()).orElse(null);
            if (account == null) continue;

            MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(allocation.getAccountId()).orElse(null);

            // Credit customer's profit share
            if (allocation.getCustomerProfitShare().compareTo(BigDecimal.ZERO) > 0) {
                TransactionJournal journal;
                if (ma != null && ma.isProfitReinvest()) {
                    // Profit stays in account
                    journal = accountPostingService.postCreditAgainstGl(account, TransactionType.CREDIT,
                            allocation.getCustomerProfitShare(),
                            "Mudarabah profit distribution",
                            TransactionChannel.SYSTEM, null,
                            PROFIT_DISTRIBUTION_GL, "MUDARABAH", "PROFIT-DIST");
                } else if (ma != null && ma.getProfitDistributionAccountId() != null) {
                    // Transfer to distribution account
                    Account distAccount = accountRepository.findById(ma.getProfitDistributionAccountId()).orElse(null);
                    if (distAccount != null) {
                        journal = accountPostingService.postCreditAgainstGl(distAccount, TransactionType.CREDIT,
                                allocation.getCustomerProfitShare(),
                                "Mudarabah profit distribution",
                                TransactionChannel.SYSTEM, null,
                                PROFIT_DISTRIBUTION_GL, "MUDARABAH", "PROFIT-DIST");
                    } else {
                        journal = accountPostingService.postCreditAgainstGl(account, TransactionType.CREDIT,
                                allocation.getCustomerProfitShare(),
                                "Mudarabah profit distribution",
                                TransactionChannel.SYSTEM, null,
                                PROFIT_DISTRIBUTION_GL, "MUDARABAH", "PROFIT-DIST");
                    }
                } else {
                    journal = accountPostingService.postCreditAgainstGl(account, TransactionType.CREDIT,
                            allocation.getCustomerProfitShare(),
                            "Mudarabah profit distribution",
                            TransactionChannel.SYSTEM, null,
                            PROFIT_DISTRIBUTION_GL, "MUDARABAH", "PROFIT-DIST");
                }
                allocation.setJournalRef(journal.getTransactionRef());
            } else if (allocation.getCustomerProfitShare().compareTo(BigDecimal.ZERO) < 0) {
                TransactionJournal journal = accountPostingService.postDebitAgainstGl(
                        account,
                        TransactionType.DEBIT,
                        allocation.getCustomerProfitShare().abs(),
                        "Mudarabah loss allocation",
                        TransactionChannel.SYSTEM,
                        null,
                        POOL_LOSS_GL,
                        "MUDARABAH",
                        "LOSS-DIST"
                );
                allocation.setJournalRef(journal.getTransactionRef());
            }

            // Update allocation status
            allocation.setDistributionStatus(ProfitAllocationStatus.DISTRIBUTED);
            allocation.setDistributedAt(LocalDateTime.now());
            allocationRepository.save(allocation);

            // Update Mudarabah account
            if (ma != null) {
                ma.setLastProfitDistributionDate(LocalDate.now());
                ma.setLastProfitDistributionAmount(allocation.getCustomerProfitShare());
                ma.setCumulativeProfitReceived(ma.getCumulativeProfitReceived().add(allocation.getCustomerProfitShare()));
                ma.setIndicativeProfitRate(allocation.getEffectiveProfitRate());
                mudarabahAccountRepository.save(ma);
            }
        }

        log.info("Profit distributed: poolId={}, period={} to {}", poolId, periodFrom, periodTo);
    }

    // Reporting
    @Transactional(readOnly = true)
    public PoolWeightageSummary getPoolWeightageSummary(Long poolId, LocalDate periodFrom, LocalDate periodTo) {
        BigDecimal poolDP = weightageRecordRepository.sumPoolDailyProduct(poolId, periodFrom, periodTo);
        List<Long> accountIds = weightageRecordRepository.findActiveAccountIds(poolId, periodFrom, periodTo);

        List<PoolWeightageSummary.ParticipantWeightage> participants = new ArrayList<>();
        for (Long accountId : accountIds) {
            BigDecimal accountDP = weightageRecordRepository.sumDailyProduct(poolId, accountId, periodFrom, periodTo);
            BigDecimal weight = poolDP.compareTo(BigDecimal.ZERO) > 0
                    ? accountDP.multiply(new BigDecimal("100")).divide(poolDP, 8, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId).orElse(null);
            Account account = accountRepository.findById(accountId).orElse(null);
            participants.add(PoolWeightageSummary.ParticipantWeightage.builder()
                    .accountId(accountId)
                    .mudarabahAccountId(ma != null ? ma.getId() : null)
                    .totalDailyProduct(accountDP)
                    .weightagePercentage(weight)
                    .closingBalance(account != null ? account.getBookBalance() : BigDecimal.ZERO)
                    .build());
        }

        return PoolWeightageSummary.builder()
                .poolId(poolId)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .poolTotalDailyProduct(poolDP)
                .participantCount(accountIds.size())
                .participants(participants)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PoolProfitAllocationResponse> getProfitAllocationHistory(Long accountId, LocalDate from, LocalDate to) {
        return allocationRepository.findByAccountIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqual(accountId, from, to)
                .stream().map(this::toAllocationResponse).toList();
    }

    @Transactional(readOnly = true)
    public PoolPerformanceReport getPoolPerformanceReport(Long poolId, LocalDate from, LocalDate to) {
        List<PoolProfitAllocation> allocations = allocationRepository.findByPoolIdAndPeriodFromAndPeriodTo(poolId, from, to);

        BigDecimal totalGross = allocations.stream().map(PoolProfitAllocation::getGrossShareBeforePer)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCustomer = allocations.stream().map(PoolProfitAllocation::getCustomerProfitShare)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalBank = allocations.stream().map(PoolProfitAllocation::getBankProfitShare)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPer = allocations.stream().map(PoolProfitAllocation::getPerAdjustment)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalIrr = allocations.stream().map(PoolProfitAllocation::getIrrDeduction)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgRate = allocations.isEmpty() ? BigDecimal.ZERO :
                allocations.stream().map(PoolProfitAllocation::getEffectiveProfitRate)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(allocations.size()), 4, RoundingMode.HALF_UP);

        return PoolPerformanceReport.builder()
                .poolId(poolId)
                .periodFrom(from)
                .periodTo(to)
                .totalGrossProfit(totalGross)
                .totalDistributedToCustomers(totalCustomer)
                .totalBankShare(totalBank)
                .totalPerRetained(totalPer)
                .totalIrrRetained(totalIrr)
                .participantCount(allocations.size())
                .averageEffectiveRate(avgRate)
                .allocations(allocations.stream().map(this::toAllocationResponse).toList())
                .build();
    }

    private PoolProfitAllocationResponse toAllocationResponse(PoolProfitAllocation a) {
        Account account = accountRepository.findById(a.getAccountId()).orElse(null);
        return PoolProfitAllocationResponse.builder()
                .id(a.getId())
                .poolId(a.getPoolId())
                .accountId(a.getAccountId())
                .accountNumber(account != null ? account.getAccountNumber() : null)
                .periodFrom(a.getPeriodFrom())
                .periodTo(a.getPeriodTo())
                .totalDailyProduct(a.getTotalDailyProduct())
                .weightagePercentage(a.getWeightagePercentage())
                .poolGrossProfit(a.getPoolGrossProfit())
                .grossShareBeforePer(a.getGrossShareBeforePer())
                .perAdjustment(a.getPerAdjustment())
                .irrDeduction(a.getIrrDeduction())
                .netShareAfterReserves(a.getNetShareAfterReserves())
                .customerPsr(a.getCustomerPsr())
                .customerProfitShare(a.getCustomerProfitShare())
                .bankProfitShare(a.getBankProfitShare())
                .effectiveProfitRate(a.getEffectiveProfitRate())
                .distributionStatus(a.getDistributionStatus().name())
                .distributedAt(a.getDistributedAt())
                .journalRef(a.getJournalRef())
                .build();
    }
}
