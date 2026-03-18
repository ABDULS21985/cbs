package com.cbs.investportfolio.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.investportfolio.entity.InvestPortfolio;
import com.cbs.investportfolio.entity.PortfolioHolding;
import com.cbs.investportfolio.repository.InvestPortfolioRepository;
import com.cbs.investportfolio.repository.PortfolioHoldingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InvestmentPortfolioService {

    private final InvestPortfolioRepository portfolioRepository;
    private final PortfolioHoldingRepository holdingRepository;

    @Transactional
    public InvestPortfolio create(InvestPortfolio portfolio) {
        if (!StringUtils.hasText(portfolio.getPortfolioCode())) {
            portfolio.setPortfolioCode("IPF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        portfolio.setCurrentValue(portfolio.getInitialInvestment());
        portfolio.setTotalContributions(portfolio.getInitialInvestment());
        portfolio.setOpenedAt(Instant.now());
        portfolio.setStatus("ACTIVE");
        InvestPortfolio saved = portfolioRepository.save(portfolio);
        log.info("Portfolio created: {}", saved.getPortfolioCode());
        return saved;
    }

    @Transactional
    public PortfolioHolding addHolding(String portfolioCode, PortfolioHolding holding) {
        InvestPortfolio portfolio = getByCode(portfolioCode);
        holding.setPortfolioId(portfolio.getId());
        holding.setCostBasis(holding.getQuantity().multiply(holding.getAvgCostPrice()));
        if (holding.getCurrentPrice() != null) {
            holding.setMarketValue(holding.getQuantity().multiply(holding.getCurrentPrice()));
            holding.setUnrealizedGainLoss(holding.getMarketValue().subtract(holding.getCostBasis()));
        }
        return holdingRepository.save(holding);
    }

    @Transactional
    public InvestPortfolio valuate(String portfolioCode) {
        InvestPortfolio portfolio = getByCode(portfolioCode);
        List<PortfolioHolding> holdings = holdingRepository.findByPortfolioIdOrderByWeightPctDesc(portfolio.getId());

        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal totalUnrealized = BigDecimal.ZERO;

        for (PortfolioHolding h : holdings) {
            if (h.getMarketValue() != null) {
                totalValue = totalValue.add(h.getMarketValue());
                if (h.getUnrealizedGainLoss() != null) {
                    totalUnrealized = totalUnrealized.add(h.getUnrealizedGainLoss());
                }
            }
        }

        portfolio.setCurrentValue(totalValue);
        portfolio.setUnrealizedGainLoss(totalUnrealized);

        // Recalculate weights
        if (totalValue.compareTo(BigDecimal.ZERO) > 0) {
            for (PortfolioHolding h : holdings) {
                if (h.getMarketValue() != null) {
                    h.setWeightPct(h.getMarketValue()
                            .divide(totalValue, 4, RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100")));
                    holdingRepository.save(h);
                }
            }
        }

        // Calculate return since inception
        if (portfolio.getInitialInvestment() != null && portfolio.getInitialInvestment().compareTo(BigDecimal.ZERO) > 0) {
            portfolio.setReturnSinceInception(
                    totalValue.subtract(portfolio.getInitialInvestment())
                            .divide(portfolio.getInitialInvestment(), 4, RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100")));
        }

        return portfolioRepository.save(portfolio);
    }

    public InvestPortfolio getByCode(String code) {
        return portfolioRepository.findByPortfolioCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("InvestPortfolio", "portfolioCode", code));
    }

    public List<InvestPortfolio> getByCustomer(Long customerId) {
        return portfolioRepository.findByCustomerIdAndStatusOrderByPortfolioNameAsc(customerId, "ACTIVE");
    }

    public List<PortfolioHolding> getHoldings(String portfolioCode) {
        InvestPortfolio portfolio = getByCode(portfolioCode);
        return holdingRepository.findByPortfolioIdOrderByWeightPctDesc(portfolio.getId());
    }
}
