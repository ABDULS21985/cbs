package com.cbs.investportfolio.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public InvestPortfolio create(InvestPortfolio portfolio) {
        // Validation on create
        if (portfolio.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (!StringUtils.hasText(portfolio.getPortfolioName())) {
            throw new BusinessException("Portfolio name is required", "MISSING_PORTFOLIO_NAME");
        }
        if (portfolio.getInitialInvestment() == null || portfolio.getInitialInvestment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Initial investment must be positive", "INVALID_INITIAL_INVESTMENT");
        }

        if (!StringUtils.hasText(portfolio.getPortfolioCode())) {
            portfolio.setPortfolioCode("IPF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        } else {
            // Check for duplicate portfolio code
            portfolioRepository.findByPortfolioCode(portfolio.getPortfolioCode()).ifPresent(existing -> {
                throw new BusinessException("Portfolio code already exists: " + portfolio.getPortfolioCode(),
                        "DUPLICATE_PORTFOLIO_CODE");
            });
        }

        portfolio.setCurrentValue(portfolio.getInitialInvestment());
        portfolio.setTotalContributions(portfolio.getInitialInvestment());
        portfolio.setUnrealizedGainLoss(BigDecimal.ZERO);
        portfolio.setOpenedAt(Instant.now());
        portfolio.setStatus("ACTIVE");
        InvestPortfolio saved = portfolioRepository.save(portfolio);
        log.info("AUDIT: Portfolio created: code={}, customer={}, initial={}, actor={}",
                saved.getPortfolioCode(), saved.getCustomerId(), saved.getInitialInvestment(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public PortfolioHolding addHolding(String portfolioCode, PortfolioHolding holding) {
        InvestPortfolio portfolio = getByCode(portfolioCode);
        if (!"ACTIVE".equals(portfolio.getStatus())) {
            throw new BusinessException("Portfolio must be ACTIVE to add holdings", "PORTFOLIO_NOT_ACTIVE");
        }

        // Validate holding fields
        if (!StringUtils.hasText(holding.getInstrumentCode())) {
            throw new BusinessException("Instrument code is required", "MISSING_INSTRUMENT_CODE");
        }
        if (holding.getQuantity() == null || holding.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Quantity must be positive", "INVALID_QUANTITY");
        }
        if (holding.getAvgCostPrice() == null || holding.getAvgCostPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Average cost price must be positive", "INVALID_COST_PRICE");
        }

        // Duplicate holding check: same instrument in same portfolio
        holdingRepository.findByPortfolioIdAndInstrumentCode(portfolio.getId(), holding.getInstrumentCode())
                .ifPresent(existing -> {
                    throw new BusinessException(
                            "Holding already exists for instrument " + holding.getInstrumentCode()
                                    + " in portfolio " + portfolioCode + ". Use update instead.",
                            "DUPLICATE_HOLDING");
                });

        holding.setPortfolioId(portfolio.getId());
        holding.setCostBasis(holding.getQuantity().multiply(holding.getAvgCostPrice()));
        if (holding.getCurrentPrice() != null) {
            holding.setMarketValue(holding.getQuantity().multiply(holding.getCurrentPrice()));
            holding.setUnrealizedGainLoss(holding.getMarketValue().subtract(holding.getCostBasis()));
        }
        PortfolioHolding saved = holdingRepository.save(holding);
        log.info("AUDIT: Holding added: portfolio={}, instrument={}, qty={}, cost={}, actor={}",
                portfolioCode, holding.getInstrumentCode(), holding.getQuantity(),
                holding.getCostBasis(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public PortfolioHolding updateHoldingPrice(String portfolioCode, String instrumentCode, BigDecimal currentPrice) {
        InvestPortfolio portfolio = getByCode(portfolioCode);
        PortfolioHolding holding = holdingRepository.findByPortfolioIdAndInstrumentCode(portfolio.getId(), instrumentCode)
                .orElseThrow(() -> new ResourceNotFoundException("PortfolioHolding", "instrumentCode", instrumentCode));

        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Current price must be positive", "INVALID_PRICE");
        }

        holding.setCurrentPrice(currentPrice);
        holding.setMarketValue(holding.getQuantity().multiply(currentPrice));
        holding.setUnrealizedGainLoss(holding.getMarketValue().subtract(holding.getCostBasis()));
        holding.setLastPricedAt(Instant.now());

        PortfolioHolding saved = holdingRepository.save(holding);
        log.info("AUDIT: Market price updated: portfolio={}, instrument={}, price={}, marketValue={}, actor={}",
                portfolioCode, instrumentCode, currentPrice, holding.getMarketValue(),
                currentActorProvider.getCurrentActor());
        return saved;
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

        InvestPortfolio saved = portfolioRepository.save(portfolio);
        log.info("AUDIT: Portfolio valuated: code={}, value={}, unrealized={}, return={}%, actor={}",
                portfolioCode, totalValue, totalUnrealized, portfolio.getReturnSinceInception(),
                currentActorProvider.getCurrentActor());
        return saved;
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

    public java.util.List<InvestPortfolio> getAllPortfolios() {
        return portfolioRepository.findAll();
    }

}
