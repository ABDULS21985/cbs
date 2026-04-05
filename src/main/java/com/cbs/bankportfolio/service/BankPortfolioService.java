package com.cbs.bankportfolio.service;

import com.cbs.bankportfolio.entity.BankPortfolio;
import com.cbs.bankportfolio.repository.BankPortfolioRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BankPortfolioService {

    private final BankPortfolioRepository portfolioRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_TYPES = Set.of(
            "TRADING", "BANKING", "HTM", "AFS", "FVTPL", "FVOCI", "INVESTMENT"
    );

    private static final BigDecimal MAX_SINGLE_PORTFOLIO_CONCENTRATION_PCT = new BigDecimal("40");

    @Transactional
    public BankPortfolio create(BankPortfolio p) {
        validatePortfolio(p);

        // Duplicate check on portfolio code
        if (p.getPortfolioCode() != null) {
            portfolioRepository.findByPortfolioCode(p.getPortfolioCode()).ifPresent(existing -> {
                throw new BusinessException("Portfolio with code " + p.getPortfolioCode() + " already exists");
            });
        } else {
            p.setPortfolioCode("PF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }

        if (p.getStatus() == null) {
            p.setStatus("ACTIVE");
        }
        p.setCreatedAt(Instant.now());
        p.setUpdatedAt(Instant.now());

        BankPortfolio saved = portfolioRepository.save(p);
        log.info("Portfolio created by {}: code={}, name={}, type={}",
                actorProvider.getCurrentActor(), saved.getPortfolioCode(), saved.getPortfolioName(), saved.getPortfolioType());
        return saved;
    }

    @Transactional
    public BankPortfolio updateValuation(String portfolioCode, BigDecimal totalValue, BigDecimal unrealizedPnl,
                                          BigDecimal realizedPnlYtd, Integer assetCount) {
        BankPortfolio p = getByCode(portfolioCode);
        if (totalValue != null && totalValue.signum() < 0) {
            throw new BusinessException("Total value cannot be negative");
        }
        p.setTotalValue(totalValue != null ? totalValue : p.getTotalValue());
        p.setUnrealizedPnl(unrealizedPnl != null ? unrealizedPnl : p.getUnrealizedPnl());
        p.setRealizedPnlYtd(realizedPnlYtd != null ? realizedPnlYtd : p.getRealizedPnlYtd());
        p.setAssetCount(assetCount != null ? assetCount : p.getAssetCount());
        p.setUpdatedAt(Instant.now());

        log.info("Portfolio valuation updated by {}: code={}, totalValue={}, unrealizedPnl={}",
                actorProvider.getCurrentActor(), portfolioCode, p.getTotalValue(), p.getUnrealizedPnl());
        return portfolioRepository.save(p);
    }

    /**
     * Calculates total portfolio valuation and P&L across all active portfolios.
     */
    public Map<String, Object> calculateAggregateValuation() {
        List<BankPortfolio> active = portfolioRepository.findByStatusOrderByPortfolioNameAsc("ACTIVE");
        BigDecimal totalMarketValue = BigDecimal.ZERO;
        BigDecimal totalUnrealizedPnl = BigDecimal.ZERO;
        BigDecimal totalRealizedPnlYtd = BigDecimal.ZERO;
        int totalAssets = 0;

        for (BankPortfolio p : active) {
            totalMarketValue = totalMarketValue.add(p.getTotalValue() != null ? p.getTotalValue() : BigDecimal.ZERO);
            totalUnrealizedPnl = totalUnrealizedPnl.add(p.getUnrealizedPnl() != null ? p.getUnrealizedPnl() : BigDecimal.ZERO);
            totalRealizedPnlYtd = totalRealizedPnlYtd.add(p.getRealizedPnlYtd() != null ? p.getRealizedPnlYtd() : BigDecimal.ZERO);
            totalAssets += (p.getAssetCount() != null ? p.getAssetCount() : 0);
        }

        BigDecimal totalPnl = totalUnrealizedPnl.add(totalRealizedPnlYtd);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("portfolioCount", active.size());
        result.put("totalAssets", totalAssets);
        result.put("totalMarketValue", totalMarketValue);
        result.put("totalUnrealizedPnl", totalUnrealizedPnl);
        result.put("totalRealizedPnlYtd", totalRealizedPnlYtd);
        result.put("totalPnl", totalPnl);
        return result;
    }

    /**
     * Calculates P&L for a specific portfolio (current value minus cost basis proxy).
     */
    public Map<String, BigDecimal> calculatePnl(String portfolioCode) {
        BankPortfolio p = getByCode(portfolioCode);
        BigDecimal unrealized = p.getUnrealizedPnl() != null ? p.getUnrealizedPnl() : BigDecimal.ZERO;
        BigDecimal realizedYtd = p.getRealizedPnlYtd() != null ? p.getRealizedPnlYtd() : BigDecimal.ZERO;
        BigDecimal totalPnl = unrealized.add(realizedYtd);
        BigDecimal returnPct = BigDecimal.ZERO;
        BigDecimal costBasis = p.getTotalValue() != null ? p.getTotalValue().subtract(unrealized) : BigDecimal.ZERO;
        if (costBasis.signum() > 0) {
            returnPct = unrealized.divide(costBasis, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
        }

        Map<String, BigDecimal> result = new LinkedHashMap<>();
        result.put("unrealizedPnl", unrealized);
        result.put("realizedPnlYtd", realizedYtd);
        result.put("totalPnl", totalPnl);
        result.put("costBasis", costBasis);
        result.put("returnPct", returnPct);
        return result;
    }

    /**
     * Checks concentration risk across all active portfolios.
     * Returns any portfolio that exceeds the maximum allowed concentration percentage.
     */
    public Map<String, Object> checkConcentrationRisk() {
        List<BankPortfolio> active = portfolioRepository.findByStatusOrderByPortfolioNameAsc("ACTIVE");
        BigDecimal totalValue = active.stream()
                .map(p -> p.getTotalValue() != null ? p.getTotalValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> breaches = new ArrayList<>();
        List<Map<String, Object>> concentrations = new ArrayList<>();

        for (BankPortfolio p : active) {
            BigDecimal pValue = p.getTotalValue() != null ? p.getTotalValue() : BigDecimal.ZERO;
            BigDecimal pct = BigDecimal.ZERO;
            if (totalValue.signum() > 0) {
                pct = pValue.divide(totalValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("portfolioCode", p.getPortfolioCode());
            entry.put("portfolioName", p.getPortfolioName());
            entry.put("type", p.getPortfolioType());
            entry.put("value", pValue);
            entry.put("concentrationPct", pct);
            concentrations.add(entry);

            if (pct.compareTo(MAX_SINGLE_PORTFOLIO_CONCENTRATION_PCT) > 0) {
                entry.put("limit", MAX_SINGLE_PORTFOLIO_CONCENTRATION_PCT);
                breaches.add(entry);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalValue", totalValue);
        result.put("concentrations", concentrations);
        result.put("breaches", breaches);
        result.put("hasBreaches", !breaches.isEmpty());
        return result;
    }

    /**
     * Checks if any portfolio needs rebalancing based on duration or VaR thresholds.
     */
    public List<Map<String, Object>> checkRebalancingNeeded() {
        List<BankPortfolio> active = portfolioRepository.findByStatusOrderByPortfolioNameAsc("ACTIVE");
        List<Map<String, Object>> rebalanceCandidates = new ArrayList<>();

        for (BankPortfolio p : active) {
            List<String> reasons = new ArrayList<>();

            // Check VaR utilization - if var991d exceeds a threshold relative to portfolio value
            if (p.getVar991d() != null && p.getTotalValue() != null && p.getTotalValue().signum() > 0) {
                BigDecimal varPct = p.getVar991d().divide(p.getTotalValue(), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
                if (varPct.compareTo(new BigDecimal("5")) > 0) {
                    reasons.add("VaR exceeds 5% of portfolio value (" + varPct.setScale(2, RoundingMode.HALF_UP) + "%)");
                }
            }

            // Check tracking error
            if (p.getTrackingErrorBps() != null && p.getTrackingErrorBps() > 100) {
                reasons.add("Tracking error exceeds 100bps (" + p.getTrackingErrorBps() + "bps)");
            }

            // Check if portfolio was rebalanced recently
            if (p.getLastRebalancedAt() != null) {
                long daysSinceRebalance = java.time.Duration.between(p.getLastRebalancedAt(), Instant.now()).toDays();
                if (daysSinceRebalance > 90) {
                    reasons.add("Last rebalanced " + daysSinceRebalance + " days ago (>90 days)");
                }
            }

            if (!reasons.isEmpty()) {
                Map<String, Object> candidate = new LinkedHashMap<>();
                candidate.put("portfolioCode", p.getPortfolioCode());
                candidate.put("portfolioName", p.getPortfolioName());
                candidate.put("reasons", reasons);
                rebalanceCandidates.add(candidate);
            }
        }

        log.info("Rebalancing check by {}: {} portfolios flagged", actorProvider.getCurrentActor(), rebalanceCandidates.size());
        return rebalanceCandidates;
    }

    public BankPortfolio getByCode(String code) {
        return portfolioRepository.findByPortfolioCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("BankPortfolio", "portfolioCode", code));
    }

    public List<BankPortfolio> getByType(String type) {
        return portfolioRepository.findByPortfolioTypeAndStatusOrderByPortfolioNameAsc(type, "ACTIVE");
    }

    public List<BankPortfolio> getAll() {
        return portfolioRepository.findByStatusOrderByPortfolioNameAsc("ACTIVE");
    }

    private void validatePortfolio(BankPortfolio p) {
        if (p.getPortfolioName() == null || p.getPortfolioName().isBlank()) {
            throw new BusinessException("Portfolio name is required");
        }
        if (p.getPortfolioType() == null || p.getPortfolioType().isBlank()) {
            throw new BusinessException("Portfolio type is required");
        }
        if (!VALID_TYPES.contains(p.getPortfolioType().toUpperCase())) {
            throw new BusinessException("Invalid portfolio type: " + p.getPortfolioType() + ". Valid types: " + VALID_TYPES);
        }
        if (p.getCurrency() == null || p.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
    }
}
