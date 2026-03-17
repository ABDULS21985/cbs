package com.cbs.investacct.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import com.cbs.investacct.entity.*;
import com.cbs.investacct.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class InvestmentAccountingService {

    private final InvestmentPortfolioRepository portfolioRepository;
    private final InvestmentValuationRepository valuationRepository;
    private final SecurityHoldingRepository holdingRepository;

    // Portfolio CRUD
    @Transactional
    public InvestmentPortfolio createPortfolio(InvestmentPortfolio portfolio) {
        portfolioRepository.findByPortfolioCode(portfolio.getPortfolioCode()).ifPresent(p -> {
            throw new BusinessException("Portfolio code exists: " + portfolio.getPortfolioCode(), "DUPLICATE_PORTFOLIO");
        });
        InvestmentPortfolio saved = portfolioRepository.save(portfolio);
        log.info("Investment portfolio created: code={}, classification={}", portfolio.getPortfolioCode(), portfolio.getIfrs9Classification());
        return saved;
    }

    public List<InvestmentPortfolio> getAllPortfolios() { return portfolioRepository.findByIsActiveTrueOrderByPortfolioNameAsc(); }

    /**
     * Performs IFRS 9 valuation for a single holding based on its portfolio classification:
     *
     * AMORTISED_COST: carrying = amortised cost, P&L = effective interest, ECL applies
     * FVOCI: carrying = fair value, P&L = effective interest, FV delta → OCI reserve, ECL applies
     * FVTPL: carrying = fair value, P&L = FV delta + interest, no ECL
     */
    @Transactional
    public InvestmentValuation valuateHolding(Long holdingId, BigDecimal fairValue, LocalDate valuationDate) {
        SecurityHolding holding = holdingRepository.findById(holdingId)
                .orElseThrow(() -> new ResourceNotFoundException("SecurityHolding", "id", holdingId));

        String portfolioCode = holding.getPortfolioCode();
        if (portfolioCode == null) throw new BusinessException("Holding has no portfolio assignment", "NO_PORTFOLIO");

        InvestmentPortfolio portfolio = portfolioRepository.findByPortfolioCode(portfolioCode)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPortfolio", "code", portfolioCode));

        Ifrs9Classification classification = portfolio.getIfrs9Classification();
        BigDecimal amortisedCost = holding.getAmortisedCost() != null ? holding.getAmortisedCost() : holding.totalCost();
        BigDecimal interestIncome = holding.dailyCouponAccrual(); // Simplified: one day's accrual

        // Previous valuation for movement tracking
        InvestmentValuation previous = valuationRepository.findTopByHoldingIdOrderByValuationDateDesc(holdingId).orElse(null);

        BigDecimal carryingAmount;
        BigDecimal unrealisedGL = BigDecimal.ZERO;
        BigDecimal ociReserve = BigDecimal.ZERO;
        BigDecimal ociMovement = BigDecimal.ZERO;
        BigDecimal amortisationAmount = BigDecimal.ZERO;

        if (holding.getPremiumDiscount() != null && holding.getPremiumDiscount().compareTo(BigDecimal.ZERO) != 0) {
            long totalDays = java.time.temporal.ChronoUnit.DAYS.between(holding.getSettlementDate(), holding.getMaturityDate());
            if (totalDays > 0) amortisationAmount = holding.getPremiumDiscount().divide(BigDecimal.valueOf(totalDays), 4, RoundingMode.HALF_UP);
        }

        switch (classification) {
            case AMORTISED_COST -> {
                carryingAmount = amortisedCost;
                // No unrealised GL in P&L — stays at amortised cost
            }
            case FVOCI -> {
                carryingAmount = fairValue;
                unrealisedGL = fairValue.subtract(amortisedCost);
                ociReserve = unrealisedGL;
                ociMovement = previous != null ? ociReserve.subtract(previous.getOciReserve()) : ociReserve;
            }
            case FVTPL -> {
                carryingAmount = fairValue;
                unrealisedGL = fairValue.subtract(amortisedCost);
                // All goes to P&L, no OCI
            }
            default -> carryingAmount = amortisedCost;
        }

        // ECL for AMORTISED_COST and FVOCI (not FVTPL)
        Integer eclStage = null;
        BigDecimal eclAmount = BigDecimal.ZERO;
        BigDecimal eclMovement = BigDecimal.ZERO;
        if (classification != Ifrs9Classification.FVTPL) {
            eclStage = 1; // Simplified: use Stage 1 for performing securities
            BigDecimal pdRate = new BigDecimal("0.005"); // 0.5% PD for investment-grade
            BigDecimal lgdRate = new BigDecimal("0.40");
            eclAmount = amortisedCost.multiply(pdRate).multiply(lgdRate).setScale(2, RoundingMode.HALF_UP);
            eclMovement = previous != null ? eclAmount.subtract(previous.getEclAmount()) : eclAmount;
        }

        InvestmentValuation valuation = InvestmentValuation.builder()
                .holdingId(holdingId).portfolioCode(portfolioCode).valuationDate(valuationDate)
                .ifrs9Classification(classification)
                .amortisedCost(amortisedCost).fairValue(fairValue).carryingAmount(carryingAmount)
                .interestIncome(interestIncome).amortisationAmount(amortisationAmount)
                .unrealisedGainLoss(unrealisedGL)
                .eclStage(eclStage).eclAmount(eclAmount).eclMovement(eclMovement)
                .ociReserve(ociReserve).ociMovement(ociMovement).build();

        InvestmentValuation saved = valuationRepository.save(valuation);
        log.info("Investment valuation: holding={}, class={}, carrying={}, ecl={}, oci={}",
                holding.getHoldingRef(), classification, carryingAmount, eclAmount, ociReserve);
        return saved;
    }

    // Summary
    public PortfolioSummary getPortfolioSummary(String portfolioCode, LocalDate date) {
        BigDecimal totalCarrying = valuationRepository.totalCarryingAmount(portfolioCode, date);
        BigDecimal totalEcl = valuationRepository.totalEclByPortfolio(portfolioCode, date);
        return new PortfolioSummary(portfolioCode, date,
                totalCarrying != null ? totalCarrying : BigDecimal.ZERO,
                totalEcl != null ? totalEcl : BigDecimal.ZERO);
    }

    public Page<InvestmentValuation> getValuations(String portfolioCode, LocalDate date, Pageable pageable) {
        return valuationRepository.findByValuationDateAndPortfolioCodeOrderByCarryingAmountDesc(date, portfolioCode, pageable);
    }

    public record PortfolioSummary(String portfolioCode, LocalDate date, BigDecimal totalCarryingAmount, BigDecimal totalEcl) {}
}
