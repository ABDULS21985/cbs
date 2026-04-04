package com.cbs.gl.islamic.service;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.service.AuditService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.entity.ShariahClassification;
import com.cbs.gl.islamic.dto.IslamicGLMetadataRequest;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicGLMetadataService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final ChartOfAccountsRepository coaRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final AuditService auditService;

    @Transactional
    public void setMetadata(String glAccountCode, IslamicGLMetadataRequest metadata) {
        ChartOfAccounts account = getAccount(glAccountCode);
        validatePool(metadata.getInvestmentPoolId());
        IslamicContractSupport.validate(metadata.getContractTypeCode());

        account.setIsIslamicAccount(Boolean.TRUE);
        if (metadata.getIslamicAccountCategory() != null) {
            account.setIslamicAccountCategory(metadata.getIslamicAccountCategory());
        }
        if (StringUtils.hasText(metadata.getContractTypeCode())) {
            account.setContractTypeCode(IslamicContractSupport.normalize(metadata.getContractTypeCode()));
        }
        if (metadata.getInvestmentPoolId() != null) {
            account.setInvestmentPoolId(metadata.getInvestmentPoolId());
        }
        if (metadata.getShariahClassification() != null) {
            account.setShariahClassification(metadata.getShariahClassification());
        }
        if (metadata.getAaoifiReference() != null) {
            account.setAaoifiReference(metadata.getAaoifiReference());
        }
        if (metadata.getAaoifiLineItem() != null) {
            account.setAaoifiLineItem(metadata.getAaoifiLineItem());
        }
        if (metadata.getProfitDistributionEligible() != null) {
            account.setProfitDistributionEligible(metadata.getProfitDistributionEligible());
        }
        if (metadata.getProfitDistributionPool() != null) {
            account.setProfitDistributionPool(metadata.getProfitDistributionPool());
        }
        if (metadata.getZakatApplicable() != null) {
            account.setZakatApplicable(metadata.getZakatApplicable());
        }
        if (metadata.getPurificationPercentage() != null) {
            account.setPurificationPercentage(metadata.getPurificationPercentage().setScale(4, RoundingMode.HALF_UP));
        }
        if (metadata.getContraAccountCode() != null) {
            account.setContraAccountCode(metadata.getContraAccountCode());
        }
        if (metadata.getIsReserveAccount() != null) {
            account.setIsReserveAccount(metadata.getIsReserveAccount());
        }
        if (metadata.getReserveType() != null) {
            account.setReserveType(metadata.getReserveType());
        }
        if (metadata.getLastReviewDate() != null) {
            account.setLastReviewDate(metadata.getLastReviewDate());
        }
        if (metadata.getNextReviewDate() != null) {
            account.setNextReviewDate(metadata.getNextReviewDate());
        }
        if (metadata.getReviewedBy() != null) {
            account.setReviewedBy(metadata.getReviewedBy());
        }
        if (metadata.getNotes() != null) {
            account.setNotes(metadata.getNotes());
        }
        coaRepository.save(account);
    }

    public ChartOfAccounts getMetadata(String glAccountCode) {
        return getAccount(glAccountCode);
    }

    @Transactional
    public void updateShariahClassification(String glAccountCode, ShariahClassification classification, String reviewedBy) {
        ChartOfAccounts account = getAccount(glAccountCode);
        account.setShariahClassification(classification);
        account.setReviewedBy(StringUtils.hasText(reviewedBy) ? reviewedBy : "SYSTEM");
        account.setLastReviewDate(LocalDate.now());
        account.setNextReviewDate(LocalDate.now().plusYears(1));
        coaRepository.save(account);
        auditService.log("ChartOfAccounts", account.getId(), AuditAction.UPDATE, account.getReviewedBy(),
                "Updated Shariah classification for GL " + account.getGlCode());
    }

    public String resolveFinancingReceivableAccount(String contractTypeCode, String currencyCode) {
        return resolveByCategory(IslamicContractSupport.financingCategoryFor(contractTypeCode), currencyCode);
    }

    public String resolveIncomeAccount(String contractTypeCode) {
        return resolveByCategory(IslamicContractSupport.incomeCategoryFor(contractTypeCode), null);
    }

    public String resolveAccountByCategory(IslamicAccountCategory category, String currencyCode) {
        return resolveByCategory(category, currencyCode);
    }

    public String resolveProfitPayableAccount(Long poolId) {
        if (poolId != null) {
            List<ChartOfAccounts> poolSpecific = coaRepository.findByInvestmentPoolIdOrderByGlCodeAsc(poolId).stream()
                    .filter(account -> account.getIslamicAccountCategory() == IslamicAccountCategory.DEPOSITOR_PROFIT_DISTRIBUTION)
                    .toList();
            if (!poolSpecific.isEmpty()) {
                return poolSpecific.getFirst().getGlCode();
            }
        }
        return resolveByCategory(IslamicAccountCategory.DEPOSITOR_PROFIT_DISTRIBUTION, null);
    }

    public String resolveCharityAccount() {
        return resolveByCategory(IslamicAccountCategory.CHARITY_FUND, null);
    }

    public String resolvePerAccount(Long poolId) {
        if (poolId != null) {
            InvestmentPool pool = getPool(poolId);
            if (StringUtils.hasText(pool.getGlPerAccountCode())) {
                return pool.getGlPerAccountCode();
            }
        }
        return resolveByCategory(IslamicAccountCategory.PROFIT_EQUALISATION_RESERVE, null);
    }

    public String resolveIrrAccount(Long poolId) {
        if (poolId != null) {
            InvestmentPool pool = getPool(poolId);
            if (StringUtils.hasText(pool.getGlIrrAccountCode())) {
                return pool.getGlIrrAccountCode();
            }
        }
        return resolveByCategory(IslamicAccountCategory.INVESTMENT_RISK_RESERVE, null);
    }

    public List<ChartOfAccounts> getAccountsRequiringPurification() {
        return coaRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc().stream()
                .filter(account -> account.getShariahClassification() == ShariahClassification.PURIFICATION_REQUIRED
                        || (account.getPurificationPercentage() != null
                        && account.getPurificationPercentage().compareTo(BigDecimal.ZERO) > 0))
                .toList();
    }

    public List<ChartOfAccounts> getAccountsUnderShariahReview() {
        LocalDate today = LocalDate.now();
        return coaRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc().stream()
                .filter(account -> account.getShariahClassification() == ShariahClassification.UNDER_REVIEW
                        || (account.getNextReviewDate() != null && !account.getNextReviewDate().isAfter(today)))
                .toList();
    }

    public Map<ShariahClassification, BigDecimal> getBalancesByShariahClassification() {
        LocalDate asOfDate = LocalDate.now();
        Map<ShariahClassification, BigDecimal> balances = new EnumMap<>(ShariahClassification.class);
        for (ChartOfAccounts account : coaRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc()) {
            ShariahClassification classification = account.getShariahClassification() != null
                    ? account.getShariahClassification()
                    : ShariahClassification.NOT_APPLICABLE;
            balances.merge(classification, signedAmount(account, balanceFor(account.getGlCode(), asOfDate)), BigDecimal::add);
        }
        return balances;
    }

    public List<ChartOfAccounts> getZakatApplicableAccounts() {
        return coaRepository.findByZakatApplicableTrueAndIsActiveTrueOrderByGlCodeAsc();
    }

    public BigDecimal getTotalZakatableBalance(LocalDate asOfDate) {
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();
        return getZakatApplicableAccounts().stream()
                .map(account -> signedAmount(account, balanceFor(account.getGlCode(), effectiveDate)))
                .filter(amount -> amount.compareTo(BigDecimal.ZERO) > 0)
                .reduce(ZERO, BigDecimal::add);
    }

    private String resolveByCategory(IslamicAccountCategory category, String currencyCode) {
        List<ChartOfAccounts> accounts = coaRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(category).stream()
                .filter(account -> Boolean.TRUE.equals(account.getIsActive()))
                .filter(account -> !StringUtils.hasText(currencyCode)
                        || !StringUtils.hasText(account.getCurrencyCode())
                        || currencyCode.equalsIgnoreCase(account.getCurrencyCode()))
                .toList();
        if (accounts.isEmpty()) {
            throw new BusinessException("No Islamic GL account configured for category: " + category, "MISSING_ISLAMIC_GL_MAPPING");
        }
        return accounts.getFirst().getGlCode();
    }

    private BigDecimal balanceFor(String glCode, LocalDate asOfDate) {
        return glBalanceRepository.findByGlCodeAndBalanceDate(glCode, asOfDate).stream()
                .map(GlBalance::getClosingBalance)
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal signedAmount(ChartOfAccounts account, BigDecimal amount) {
        if (amount == null) {
            return ZERO;
        }
        if (account.getNormalBalance() == NormalBalance.CREDIT && account.getGlCategory() == GlCategory.ASSET) {
            return amount.negate();
        }
        if (account.getNormalBalance() == NormalBalance.DEBIT &&
                (account.getGlCategory() == GlCategory.LIABILITY || account.getGlCategory() == GlCategory.EQUITY)) {
            return amount.negate();
        }
        return amount;
    }

    private ChartOfAccounts getAccount(String glAccountCode) {
        return coaRepository.findByGlCode(glAccountCode)
                .orElseThrow(() -> new ResourceNotFoundException("ChartOfAccounts", "glCode", glAccountCode));
    }

    private void validatePool(Long poolId) {
        if (poolId == null) {
            return;
        }
        InvestmentPool pool = getPool(poolId);
        if (pool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException("Investment pool is not active: " + pool.getPoolCode(), "INVALID_POOL_STATUS");
        }
    }

    private InvestmentPool getPool(Long poolId) {
        return investmentPoolRepository.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
    }
}
