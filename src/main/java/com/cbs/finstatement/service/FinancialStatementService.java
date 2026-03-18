package com.cbs.finstatement.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.finstatement.entity.FinancialStatement;
import com.cbs.finstatement.entity.StatementRatio;
import com.cbs.finstatement.repository.FinancialStatementRepository;
import com.cbs.finstatement.repository.StatementRatioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FinancialStatementService {

    private final FinancialStatementRepository statementRepository;
    private final StatementRatioRepository ratioRepository;

    @Transactional
    public FinancialStatement submit(FinancialStatement statement) {
        statement.setStatementCode("FS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        statement.setStatus("SUBMITTED");
        return statementRepository.save(statement);
    }

    @Transactional
    public FinancialStatement approve(String statementCode) {
        FinancialStatement statement = getByCode(statementCode);
        if (!"SUBMITTED".equals(statement.getStatus())) {
            throw new BusinessException("Financial statement " + statementCode + " must be SUBMITTED to approve; current status: " + statement.getStatus());
        }
        statement.setStatus("APPROVED");
        return statementRepository.save(statement);
    }

    @Transactional
    public List<StatementRatio> calculateRatios(String statementCode) {
        FinancialStatement stmt = getByCode(statementCode);
        List<StatementRatio> ratios = new ArrayList<>();

        // LIQUIDITY
        if (stmt.getCurrentAssets() != null && stmt.getCurrentLiabilities() != null && stmt.getCurrentLiabilities().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal currentRatio = stmt.getCurrentAssets().divide(stmt.getCurrentLiabilities(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "LIQUIDITY", "current_ratio", currentRatio, rateCurrentRatio(currentRatio)));

            BigDecimal quickRatio = stmt.getCurrentAssets().multiply(new BigDecimal("0.8")).divide(stmt.getCurrentLiabilities(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "LIQUIDITY", "quick_ratio", quickRatio, rateQuickRatio(quickRatio)));
        }

        // SOLVENCY
        if (stmt.getTotalLiabilities() != null && stmt.getTotalEquity() != null && stmt.getTotalEquity().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal debtToEquity = stmt.getTotalLiabilities().divide(stmt.getTotalEquity(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "SOLVENCY", "debt_to_equity", debtToEquity, rateDebtToEquity(debtToEquity)));
        }
        if (stmt.getTotalLiabilities() != null && stmt.getTotalAssets() != null && stmt.getTotalAssets().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal debtRatio = stmt.getTotalLiabilities().divide(stmt.getTotalAssets(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "SOLVENCY", "debt_ratio", debtRatio, rateDebtRatio(debtRatio)));
        }

        // PROFITABILITY
        if (stmt.getNetIncome() != null && stmt.getTotalRevenue() != null && stmt.getTotalRevenue().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal netProfitMargin = stmt.getNetIncome().divide(stmt.getTotalRevenue(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
            ratios.add(buildRatio(stmt.getId(), "PROFITABILITY", "net_profit_margin", netProfitMargin, rateProfitMargin(netProfitMargin)));
        }
        if (stmt.getNetIncome() != null && stmt.getTotalAssets() != null && stmt.getTotalAssets().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal roa = stmt.getNetIncome().divide(stmt.getTotalAssets(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
            ratios.add(buildRatio(stmt.getId(), "PROFITABILITY", "return_on_assets", roa, rateProfitMargin(roa)));
        }
        if (stmt.getNetIncome() != null && stmt.getTotalEquity() != null && stmt.getTotalEquity().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal roe = stmt.getNetIncome().divide(stmt.getTotalEquity(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
            ratios.add(buildRatio(stmt.getId(), "PROFITABILITY", "return_on_equity", roe, rateProfitMargin(roe)));
        }

        // EFFICIENCY
        if (stmt.getTotalRevenue() != null && stmt.getTotalAssets() != null && stmt.getTotalAssets().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal assetTurnover = stmt.getTotalRevenue().divide(stmt.getTotalAssets(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "EFFICIENCY", "asset_turnover", assetTurnover, rateAssetTurnover(assetTurnover)));
        }

        // COVERAGE
        if (stmt.getEbitda() != null && stmt.getTotalRevenue() != null && stmt.getTotalRevenue().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal interestProxy = stmt.getTotalRevenue().multiply(new BigDecimal("0.05"));
            if (interestProxy.compareTo(BigDecimal.ZERO) != 0) {
                BigDecimal interestCoverage = stmt.getEbitda().divide(interestProxy, 4, RoundingMode.HALF_UP);
                ratios.add(buildRatio(stmt.getId(), "COVERAGE", "interest_coverage", interestCoverage, rateInterestCoverage(interestCoverage)));
            }
        }

        // LEVERAGE
        if (stmt.getTotalAssets() != null && stmt.getTotalEquity() != null && stmt.getTotalEquity().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal equityMultiplier = stmt.getTotalAssets().divide(stmt.getTotalEquity(), 4, RoundingMode.HALF_UP);
            ratios.add(buildRatio(stmt.getId(), "LEVERAGE", "equity_multiplier", equityMultiplier, rateLeverage(equityMultiplier)));
        }

        return ratioRepository.saveAll(ratios);
    }

    public List<FinancialStatement> getByCustomer(Long customerId) {
        return statementRepository.findByCustomerIdOrderByPeriodEndDateDesc(customerId);
    }

    public List<StatementRatio> getRatios(String statementCode) {
        FinancialStatement stmt = getByCode(statementCode);
        return ratioRepository.findByStatementIdOrderByRatioCategoryAscRatioNameAsc(stmt.getId());
    }

    private FinancialStatement getByCode(String code) {
        return statementRepository.findByStatementCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("FinancialStatement", "statementCode", code));
    }

    private StatementRatio buildRatio(Long statementId, String category, String name, BigDecimal value, String rating) {
        return StatementRatio.builder()
                .statementId(statementId)
                .ratioCategory(category)
                .ratioName(name)
                .ratioValue(value)
                .rating(rating)
                .build();
    }

    private String rateCurrentRatio(BigDecimal v) {
        if (v.compareTo(new BigDecimal("2.0")) >= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("1.5")) >= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("1.0")) >= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("0.5")) >= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateQuickRatio(BigDecimal v) {
        if (v.compareTo(new BigDecimal("1.5")) >= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("1.0")) >= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("0.7")) >= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("0.4")) >= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateDebtToEquity(BigDecimal v) {
        if (v.compareTo(new BigDecimal("0.5")) <= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("1.0")) <= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("2.0")) <= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("3.0")) <= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateDebtRatio(BigDecimal v) {
        if (v.compareTo(new BigDecimal("0.3")) <= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("0.5")) <= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("0.7")) <= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("0.85")) <= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateProfitMargin(BigDecimal v) {
        if (v.compareTo(new BigDecimal("20")) >= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("10")) >= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("5")) >= 0) return "ADEQUATE";
        if (v.compareTo(BigDecimal.ZERO) >= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateAssetTurnover(BigDecimal v) {
        if (v.compareTo(new BigDecimal("2.0")) >= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("1.0")) >= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("0.5")) >= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("0.2")) >= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateInterestCoverage(BigDecimal v) {
        if (v.compareTo(new BigDecimal("5.0")) >= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("3.0")) >= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("1.5")) >= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("1.0")) >= 0) return "WEAK";
        return "CRITICAL";
    }

    private String rateLeverage(BigDecimal v) {
        if (v.compareTo(new BigDecimal("1.5")) <= 0) return "EXCELLENT";
        if (v.compareTo(new BigDecimal("2.0")) <= 0) return "GOOD";
        if (v.compareTo(new BigDecimal("3.0")) <= 0) return "ADEQUATE";
        if (v.compareTo(new BigDecimal("5.0")) <= 0) return "WEAK";
        return "CRITICAL";
    }
}
