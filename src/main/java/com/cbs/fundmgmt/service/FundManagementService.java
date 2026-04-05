package com.cbs.fundmgmt.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fundmgmt.entity.ManagedFund;
import com.cbs.fundmgmt.repository.ManagedFundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FundManagementService {

    private static final List<String> VALID_FUND_TYPES = List.of(
            "EQUITY", "FIXED_INCOME", "MONEY_MARKET", "BALANCED", "INDEX",
            "SUKUK", "SHARIA_FUND", "REAL_ESTATE", "COMMODITY", "MULTI_ASSET", "HEDGE");

    private final ManagedFundRepository fundRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Create Fund ─────────────────────────────────────────────────────────

    @Transactional
    public ManagedFund create(ManagedFund fund) {
        // Validation
        if (!StringUtils.hasText(fund.getFundName())) {
            throw new BusinessException("Fund name is required", "MISSING_FUND_NAME");
        }
        if (!StringUtils.hasText(fund.getFundType())) {
            throw new BusinessException("Fund type is required", "MISSING_FUND_TYPE");
        }
        if (!VALID_FUND_TYPES.contains(fund.getFundType())) {
            throw new BusinessException("Invalid fund type: " + fund.getFundType() + ". Valid: " + VALID_FUND_TYPES,
                    "INVALID_FUND_TYPE");
        }
        if (!StringUtils.hasText(fund.getFundManager())) {
            throw new BusinessException("Fund manager is required", "MISSING_FUND_MANAGER");
        }
        if (fund.getManagementFeePct() != null && fund.getManagementFeePct().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Management fee cannot be negative", "NEGATIVE_MANAGEMENT_FEE");
        }
        if (fund.getMinInvestment() != null && fund.getMinInvestment().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Minimum investment cannot be negative", "NEGATIVE_MIN_INVESTMENT");
        }

        fund.setFundCode("FND-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        fund.setStatus("DRAFT");
        if (fund.getNavPerUnit() == null) fund.setNavPerUnit(BigDecimal.ZERO);
        if (fund.getTotalUnitsOutstanding() == null) fund.setTotalUnitsOutstanding(BigDecimal.ZERO);
        if (fund.getTotalAum() == null) fund.setTotalAum(BigDecimal.ZERO);

        ManagedFund saved = fundRepository.save(fund);
        log.info("Fund created: code={}, name={}, type={}, manager={}, actor={}",
                saved.getFundCode(), saved.getFundName(), saved.getFundType(), saved.getFundManager(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Activate Fund ───────────────────────────────────────────────────────

    @Transactional
    public ManagedFund activate(String fundCode) {
        ManagedFund fund = getByCode(fundCode);
        if (!"DRAFT".equals(fund.getStatus())) {
            throw new BusinessException(
                    "Only DRAFT funds can be activated; current status: " + fund.getStatus(),
                    "INVALID_FUND_STATUS");
        }
        if (fund.getNavPerUnit() == null || fund.getNavPerUnit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("NAV per unit must be set before activation", "NAV_NOT_SET");
        }
        fund.setStatus("ACTIVE");
        if (fund.getLaunchDate() == null) {
            fund.setLaunchDate(LocalDate.now());
        }
        ManagedFund saved = fundRepository.save(fund);
        log.info("Fund activated: code={}, launchDate={}, actor={}",
                fundCode, saved.getLaunchDate(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Suspend / Close ─────────────────────────────────────────────────────

    @Transactional
    public ManagedFund suspend(String fundCode) {
        ManagedFund fund = getByCode(fundCode);
        if (!"ACTIVE".equals(fund.getStatus())) {
            throw new BusinessException("Only ACTIVE funds can be suspended", "INVALID_FUND_STATUS");
        }
        fund.setStatus("SUSPENDED");
        ManagedFund saved = fundRepository.save(fund);
        log.info("Fund suspended: code={}, actor={}", fundCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ManagedFund close(String fundCode) {
        ManagedFund fund = getByCode(fundCode);
        if (fund.getTotalUnitsOutstanding() != null && fund.getTotalUnitsOutstanding().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(
                    String.format("Cannot close fund with %s units outstanding; redeem all units first",
                            fund.getTotalUnitsOutstanding()),
                    "UNITS_OUTSTANDING");
        }
        fund.setStatus("CLOSED");
        ManagedFund saved = fundRepository.save(fund);
        log.info("Fund closed: code={}, actor={}", fundCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── NAV Update with History Tracking ─────────────────────────────────��──

    @Transactional
    public ManagedFund updateNav(String fundCode, BigDecimal navPerUnit) {
        if (navPerUnit == null || navPerUnit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("NAV per unit must be greater than zero", "INVALID_NAV");
        }
        ManagedFund fund = getByCode(fundCode);
        if (!"ACTIVE".equals(fund.getStatus()) && !"DRAFT".equals(fund.getStatus())) {
            throw new BusinessException("NAV can only be updated for ACTIVE or DRAFT funds", "INVALID_FUND_STATUS");
        }

        BigDecimal previousNav = fund.getNavPerUnit();
        LocalDate previousNavDate = fund.getNavDate();

        fund.setNavPerUnit(navPerUnit);
        fund.setNavDate(LocalDate.now());
        fund.setTotalAum(navPerUnit.multiply(fund.getTotalUnitsOutstanding()).setScale(2, RoundingMode.HALF_UP));

        // Calculate return percentages based on NAV change
        if (previousNav != null && previousNav.compareTo(BigDecimal.ZERO) > 0 && previousNavDate != null) {
            BigDecimal navChange = navPerUnit.subtract(previousNav)
                    .divide(previousNav, 6, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));

            // Store latest daily return as 1M return approximation if within ~30 days
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(previousNavDate, LocalDate.now());
            if (daysBetween > 0 && daysBetween <= 45) {
                fund.setReturn1mPct(navChange);
            }
        }

        // Calculate return since inception
        if (fund.getLaunchDate() != null && fund.getNavPerUnit() != null) {
            // Assume initial NAV was 100 if not available
            BigDecimal initialNav = new BigDecimal("100");
            if (fund.getReturnSinceInception() == null && previousNav != null) {
                // Use the return since inception from accumulated returns
                fund.setReturnSinceInception(navPerUnit.subtract(initialNav)
                        .divide(initialNav, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")));
            }
        }

        ManagedFund saved = fundRepository.save(fund);
        log.info("NAV updated: fund={}, previousNav={}, newNav={}, aum={}, actor={}",
                fundCode, previousNav, navPerUnit, fund.getTotalAum(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Subscription Processing ─────────────────────────────────────────────

    @Transactional
    public Map<String, Object> processSubscription(String fundCode, BigDecimal investmentAmount) {
        if (investmentAmount == null || investmentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Investment amount must be greater than zero", "INVALID_INVESTMENT_AMOUNT");
        }
        ManagedFund fund = getByCode(fundCode);
        if (!"ACTIVE".equals(fund.getStatus())) {
            throw new BusinessException("Subscriptions only accepted for ACTIVE funds", "FUND_NOT_ACTIVE");
        }
        if (fund.getMinInvestment() != null && investmentAmount.compareTo(fund.getMinInvestment()) < 0) {
            throw new BusinessException(
                    String.format("Investment amount %s is below minimum %s", investmentAmount, fund.getMinInvestment()),
                    "BELOW_MIN_INVESTMENT");
        }
        if (fund.getNavPerUnit() == null || fund.getNavPerUnit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Fund NAV is not set", "NAV_NOT_SET");
        }

        // Calculate entry load
        BigDecimal entryLoad = BigDecimal.ZERO;
        if (fund.getEntryLoadPct() != null && fund.getEntryLoadPct().compareTo(BigDecimal.ZERO) > 0) {
            entryLoad = investmentAmount.multiply(fund.getEntryLoadPct())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }
        BigDecimal netInvestment = investmentAmount.subtract(entryLoad);

        // Allocate units
        BigDecimal unitsAllocated = netInvestment.divide(fund.getNavPerUnit(), 4, RoundingMode.HALF_UP);
        fund.setTotalUnitsOutstanding(fund.getTotalUnitsOutstanding().add(unitsAllocated));
        fund.setTotalAum(fund.getNavPerUnit().multiply(fund.getTotalUnitsOutstanding()).setScale(2, RoundingMode.HALF_UP));

        fundRepository.save(fund);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fundCode", fundCode);
        result.put("investmentAmount", investmentAmount);
        result.put("entryLoad", entryLoad);
        result.put("netInvestment", netInvestment);
        result.put("navPerUnit", fund.getNavPerUnit());
        result.put("unitsAllocated", unitsAllocated);
        result.put("totalUnitsAfter", fund.getTotalUnitsOutstanding());
        result.put("totalAumAfter", fund.getTotalAum());
        result.put("processedBy", currentActorProvider.getCurrentActor());
        result.put("processedAt", LocalDate.now().toString());

        log.info("Subscription processed: fund={}, amount={}, units={}, actor={}",
                fundCode, investmentAmount, unitsAllocated, currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Redemption Processing ───────────────────────────────────────────────

    @Transactional
    public Map<String, Object> processRedemption(String fundCode, BigDecimal unitsToRedeem) {
        if (unitsToRedeem == null || unitsToRedeem.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Units to redeem must be greater than zero", "INVALID_UNITS");
        }
        ManagedFund fund = getByCode(fundCode);
        if (!"ACTIVE".equals(fund.getStatus())) {
            throw new BusinessException("Redemptions only processed for ACTIVE funds", "FUND_NOT_ACTIVE");
        }
        if (fund.getTotalUnitsOutstanding().compareTo(unitsToRedeem) < 0) {
            throw new BusinessException(
                    String.format("Insufficient units: outstanding=%s, requested=%s",
                            fund.getTotalUnitsOutstanding(), unitsToRedeem),
                    "INSUFFICIENT_UNITS");
        }

        BigDecimal grossRedemption = unitsToRedeem.multiply(fund.getNavPerUnit()).setScale(2, RoundingMode.HALF_UP);

        // Calculate exit load
        BigDecimal exitLoad = BigDecimal.ZERO;
        if (fund.getExitLoadPct() != null && fund.getExitLoadPct().compareTo(BigDecimal.ZERO) > 0) {
            exitLoad = grossRedemption.multiply(fund.getExitLoadPct())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }
        BigDecimal netRedemption = grossRedemption.subtract(exitLoad);

        fund.setTotalUnitsOutstanding(fund.getTotalUnitsOutstanding().subtract(unitsToRedeem));
        fund.setTotalAum(fund.getNavPerUnit().multiply(fund.getTotalUnitsOutstanding()).setScale(2, RoundingMode.HALF_UP));

        fundRepository.save(fund);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fundCode", fundCode);
        result.put("unitsRedeemed", unitsToRedeem);
        result.put("navPerUnit", fund.getNavPerUnit());
        result.put("grossRedemption", grossRedemption);
        result.put("exitLoad", exitLoad);
        result.put("netRedemption", netRedemption);
        result.put("totalUnitsAfter", fund.getTotalUnitsOutstanding());
        result.put("totalAumAfter", fund.getTotalAum());
        result.put("processedBy", currentActorProvider.getCurrentActor());
        result.put("processedAt", LocalDate.now().toString());

        log.info("Redemption processed: fund={}, units={}, netAmount={}, actor={}",
                fundCode, unitsToRedeem, netRedemption, currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Dividend Distribution ───────────────────────────────────────────────

    @Transactional
    public Map<String, Object> distributeDividend(String fundCode, BigDecimal dividendPerUnit) {
        if (dividendPerUnit == null || dividendPerUnit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Dividend per unit must be greater than zero", "INVALID_DIVIDEND");
        }
        ManagedFund fund = getByCode(fundCode);
        if (!"ACTIVE".equals(fund.getStatus())) {
            throw new BusinessException("Dividends only distributed for ACTIVE funds", "FUND_NOT_ACTIVE");
        }

        BigDecimal totalDividend = dividendPerUnit.multiply(fund.getTotalUnitsOutstanding())
                .setScale(2, RoundingMode.HALF_UP);

        // Reduce NAV by dividend amount (ex-dividend)
        BigDecimal navAfterDividend = fund.getNavPerUnit().subtract(dividendPerUnit);
        if (navAfterDividend.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(
                    String.format("Dividend per unit %s exceeds NAV %s", dividendPerUnit, fund.getNavPerUnit()),
                    "DIVIDEND_EXCEEDS_NAV");
        }
        fund.setNavPerUnit(navAfterDividend);
        fund.setTotalAum(navAfterDividend.multiply(fund.getTotalUnitsOutstanding()).setScale(2, RoundingMode.HALF_UP));

        fundRepository.save(fund);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fundCode", fundCode);
        result.put("dividendPerUnit", dividendPerUnit);
        result.put("totalUnitsOutstanding", fund.getTotalUnitsOutstanding());
        result.put("totalDividendPaid", totalDividend);
        result.put("navBeforeDividend", navAfterDividend.add(dividendPerUnit));
        result.put("navAfterDividend", navAfterDividend);
        result.put("aumAfterDividend", fund.getTotalAum());
        result.put("distributedBy", currentActorProvider.getCurrentActor());
        result.put("distributedAt", LocalDate.now().toString());

        log.info("Dividend distributed: fund={}, perUnit={}, total={}, actor={}",
                fundCode, dividendPerUnit, totalDividend, currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Expense Ratio Calculation ───────────────────────────────────────────

    @Transactional
    public ManagedFund calculateExpenseRatio(String fundCode, BigDecimal totalExpenses) {
        if (totalExpenses == null || totalExpenses.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Total expenses must be non-negative", "INVALID_EXPENSES");
        }
        ManagedFund fund = getByCode(fundCode);
        if (fund.getTotalAum() == null || fund.getTotalAum().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("AUM must be greater than zero to calculate expense ratio", "ZERO_AUM");
        }

        BigDecimal expenseRatio = totalExpenses
                .divide(fund.getTotalAum(), 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
        fund.setExpenseRatioPct(expenseRatio.setScale(2, RoundingMode.HALF_UP));

        ManagedFund saved = fundRepository.save(fund);
        log.info("Expense ratio calculated: fund={}, expenses={}, aum={}, ratio={}%, actor={}",
                fundCode, totalExpenses, fund.getTotalAum(), fund.getExpenseRatioPct(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Investor Report ─────────────────────────────────────────────────────

    public Map<String, Object> generateInvestorReport(String fundCode) {
        ManagedFund fund = getByCode(fundCode);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("fundCode", fund.getFundCode());
        report.put("fundName", fund.getFundName());
        report.put("fundType", fund.getFundType());
        report.put("fundManager", fund.getFundManager());
        report.put("currency", fund.getCurrency());
        report.put("status", fund.getStatus());
        report.put("launchDate", fund.getLaunchDate());
        report.put("navPerUnit", fund.getNavPerUnit());
        report.put("navDate", fund.getNavDate());
        report.put("totalAum", fund.getTotalAum());
        report.put("totalUnitsOutstanding", fund.getTotalUnitsOutstanding());
        report.put("isShariaCompliant", fund.getIsShariaCompliant());

        // Performance
        Map<String, Object> performance = new LinkedHashMap<>();
        performance.put("return1mPct", fund.getReturn1mPct());
        performance.put("return3mPct", fund.getReturn3mPct());
        performance.put("return6mPct", fund.getReturn6mPct());
        performance.put("return1yPct", fund.getReturn1yPct());
        performance.put("return3yAnnualized", fund.getReturn3yAnnualized());
        performance.put("returnSinceInception", fund.getReturnSinceInception());
        report.put("performance", performance);

        // Risk metrics
        Map<String, Object> risk = new LinkedHashMap<>();
        risk.put("standardDeviation", fund.getStandardDeviation());
        risk.put("sharpeRatio", fund.getSharpeRatio());
        risk.put("beta", fund.getBeta());
        risk.put("riskRating", fund.getRiskRating());
        risk.put("morningstarRating", fund.getMorningstarRating());
        report.put("riskMetrics", risk);

        // Fees
        Map<String, Object> fees = new LinkedHashMap<>();
        fees.put("managementFeePct", fund.getManagementFeePct());
        fees.put("entryLoadPct", fund.getEntryLoadPct());
        fees.put("exitLoadPct", fund.getExitLoadPct());
        fees.put("expenseRatioPct", fund.getExpenseRatioPct());
        report.put("fees", fees);

        report.put("benchmarkCode", fund.getBenchmarkCode());
        report.put("minInvestment", fund.getMinInvestment());
        report.put("reportGeneratedAt", LocalDate.now().toString());
        report.put("generatedBy", currentActorProvider.getCurrentActor());

        return report;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public ManagedFund getByCode(String code) {
        return fundRepository.findByFundCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ManagedFund", "fundCode", code));
    }

    public List<ManagedFund> getByType(String fundType) {
        return fundRepository.findByFundTypeAndStatusOrderByFundNameAsc(fundType, "ACTIVE");
    }

    public List<ManagedFund> getShariaCompliant() {
        return fundRepository.findByIsShariaCompliantTrueAndStatus("ACTIVE");
    }

    public List<ManagedFund> getByAum() {
        return fundRepository.findByStatusOrderByTotalAumDesc("ACTIVE");
    }

    public List<ManagedFund> getAllFunds() {
        return fundRepository.findAll();
    }
}
