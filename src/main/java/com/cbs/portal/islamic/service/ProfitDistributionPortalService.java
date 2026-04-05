package com.cbs.portal.islamic.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.dto.MudarabahAccountResponse;
import com.cbs.mudarabah.dto.PoolProfitAllocationResponse;
import com.cbs.mudarabah.service.MudarabahAccountService;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.gl.islamic.service.IslamicChartOfAccountsService;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * BFF for Capability 4 — Profit Distribution.
 * Provides a transparent view of the profit-distribution chain: pool return,
 * weightage, PER, IRR, PSR, and the net amount distributed to the customer.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProfitDistributionPortalService {

    private final PoolWeightageService poolWeightageService;
    private final MudarabahAccountService mudarabahAccountService;
    private final IslamicChartOfAccountsService islamicCoaService;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicTerminologyService terminologyService;

    // ── Profit Distribution View ─────────────────────────────────────────

    /**
     * Transparent profit breakdown showing pool return, weight, PER, IRR, PSR,
     * and the net amount distributed.
     */
    public ProfitDistributionPortalDTO getProfitDistributionView(Long customerId, Long accountId,
                                                                   String language) {
        MudarabahAccountResponse account = findMudarabahAccount(customerId, accountId);

        // Load last 12 months of allocation history
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusMonths(12);
        List<PoolProfitAllocationResponse> allocations = safeLoadAllocations(accountId, from, to);

        BigDecimal ytdProfit = calculateYtdProfit(allocations);
        BigDecimal lifetimeProfit = account.getCumulativeProfitReceived() != null
                ? account.getCumulativeProfitReceived() : BigDecimal.ZERO;

        List<ProfitDistributionPeriodDTO> periods = allocations.stream()
                .map(a -> toPeriodDTO(a, language))
                .toList();

        PoolInfoDTO poolInfo = buildPoolInfo(account);

        return ProfitDistributionPortalDTO.builder()
                .accountId(String.valueOf(accountId))
                .accountNumber(account.getAccountNumber())
                .contractType("MUDARABAH")
                .investmentPool(account.getPoolName())
                .profitSharingRatio(account.getProfitSharingRatioCustomer())
                .indicativeRate(account.getIndicativeProfitRate())
                .ytdProfit(ytdProfit)
                .lifetimeProfit(lifetimeProfit)
                .poolInfo(poolInfo)
                .periods(periods)
                .build();
    }

    // ── Distribution History ─────────────────────────────────────────────

    /**
     * Paginated distribution history for the given number of periods (months).
     */
    public List<ProfitDistributionPeriodDTO> getDistributionHistory(Long customerId, Long accountId,
                                                                      int periods, String language) {
        findMudarabahAccount(customerId, accountId);

        LocalDate to = LocalDate.now();
        LocalDate from = to.minusMonths(Math.max(periods, 1));
        List<PoolProfitAllocationResponse> allocations = safeLoadAllocations(accountId, from, to);

        return allocations.stream()
                .map(a -> toPeriodDTO(a, language))
                .toList();
    }

    // ── Internal helpers ─────────────────────────────────────────────────

    private MudarabahAccountResponse findMudarabahAccount(Long customerId, Long accountId) {
        List<MudarabahAccountResponse> accounts = mudarabahAccountService.getCustomerMudarabahAccounts(customerId);
        return accounts.stream()
                .filter(a -> Objects.equals(a.getAccountId(), accountId))
                .findFirst()
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "MudarabahAccount", "accountId", accountId));
    }

    private List<PoolProfitAllocationResponse> safeLoadAllocations(Long accountId, LocalDate from, LocalDate to) {
        try {
            return poolWeightageService.getProfitAllocationHistory(accountId, from, to);
        } catch (Exception ex) {
            log.warn("Failed to load profit allocation history for account {}: {}", accountId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private ProfitDistributionPeriodDTO toPeriodDTO(PoolProfitAllocationResponse a, String language) {
        return ProfitDistributionPeriodDTO.builder()
                .periodStart(a.getPeriodFrom() != null ? a.getPeriodFrom().toString() : null)
                .periodEnd(a.getPeriodTo() != null ? a.getPeriodTo().toString() : null)
                .periodStartHijri(safeHijriString(a.getPeriodFrom()))
                .periodEndHijri(safeHijriString(a.getPeriodTo()))
                .poolRevenue(a.getPoolGrossProfit())
                .grossProfit(a.getGrossShareBeforePer())
                .customerShare(a.getCustomerProfitShare())
                .perDeduction(a.getPerAdjustment())
                .irrDeduction(a.getIrrDeduction())
                .netDistributed(a.getNetShareAfterReserves())
                .effectiveRate(a.getEffectiveProfitRate())
                .averageBalance(a.getTotalDailyProduct())
                .status(a.getDistributionStatus())
                .build();
    }

    private PoolInfoDTO buildPoolInfo(MudarabahAccountResponse account) {
        return PoolInfoDTO.builder()
                .poolId(account.getInvestmentPoolId() != null ? String.valueOf(account.getInvestmentPoolId()) : null)
                .poolName(account.getPoolName())
                .totalPoolSize(account.getPoolTotalBalance())
                .poolReturnRate(account.getIndicativeProfitRate())
                .lastUpdated(account.getLastProfitDistributionDate() != null
                        ? account.getLastProfitDistributionDate().toString() : null)
                .build();
    }

    private BigDecimal calculateYtdProfit(List<PoolProfitAllocationResponse> allocations) {
        LocalDate startOfYear = LocalDate.now().withDayOfYear(1);
        return allocations.stream()
                .filter(a -> a.getPeriodFrom() != null && !a.getPeriodFrom().isBefore(startOfYear))
                .map(a -> a.getCustomerProfitShare() != null ? a.getCustomerProfitShare() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String safeHijriString(LocalDate date) {
        if (date == null) return null;
        try {
            HijriDateResponse hijri = hijriCalendarService.toHijri(date);
            return hijri.getHijriDay() + " " + hijri.getHijriMonthName() + " " + hijri.getHijriYear();
        } catch (Exception ex) {
            log.debug("Hijri conversion failed for {}: {}", date, ex.getMessage());
            return null;
        }
    }
}
