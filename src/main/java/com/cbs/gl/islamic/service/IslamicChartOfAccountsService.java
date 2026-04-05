package com.cbs.gl.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.islamic.dto.AaoifiBalanceSheet;
import com.cbs.gl.islamic.dto.CreateIslamicGLAccountRequest;
import com.cbs.gl.islamic.dto.CreateInvestmentPoolRequest;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.InvestmentPoolParticipant;
import com.cbs.gl.islamic.entity.InvestmentPoolParticipantStatus;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
import com.cbs.gl.islamic.entity.ProfitDistributionMethod;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicChartOfAccountsService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final String DEFAULT_UNRESTRICTED_INVESTMENT_GL = "3100-MDR-001";

    private final ChartOfAccountsRepository coaRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final GeneralLedgerService generalLedgerService;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final InvestmentPoolParticipantRepository participantRepository;
    private final AccountRepository accountRepository;
    private final FatwaRecordRepository fatwaRecordRepository;
    private final CurrentTenantResolver currentTenantResolver;
    private final CbsProperties cbsProperties;

    @Transactional
    public ChartOfAccounts createIslamicGLAccount(CreateIslamicGLAccountRequest request) {
        validateIslamicAccountRequest(request);

        ChartOfAccounts account = ChartOfAccounts.builder()
                .glCode(request.getGlCode())
                .glName(request.getGlName())
                .glCategory(request.getGlCategory())
                .glSubCategory(request.getGlSubCategory())
                .parentGlCode(request.getParentGlCode())
                .levelNumber(request.getLevelNumber())
                .isHeader(request.getIsHeader())
                .isPostable(request.getIsPostable())
                .currencyCode(request.getCurrencyCode())
                .isMultiCurrency(request.getIsMultiCurrency())
                .branchCode(request.getBranchCode())
                .isInterBranch(request.getIsInterBranch())
                .normalBalance(request.getNormalBalance())
                .allowManualPosting(request.getAllowManualPosting())
                .requiresCostCentre(request.getRequiresCostCentre())
                .islamicAccountCategory(request.getIslamicAccountCategory())
                .contractTypeCode(IslamicContractSupport.normalize(request.getContractTypeCode()))
                .investmentPoolId(request.getInvestmentPoolId())
                .shariahClassification(request.getShariahClassification())
                .isIslamicAccount(Boolean.TRUE)
                .aaoifiReference(request.getAaoifiReference())
                .aaoifiLineItem(request.getAaoifiLineItem())
                .profitDistributionEligible(Boolean.TRUE.equals(request.getProfitDistributionEligible()))
                .profitDistributionPool(request.getProfitDistributionPool())
                .zakatApplicable(Boolean.TRUE.equals(request.getZakatApplicable()))
                .purificationPercentage(request.getPurificationPercentage())
                .contraAccountCode(request.getContraAccountCode())
                .isReserveAccount(Boolean.TRUE.equals(request.getIsReserveAccount()))
                .reserveType(request.getReserveType())
                .lastReviewDate(request.getLastReviewDate())
                .nextReviewDate(request.getNextReviewDate())
                .reviewedBy(request.getReviewedBy())
                .notes(request.getNotes())
                .build();

        return generalLedgerService.createGlAccount(account);
    }

    public List<ChartOfAccounts> getIslamicAccounts() {
        Map<String, ChartOfAccounts> accountsByCode = new LinkedHashMap<>();

        for (ChartOfAccounts account : coaRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc()) {
            accountsByCode.put(account.getGlCode(), account);
        }

        for (ChartOfAccounts account : coaRepository.findByIslamicAccountCategoryInAndIsActiveTrueOrderByGlCodeAsc(
                List.of(IslamicAccountCategory.values()))) {
            accountsByCode.putIfAbsent(account.getGlCode(), account);
        }

        return accountsByCode.values().stream()
                .sorted(Comparator.comparing(ChartOfAccounts::getGlCode))
                .toList();
    }

    public List<ChartOfAccounts> getAccountsByIslamicCategory(IslamicAccountCategory category) {
        return coaRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(category);
    }

    public List<ChartOfAccounts> getAccountsByContractType(String contractTypeCode) {
        IslamicContractSupport.validate(contractTypeCode);
        return coaRepository.findByContractTypeCodeIgnoreCaseOrderByGlCodeAsc(contractTypeCode);
    }

    public Map<IslamicAccountCategory, List<ChartOfAccounts>> getIslamicChartGroupedByCategory() {
        Map<IslamicAccountCategory, List<ChartOfAccounts>> grouped = new EnumMap<>(IslamicAccountCategory.class);
        for (ChartOfAccounts account : getIslamicAccounts()) {
            grouped.computeIfAbsent(account.getIslamicAccountCategory(), ignored -> new ArrayList<>()).add(account);
        }
        return grouped;
    }

    public AaoifiBalanceSheet generateAaoifiBalanceSheet(LocalDate asOfDate) {
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();
        List<ChartOfAccounts> islamicAccounts = getIslamicAccounts();
        Map<String, BigDecimal> balances = loadBalances(islamicAccounts, effectiveDate);

        AaoifiBalanceSheet sheet = AaoifiBalanceSheet.builder()
                .asOfDate(effectiveDate)
                .currencyCode(cbsProperties.getDeployment().getDefaultCurrency())
                .build();

        AaoifiBalanceSheet.AssetsSection assets = AaoifiBalanceSheet.AssetsSection.builder().build();
        assets.setCashAndEquivalents(sumCategory(islamicAccounts, balances, IslamicAccountCategory.CASH_AND_EQUIVALENTS));

        Map<String, BigDecimal> financingByContract = new LinkedHashMap<>();
        financingByContract.put("MURABAHA", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA));
        financingByContract.put("IJARAH", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_IJARAH));
        financingByContract.put("MUSHARAKAH", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_MUSHARAKAH));
        financingByContract.put("MUDARABAH", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_MUDARABAH));
        financingByContract.put("SALAM", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_SALAM));
        financingByContract.put("ISTISNA", sumCategory(islamicAccounts, balances, IslamicAccountCategory.FINANCING_RECEIVABLE_ISTISNA));
        assets.setFinancingReceivablesByContractType(financingByContract);
        assets.setTotalFinancingReceivables(financingByContract.values().stream().reduce(ZERO, BigDecimal::add));
        assets.setInvestmentsInSukuk(sumCategory(islamicAccounts, balances, IslamicAccountCategory.INVESTMENT_IN_SUKUK));
        assets.setInvestmentsInEquity(sumCategory(islamicAccounts, balances, IslamicAccountCategory.INVESTMENT_IN_EQUITY));
        assets.setIjarahAssetsNet(sumCategory(islamicAccounts, balances, IslamicAccountCategory.IJARAH_ASSETS));
        assets.setMusharakahInvestments(sumCategory(islamicAccounts, balances, IslamicAccountCategory.MUSHARAKAH_INVESTMENT));
        assets.setMudarabahInvestments(sumCategory(islamicAccounts, balances, IslamicAccountCategory.MUDARABAH_INVESTMENT));
        assets.setOtherAssets(sumCategory(islamicAccounts, balances, IslamicAccountCategory.OTHER_ISLAMIC_ASSETS));
        assets.setTotalAssets(assets.getCashAndEquivalents()
                .add(assets.getTotalFinancingReceivables())
                .add(assets.getInvestmentsInSukuk())
                .add(assets.getInvestmentsInEquity())
                .add(assets.getIjarahAssetsNet())
                .add(assets.getMusharakahInvestments())
                .add(assets.getMudarabahInvestments())
                .add(assets.getOtherAssets()));
        sheet.setAssets(assets);

        AaoifiBalanceSheet.LiabilitiesSection liabilities = AaoifiBalanceSheet.LiabilitiesSection.builder().build();
        liabilities.setCurrentAccountsWadiah(sumCategory(islamicAccounts, balances, IslamicAccountCategory.CURRENT_ACCOUNT_WADIAH));
        liabilities.setCurrentAccountsQard(sumCategory(islamicAccounts, balances, IslamicAccountCategory.CURRENT_ACCOUNT_QARD));
        liabilities.setZakatPayable(sumCategory(islamicAccounts, balances, IslamicAccountCategory.ZAKAT_PAYABLE));
        liabilities.setCharityFund(sumCategory(islamicAccounts, balances, IslamicAccountCategory.CHARITY_FUND));
        liabilities.setOtherLiabilities(sumCategory(islamicAccounts, balances, IslamicAccountCategory.OTHER_ISLAMIC_LIABILITIES));
        liabilities.setTotalLiabilities(liabilities.getCurrentAccountsWadiah()
                .add(liabilities.getCurrentAccountsQard())
                .add(liabilities.getZakatPayable())
                .add(liabilities.getCharityFund())
                .add(liabilities.getOtherLiabilities()));
        sheet.setLiabilities(liabilities);

        AaoifiBalanceSheet.UnrestrictedInvestmentAccountsSection unrestricted =
                AaoifiBalanceSheet.UnrestrictedInvestmentAccountsSection.builder().build();
        BigDecimal unrestrictedGrossBalance = sumCategory(
            islamicAccounts,
            balances,
            IslamicAccountCategory.UNRESTRICTED_INVESTMENT_ACCOUNT
        );
        BigDecimal canonicalUnrestrictedBalance = loadCanonicalBalance(
            DEFAULT_UNRESTRICTED_INVESTMENT_GL,
            effectiveDate
        );
        if (canonicalUnrestrictedBalance.compareTo(ZERO) != 0) {
            unrestrictedGrossBalance = canonicalUnrestrictedBalance;
        } else if (unrestrictedGrossBalance.compareTo(ZERO) == 0) {
            unrestrictedGrossBalance = fallbackCanonicalBalance(
                DEFAULT_UNRESTRICTED_INVESTMENT_GL,
                effectiveDate,
                balances
            );
        }
        unrestricted.setGrossBalance(unrestrictedGrossBalance);
        unrestricted.setLessPerReserve(sumCategory(islamicAccounts, balances, IslamicAccountCategory.PROFIT_EQUALISATION_RESERVE));
        unrestricted.setLessIrrReserve(sumCategory(islamicAccounts, balances, IslamicAccountCategory.INVESTMENT_RISK_RESERVE));
        unrestricted.setNetUnrestrictedInvestmentAccounts(unrestricted.getGrossBalance()
                .subtract(unrestricted.getLessPerReserve())
                .subtract(unrestricted.getLessIrrReserve()));
        sheet.setUnrestrictedInvestmentAccounts(unrestricted);

        AaoifiBalanceSheet.RestrictedInvestmentAccountsSection restricted =
                AaoifiBalanceSheet.RestrictedInvestmentAccountsSection.builder().build();
        restricted.setTotalRestrictedInvestments(sumCategory(islamicAccounts, balances, IslamicAccountCategory.RESTRICTED_INVESTMENT_POOL_ASSET));
        restricted.setRestrictedPoolBreakdown(buildRestrictedPoolBreakdown());
        sheet.setRestrictedInvestmentAccounts(restricted);

        AaoifiBalanceSheet.OwnersEquitySection equity = AaoifiBalanceSheet.OwnersEquitySection.builder().build();
        BigDecimal ownersEquity = sumCategory(islamicAccounts, balances, IslamicAccountCategory.OWNERS_EQUITY);
        // Use GL sub-category or aaoifiLineItem instead of brittle string matching on account name
        BigDecimal paidUpCapital = islamicAccounts.stream()
                .filter(account -> account.getIslamicAccountCategory() == IslamicAccountCategory.OWNERS_EQUITY)
                .filter(account -> {
                    // Prefer structured metadata over name-based matching
                    if (containsAccountingKey(account.getAaoifiLineItem(), "PAID_UP_CAPITAL")) {
                        return true;
                    }
                    if (containsAccountingKey(account.getGlSubCategory(), "PAID_UP_CAPITAL")) {
                        return true;
                    }
                    // Fallback to name matching only if no structured metadata available
                    return account.getGlName() != null
                            && account.getGlName().toLowerCase().contains("capital")
                            && (account.getAaoifiLineItem() == null && account.getGlSubCategory() == null);
                })
                .map(account -> signedPresentationAmount(account, balances.getOrDefault(account.getGlCode(), ZERO)))
                .reduce(ZERO, BigDecimal::add);
        equity.setPaidUpCapital(paidUpCapital);
        equity.setReserves(ownersEquity.subtract(paidUpCapital));
        equity.setRetainedEarnings(sumCategory(islamicAccounts, balances, IslamicAccountCategory.RETAINED_EARNINGS_ISLAMIC));
        equity.setFairValueReserve(sumCategory(islamicAccounts, balances, IslamicAccountCategory.FAIR_VALUE_RESERVE_ISLAMIC));
        equity.setTotalOwnersEquity(equity.getPaidUpCapital()
                .add(equity.getReserves())
                .add(equity.getRetainedEarnings())
                .add(equity.getFairValueReserve()));
        sheet.setOwnersEquity(equity);

        BigDecimal totalLiabilitiesAndEquity = liabilities.getTotalLiabilities()
                .add(unrestricted.getNetUnrestrictedInvestmentAccounts())
                .add(equity.getTotalOwnersEquity());
        sheet.setTotalLiabilitiesAndEquity(totalLiabilitiesAndEquity);
        sheet.setIsBalanced(assets.getTotalAssets().subtract(totalLiabilitiesAndEquity).abs().compareTo(new BigDecimal("0.01")) <= 0);
        return sheet;
    }

    @Transactional
    public InvestmentPool createPool(CreateInvestmentPoolRequest request) {
        if (investmentPoolRepository.findByPoolCode(request.getPoolCode()).isPresent()) {
            throw new BusinessException("Investment pool already exists: " + request.getPoolCode(), "DUPLICATE_POOL");
        }
        validateFatwa(request.getFatwaId());
        validateGlCodeIfPresent(request.getGlAssetAccountCode());
        validateGlCodeIfPresent(request.getGlLiabilityAccountCode());
        validateGlCodeIfPresent(request.getGlProfitAccountCode());
        validateGlCodeIfPresent(request.getGlPerAccountCode());
        validateGlCodeIfPresent(request.getGlIrrAccountCode());

        BigDecimal totalRatio = (request.getProfitSharingRatioBank() != null ? request.getProfitSharingRatioBank() : BigDecimal.ZERO)
                .add(request.getProfitSharingRatioInvestors() != null ? request.getProfitSharingRatioInvestors() : BigDecimal.ZERO);
        if (totalRatio.compareTo(new BigDecimal("100")) != 0) {
            throw new BusinessException(
                    "Bank + investor profit sharing ratios must sum to 100, got: " + totalRatio,
                    "INVALID_PROFIT_SHARING_RATIO");
        }

        InvestmentPool pool = InvestmentPool.builder()
                .poolCode(request.getPoolCode().trim().toUpperCase())
                .name(request.getName())
                .nameAr(request.getNameAr())
                .poolType(request.getPoolType())
                .currencyCode(request.getCurrencyCode().trim().toUpperCase())
                .description(request.getDescription())
                .investmentPolicy(request.getInvestmentPolicy())
                .restrictionDetails(request.getRestrictionDetails())
                .bankSharePercentage(scale(request.getBankSharePercentage(), 4))
                .profitSharingRatioBank(scale(request.getProfitSharingRatioBank(), 4))
                .profitSharingRatioInvestors(scale(request.getProfitSharingRatioInvestors(), 4))
                .perPolicyId(request.getPerPolicyId())
                .irrPolicyId(request.getIrrPolicyId())
                .managementFeeType(request.getManagementFeeType())
                .managementFeeRate(scale(request.getManagementFeeRate(), 6))
                .status(request.getStatus() != null ? request.getStatus() : PoolStatus.ACTIVE)
                .inceptionDate(request.getInceptionDate() != null ? request.getInceptionDate() : LocalDate.now())
                .maturityDate(request.getMaturityDate())
                .fatwaId(request.getFatwaId())
                .glAssetAccountCode(request.getGlAssetAccountCode())
                .glLiabilityAccountCode(request.getGlLiabilityAccountCode())
                .glProfitAccountCode(request.getGlProfitAccountCode())
                .glPerAccountCode(request.getGlPerAccountCode())
                .glIrrAccountCode(request.getGlIrrAccountCode())
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        return investmentPoolRepository.save(pool);
    }

    public InvestmentPool getPool(Long poolId) {
        return investmentPoolRepository.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
    }

    public InvestmentPool getPoolByCode(String poolCode) {
        return investmentPoolRepository.findByPoolCode(poolCode)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "poolCode", poolCode));
    }

    public List<InvestmentPool> getActivePools() {
        return investmentPoolRepository.findByStatus(PoolStatus.ACTIVE);
    }

    public List<InvestmentPool> getPools() {
        return investmentPoolRepository.findAll();
    }

    @Transactional
    public void addParticipant(Long poolId, Long accountId, BigDecimal amount) {
        InvestmentPool pool = getPool(poolId);
        ensurePoolCanMutate(pool);
        if (participantRepository.findByAccountId(accountId).isPresent()) {
            throw new BusinessException("Account is already linked to an investment pool participant: " + accountId,
                    "DUPLICATE_POOL_PARTICIPANT");
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        InvestmentPoolParticipant participant = InvestmentPoolParticipant.builder()
                .poolId(poolId)
                .accountId(accountId)
                .customerId(account.getCustomer().getId())
                .participationBalance(scale(amount, 2))
                .profitDistributionMethod(ProfitDistributionMethod.DAILY_PRODUCT)
                .status(InvestmentPoolParticipantStatus.ACTIVE)
                .build();
        participantRepository.save(participant);
        refreshPoolMetrics(poolId);
    }

    @Transactional
    public void removeParticipant(Long poolId, Long accountId, String reason) {
        InvestmentPool pool = getPool(poolId);
        ensurePoolCanMutate(pool);
        InvestmentPoolParticipant participant = participantRepository.findByAccountId(accountId)
                .filter(existing -> existing.getPoolId().equals(poolId))
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPoolParticipant", "accountId", accountId));
        participant.setStatus(InvestmentPoolParticipantStatus.WITHDRAWN);
        participant.setParticipationBalance(ZERO);
        participantRepository.save(participant);
        refreshPoolMetrics(poolId);
        log.info("Investment pool participant removed: pool={}, account={}, reason={}", pool.getPoolCode(), accountId, reason);
    }

    @Transactional
    public void updateParticipantBalance(Long poolId, Long accountId, BigDecimal newBalance) {
        InvestmentPoolParticipant participant = participantRepository.findByAccountId(accountId)
                .filter(existing -> existing.getPoolId().equals(poolId))
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPoolParticipant", "accountId", accountId));
        participant.setParticipationBalance(scale(newBalance, 2));
        participantRepository.save(participant);
        refreshPoolMetrics(poolId);
    }

    public BigDecimal getPoolBalance(Long poolId) {
        BigDecimal balance = participantRepository.sumParticipationBalanceByPoolId(poolId);
        return scale(balance, 2);
    }

    public List<InvestmentPoolParticipant> getPoolParticipants(Long poolId) {
        return participantRepository.findByPoolId(poolId);
    }

    public BigDecimal calculateParticipantWeight(Long poolId, Long accountId) {
        InvestmentPoolParticipant participant = participantRepository.findByAccountId(accountId)
                .filter(existing -> existing.getPoolId().equals(poolId))
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPoolParticipant", "accountId", accountId));
        BigDecimal totalBalance = getPoolBalance(poolId);
        if (totalBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(8, RoundingMode.HALF_UP);
        }
        return participant.getParticipationBalance()
                .divide(totalBalance, 8, RoundingMode.HALF_UP);
    }

    private void validateIslamicAccountRequest(CreateIslamicGLAccountRequest request) {
        if (request.getIslamicAccountCategory() == null) {
            throw new BusinessException("Islamic account category is required", "MISSING_ISLAMIC_ACCOUNT_CATEGORY");
        }
        IslamicContractSupport.validate(request.getContractTypeCode());
        if (request.getInvestmentPoolId() != null) {
            InvestmentPool pool = getPool(request.getInvestmentPoolId());
            if (pool.getStatus() != PoolStatus.ACTIVE) {
                throw new BusinessException("Investment pool must be ACTIVE for GL assignment", "INVALID_POOL_STATUS");
            }
        }
    }

    private void validateFatwa(Long fatwaId) {
        if (fatwaId != null && !fatwaRecordRepository.existsById(fatwaId)) {
            throw new BusinessException("Fatwa not found: " + fatwaId, "INVALID_FATWA");
        }
    }

    private void validateGlCodeIfPresent(String glCode) {
        if (StringUtils.hasText(glCode) && coaRepository.findByGlCode(glCode.trim().toUpperCase()).isEmpty()) {
            throw new BusinessException("GL code not found: " + glCode, "INVALID_GL_CODE");
        }
    }

    private void ensurePoolCanMutate(InvestmentPool pool) {
        if (pool.getStatus() != PoolStatus.ACTIVE && pool.getStatus() != PoolStatus.WINDING_DOWN) {
            throw new BusinessException("Investment pool is not open for participant updates: " + pool.getPoolCode(),
                    "POOL_NOT_MUTABLE");
        }
    }

    private void refreshPoolMetrics(Long poolId) {
        InvestmentPool pool = getPool(poolId);
        BigDecimal total = getPoolBalance(poolId);
        pool.setTotalPoolBalance(total);
        investmentPoolRepository.save(pool);

        List<InvestmentPoolParticipant> activeParticipants =
                participantRepository.findByPoolIdAndStatus(poolId, InvestmentPoolParticipantStatus.ACTIVE);
        for (InvestmentPoolParticipant participant : activeParticipants) {
            participant.setParticipationWeight(total.compareTo(BigDecimal.ZERO) > 0
                    ? participant.getParticipationBalance().divide(total, 8, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(8, RoundingMode.HALF_UP));
        }
        participantRepository.saveAll(activeParticipants);
    }

    private Map<String, BigDecimal> loadBalances(List<ChartOfAccounts> accounts, LocalDate asOfDate) {
        if (accounts.isEmpty()) {
            return Map.of();
        }
        List<String> glCodes = accounts.stream().map(ChartOfAccounts::getGlCode).toList();
        Map<String, BigDecimal> balances = new LinkedHashMap<>();
        for (GlBalance balance : glBalanceRepository.findByGlCodeInAndBalanceDate(glCodes, asOfDate)) {
            balances.merge(balance.getGlCode(), scale(balance.getClosingBalance(), 2), BigDecimal::add);
        }
        return balances;
    }

    private BigDecimal sumCategory(Collection<ChartOfAccounts> accounts,
                                   Map<String, BigDecimal> balances,
                                   IslamicAccountCategory category) {
        return accounts.stream()
                .filter(account -> account.getIslamicAccountCategory() == category)
                .map(account -> signedPresentationAmount(account, balances.getOrDefault(account.getGlCode(), ZERO)))
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal signedPresentationAmount(ChartOfAccounts account, BigDecimal balance) {
        if (balance == null) {
            return ZERO;
        }
        if (account.getNormalBalance() == NormalBalance.CREDIT && account.getGlCategory() == com.cbs.gl.entity.GlCategory.ASSET) {
            return balance.negate();
        }
        if (account.getNormalBalance() == NormalBalance.DEBIT &&
                (account.getGlCategory() == com.cbs.gl.entity.GlCategory.LIABILITY
                        || account.getGlCategory() == com.cbs.gl.entity.GlCategory.EQUITY)) {
            return balance.negate();
        }
        return balance;
    }

    private BigDecimal fallbackCanonicalBalance(String glCode, LocalDate asOfDate, Map<String, BigDecimal> balances) {
        return coaRepository.findByGlCode(glCode)
                .map(account -> {
                    BigDecimal balance = balances.get(glCode);
                    if (balance == null) {
                        balance = glBalanceRepository.findByGlCodeAndBalanceDate(glCode, asOfDate).stream()
                                .map(GlBalance::getClosingBalance)
                                .map(value -> scale(value, 2))
                                .reduce(ZERO, BigDecimal::add);
                    }
                    return signedPresentationAmount(account, balance);
                })
                .orElse(ZERO);
    }

            private BigDecimal loadCanonicalBalance(String glCode, LocalDate asOfDate) {
            return coaRepository.findByGlCode(glCode)
                .map(account -> glBalanceRepository.findByGlCodeAndBalanceDate(glCode, asOfDate).stream()
                    .map(GlBalance::getClosingBalance)
                    .map(value -> scale(value, 2))
                    .reduce(ZERO, BigDecimal::add))
                .orElse(ZERO);
            }

    private boolean containsAccountingKey(String value, String key) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String normalizedValue = value.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_");
        return normalizedValue.contains(key);
    }

    private List<AaoifiBalanceSheet.PoolSummary> buildRestrictedPoolBreakdown() {
        return investmentPoolRepository.findByPoolTypeAndStatus(PoolType.RESTRICTED, PoolStatus.ACTIVE).stream()
                .map(pool -> AaoifiBalanceSheet.PoolSummary.builder()
                        .poolCode(pool.getPoolCode())
                        .name(pool.getName())
                        .balance(getPoolBalance(pool.getId()))
                        .build())
                .toList();
    }

    private BigDecimal scale(BigDecimal value, int scale) {
        return value == null ? BigDecimal.ZERO.setScale(scale, RoundingMode.HALF_UP)
                : value.setScale(scale, RoundingMode.HALF_UP);
    }
}
