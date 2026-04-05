package com.cbs.investacct.service;

import com.cbs.common.audit.CurrentActorProvider;
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
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class InvestmentAccountingService {

    // Credit rating to PD mapping (annualized)
    private static final Map<String, BigDecimal> CREDIT_RATING_PD = Map.ofEntries(
            Map.entry("AAA", new BigDecimal("0.0001")),
            Map.entry("AA+", new BigDecimal("0.0002")),
            Map.entry("AA", new BigDecimal("0.0003")),
            Map.entry("AA-", new BigDecimal("0.0005")),
            Map.entry("A+", new BigDecimal("0.0008")),
            Map.entry("A", new BigDecimal("0.001")),
            Map.entry("A-", new BigDecimal("0.0015")),
            Map.entry("BBB+", new BigDecimal("0.003")),
            Map.entry("BBB", new BigDecimal("0.005")),
            Map.entry("BBB-", new BigDecimal("0.01")),
            Map.entry("BB+", new BigDecimal("0.02")),
            Map.entry("BB", new BigDecimal("0.03")),
            Map.entry("BB-", new BigDecimal("0.05")),
            Map.entry("B+", new BigDecimal("0.07")),
            Map.entry("B", new BigDecimal("0.10")),
            Map.entry("CCC", new BigDecimal("0.20")),
            Map.entry("DEFAULT", new BigDecimal("0.005"))
    );

    private final InvestmentPortfolioRepository portfolioRepository;
    private final InvestmentValuationRepository valuationRepository;
    private final SecurityHoldingRepository holdingRepository;
    private final CurrentActorProvider currentActorProvider;

    // Portfolio CRUD
    @Transactional
    public InvestmentPortfolio createPortfolio(InvestmentPortfolio portfolio) {
        portfolioRepository.findByPortfolioCode(portfolio.getPortfolioCode()).ifPresent(p -> {
            throw new BusinessException("Portfolio code exists: " + portfolio.getPortfolioCode(), "DUPLICATE_PORTFOLIO");
        });
        InvestmentPortfolio saved = portfolioRepository.save(portfolio);
        log.info("AUDIT: Investment portfolio created: code={}, classification={}, actor={}",
                portfolio.getPortfolioCode(), portfolio.getIfrs9Classification(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<InvestmentPortfolio> getAllPortfolios() { return portfolioRepository.findByIsActiveTrueOrderByPortfolioNameAsc(); }

    /**
     * Performs SPPI (Solely Payments of Principal and Interest) test for IFRS 9 classification.
     * Returns true if the instrument passes the SPPI test (eligible for amortised cost/FVOCI).
     * Simple heuristic based on security type and coupon structure.
     */
    public boolean performSppiTest(Long holdingId) {
        SecurityHolding holding = holdingRepository.findById(holdingId)
                .orElseThrow(() -> new ResourceNotFoundException("SecurityHolding", "id", holdingId));

        boolean passesSppi = true;
        List<String> failures = new java.util.ArrayList<>();

        // Equity and derivative securities fail SPPI
        if (holding.getSecurityType() != null) {
            String secType = holding.getSecurityType().name().toUpperCase();
            if (secType.contains("EQUITY") || secType.contains("DERIVATIVE") || secType.contains("STRUCTURED")) {
                passesSppi = false;
                failures.add("Security type " + secType + " is not basic lending arrangement");
            }
        }

        // Zero-coupon securities with no face value pass SPPI (discount instruments)
        // Securities with coupon rate pass SPPI (basic interest)
        // Complex structures would need manual override

        log.info("AUDIT: SPPI test: holdingId={}, ref={}, secType={}, result={}, failures={}",
                holdingId, holding.getHoldingRef(), holding.getSecurityType(),
                passesSppi ? "PASS" : "FAIL", failures);
        return passesSppi;
    }

    /**
     * Performs IFRS 9 valuation for a single holding based on its portfolio classification:
     *
     * AMORTISED_COST: carrying = amortised cost, P&L = effective interest, ECL applies
     * FVOCI: carrying = fair value, P&L = effective interest, FV delta -> OCI reserve, ECL applies
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

        // Interest income via effective interest rate approach
        BigDecimal interestIncome;
        BigDecimal amortisationAmount = BigDecimal.ZERO;

        // Use purchase yield as effective interest rate if available
        if (holding.getPurchaseYield() != null && holding.getPurchaseYield().compareTo(BigDecimal.ZERO) > 0) {
            // EIR method: interest = amortised_cost * yield / 365
            interestIncome = amortisedCost
                    .multiply(holding.getPurchaseYield())
                    .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);
        } else {
            interestIncome = holding.dailyCouponAccrual(); // Fallback to simple coupon accrual
        }

        // Premium/discount amortisation
        if (holding.getPremiumDiscount() != null && holding.getPremiumDiscount().compareTo(BigDecimal.ZERO) != 0) {
            long totalDays = ChronoUnit.DAYS.between(holding.getSettlementDate(), holding.getMaturityDate());
            if (totalDays > 0) {
                if (holding.getPurchaseYield() != null && holding.getPurchaseYield().compareTo(BigDecimal.ZERO) > 0) {
                    // EIR-based amortisation: difference between EIR interest and coupon cash flow
                    BigDecimal couponCashFlow = holding.dailyCouponAccrual();
                    amortisationAmount = interestIncome.subtract(couponCashFlow);
                } else {
                    // Straight-line fallback
                    amortisationAmount = holding.getPremiumDiscount().divide(BigDecimal.valueOf(totalDays), 4, RoundingMode.HALF_UP);
                }
            }
        }

        // Previous valuation for movement tracking
        InvestmentValuation previous = valuationRepository.findTopByHoldingIdOrderByValuationDateDesc(holdingId).orElse(null);

        BigDecimal carryingAmount;
        BigDecimal unrealisedGL = BigDecimal.ZERO;
        BigDecimal ociReserve = BigDecimal.ZERO;
        BigDecimal ociMovement = BigDecimal.ZERO;

        switch (classification) {
            case AMORTISED_COST -> {
                carryingAmount = amortisedCost;
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
            }
            default -> carryingAmount = amortisedCost;
        }

        // ECL for AMORTISED_COST and FVOCI (not FVTPL) -- use credit-rating-based PD
        Integer eclStage = null;
        BigDecimal eclAmount = BigDecimal.ZERO;
        BigDecimal eclMovement = BigDecimal.ZERO;
        if (classification != Ifrs9Classification.FVTPL) {
            eclStage = determineEclStage(holding, previous);
            // Use issuer type to infer credit quality for PD lookup
            String creditProxy = inferCreditRating(holding);
            BigDecimal pdRate = lookupPd(creditProxy, eclStage);
            BigDecimal lgdRate = new BigDecimal("0.40"); // standard LGD for senior unsecured
            BigDecimal ead = amortisedCost; // exposure at default

            if (eclStage == 1) {
                // Stage 1: 12-month ECL
                eclAmount = ead.multiply(pdRate).multiply(lgdRate).setScale(2, RoundingMode.HALF_UP);
            } else if (eclStage == 2) {
                // Stage 2: Lifetime ECL (approximate by scaling PD to remaining life)
                long remainingDays = holding.getMaturityDate() != null
                        ? ChronoUnit.DAYS.between(valuationDate, holding.getMaturityDate()) : 365;
                BigDecimal lifetimePd = BigDecimal.ONE.subtract(
                        BigDecimal.ONE.subtract(pdRate).pow((int) Math.max(remainingDays / 365, 1), MathContext.DECIMAL64));
                eclAmount = ead.multiply(lifetimePd).multiply(lgdRate).setScale(2, RoundingMode.HALF_UP);
            } else {
                // Stage 3: credit-impaired - full lifetime ECL with higher LGD
                BigDecimal impairedLgd = lgdRate.multiply(new BigDecimal("1.5")).min(BigDecimal.ONE);
                eclAmount = ead.multiply(pdRate).multiply(impairedLgd).setScale(2, RoundingMode.HALF_UP);
            }
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
        log.info("AUDIT: Investment valuation: holding={}, class={}, carrying={}, ecl={} (stage {}), oci={}, actor={}",
                holding.getHoldingRef(), classification, carryingAmount, eclAmount, eclStage, ociReserve,
                currentActorProvider.getCurrentActor());
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

    /**
     * Determine ECL stage based on credit quality indicators.
     */
    private Integer determineEclStage(SecurityHolding holding, InvestmentValuation previousValuation) {
        // Stage 3: credit-impaired -- check if market price is significantly below amortised cost
        if (holding.getMarketPrice() != null && holding.getAmortisedCost() != null
                && holding.getAmortisedCost().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal priceRatio = holding.getMarketPrice().divide(
                    holding.getAmortisedCost().divide(holding.getFaceValue(), 4, RoundingMode.HALF_UP),
                    4, RoundingMode.HALF_UP);
            if (priceRatio.compareTo(new BigDecimal("0.70")) < 0) {
                return 3; // Market price significantly distressed
            }
            if (priceRatio.compareTo(new BigDecimal("0.85")) < 0) {
                return 2; // Significant deterioration
            }
        }
        // Check previous valuation for stage migration
        if (previousValuation != null && previousValuation.getEclStage() != null && previousValuation.getEclStage() >= 2) {
            return previousValuation.getEclStage(); // maintain stage unless credit quality improves
        }
        // Default: Stage 1 (performing)
        return 1;
    }

    /**
     * Infer credit rating proxy from issuer type for PD lookup.
     */
    private String inferCreditRating(SecurityHolding holding) {
        if (holding.getIssuerType() != null) {
            String issuerType = holding.getIssuerType().toUpperCase();
            if (issuerType.contains("SOVEREIGN") || issuerType.contains("GOVERNMENT")) return "AA";
            if (issuerType.contains("QUASI") || issuerType.contains("AGENCY")) return "A+";
            if (issuerType.contains("BANK") || issuerType.contains("FINANCIAL")) return "A";
            if (issuerType.contains("CORPORATE")) return "BBB";
        }
        return "DEFAULT";
    }

    /**
     * Look up PD based on credit rating and ECL stage.
     */
    private BigDecimal lookupPd(String creditRating, Integer eclStage) {
        if (creditRating == null) {
            return CREDIT_RATING_PD.get("DEFAULT");
        }
        BigDecimal basePd = CREDIT_RATING_PD.getOrDefault(creditRating.toUpperCase().trim(),
                CREDIT_RATING_PD.get("DEFAULT"));
        // For Stage 2/3, use lifetime PD (higher)
        if (eclStage != null && eclStage >= 2) {
            return basePd.multiply(BigDecimal.valueOf(3)); // simplified scaling
        }
        return basePd;
    }

    public record PortfolioSummary(String portfolioCode, LocalDate date, BigDecimal totalCarryingAmount, BigDecimal totalEcl) {}
}
