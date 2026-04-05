package com.cbs.zakat.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatClassificationRule;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.repository.ZakatClassificationRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ZakatClassificationService {

    private static final EnumSet<GlCategory> BALANCE_SHEET_CATEGORIES = EnumSet.of(
            GlCategory.ASSET,
            GlCategory.LIABILITY,
            GlCategory.EQUITY
    );

    private final ZakatClassificationRuleRepository ruleRepository;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final CurrentTenantResolver tenantResolver;

    @Transactional
    public ZakatClassificationRule createRule(ZakatClassificationRule request) {
        ruleRepository.findByRuleCode(request.getRuleCode()).ifPresent(existing -> {
            throw new BusinessException("Zakat classification rule already exists: " + request.getRuleCode(),
                    "DUPLICATE_ZAKAT_CLASSIFICATION_RULE");
        });
        request.setRuleCode(ZakatSupport.normalize(request.getRuleCode()));
        request.setMethodologyCode(ZakatSupport.normalize(request.getMethodologyCode()));
        request.setTenantId(tenantResolver.getCurrentTenantId());
        if (request.getEffectiveFrom() == null) {
            request.setEffectiveFrom(LocalDate.now());
        }
        if (request.getStatus() == null) {
            request.setStatus(request.isApprovedBySsb()
                    ? ZakatDomainEnums.RuleStatus.ACTIVE
                    : ZakatDomainEnums.RuleStatus.UNDER_REVIEW);
        }
        return ruleRepository.save(request);
    }

    @Transactional
    public ZakatClassificationRule updateRule(UUID ruleId, ZakatClassificationRule request) {
        ZakatClassificationRule existing = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatClassificationRule", "id", ruleId));
        if (StringUtils.hasText(request.getName())) {
            existing.setName(request.getName());
        }
        if (request.getNameAr() != null) {
            existing.setNameAr(request.getNameAr());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getDescriptionAr() != null) {
            existing.setDescriptionAr(request.getDescriptionAr());
        }
        if (StringUtils.hasText(request.getGlAccountPattern())) {
            existing.setGlAccountPattern(request.getGlAccountPattern().trim());
        }
        if (request.getIslamicAccountCategory() != null) {
            existing.setIslamicAccountCategory(request.getIslamicAccountCategory());
        }
        if (request.getZakatClassification() != null) {
            existing.setZakatClassification(request.getZakatClassification());
        }
        if (request.getSubCategory() != null) {
            existing.setSubCategory(request.getSubCategory());
        }
        if (request.getValuationMethod() != null) {
            existing.setValuationMethod(request.getValuationMethod());
        }
        existing.setDeductDeferredProfit(request.isDeductDeferredProfit());
        existing.setDeductProvisions(request.isDeductProvisions());
        if (request.getShariahBasis() != null) {
            existing.setShariahBasis(request.getShariahBasis());
        }
        if (request.getZatcaArticleRef() != null) {
            existing.setZatcaArticleRef(request.getZatcaArticleRef());
        }
        existing.setDebated(request.isDebated());
        if (request.getAlternativeClassification() != null) {
            existing.setAlternativeClassification(request.getAlternativeClassification());
        }
        existing.setApprovedBySsb(request.isApprovedBySsb());
        if (request.getSsbApprovalRef() != null) {
            existing.setSsbApprovalRef(request.getSsbApprovalRef());
        }
        if (request.getApprovedByZatca() != null) {
            existing.setApprovedByZatca(request.getApprovedByZatca());
        }
        if (request.getEffectiveFrom() != null) {
            existing.setEffectiveFrom(request.getEffectiveFrom());
        }
        if (request.getEffectiveTo() != null || existing.getEffectiveTo() != null) {
            existing.setEffectiveTo(request.getEffectiveTo());
        }
        if (request.getPriority() != null) {
            existing.setPriority(request.getPriority());
        }
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }
        return ruleRepository.save(existing);
    }

    public ZakatResponses.ZakatClassificationResult classifyGlAccount(String glAccountCode, String methodologyCode) {
        LocalDate asOfDate = LocalDate.now();
        ChartOfAccounts account = chartOfAccountsRepository.findByGlCode(glAccountCode)
                .orElseThrow(() -> new ResourceNotFoundException("ChartOfAccounts", "glCode", glAccountCode));
        BigDecimal balance = glBalanceRepository.findByGlCodeAndBalanceDate(glAccountCode, asOfDate).stream()
                .map(GlBalance::getClosingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, BigDecimal> balancesByKey = balanceSnapshotByKey(asOfDate);
        return classifyAccount(account, balance, account.getCurrencyCode(), methodologyCode, asOfDate,
                loadActiveRules(methodologyCode, asOfDate), balancesByKey);
    }

    public List<ZakatResponses.ZakatClassificationResult> classifyAllAccounts(String methodologyCode, LocalDate asOfDate) {
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();
        List<ZakatClassificationRule> rules = loadActiveRules(methodologyCode, effectiveDate);
        Map<String, BigDecimal> balancesByKey = balanceSnapshotByKey(effectiveDate);
        Map<String, ChartOfAccounts> accountMap = chartOfAccountsRepository.findAll().stream()
                .collect(Collectors.toMap(ChartOfAccounts::getGlCode, item -> item, (left, right) -> left));

        List<ZakatResponses.ZakatClassificationResult> results = new ArrayList<>();
        for (GlBalance balance : glBalanceRepository.findByBalanceDateOrderByGlCodeAsc(effectiveDate)) {
            if (balance.getClosingBalance() == null || balance.getClosingBalance().compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            ChartOfAccounts account = accountMap.get(balance.getGlCode());
            if (account == null || !Boolean.TRUE.equals(account.getIsActive()) || !BALANCE_SHEET_CATEGORIES.contains(account.getGlCategory())) {
                continue;
            }
            results.add(classifyAccount(account, balance.getClosingBalance(), balance.getCurrencyCode(), methodologyCode,
                    effectiveDate, rules, balancesByKey));
        }
        return results;
    }

    public List<String> findUnclassifiedAccounts(String methodologyCode) {
        return classifyAllAccounts(methodologyCode, LocalDate.now()).stream()
                .filter(item -> "UNCLASSIFIED".equalsIgnoreCase(item.getZakatClassification()))
                .map(item -> item.getGlAccountCode() + (StringUtils.hasText(item.getCurrencyCode())
                        ? " [" + item.getCurrencyCode() + "]"
                        : ""))
                .toList();
    }

    public List<ZakatClassificationRule> getRulesForMethodology(String methodologyCode) {
        return ruleRepository.findByMethodologyCodeOrderByPriorityDescRuleCodeAsc(ZakatSupport.normalize(methodologyCode));
    }

    public List<ZakatClassificationRule> getDebatedClassifications() {
        return ruleRepository.findByDebatedTrueOrderByMethodologyCodeAscPriorityDescRuleCodeAsc();
    }

    private ZakatResponses.ZakatClassificationResult classifyAccount(ChartOfAccounts account,
                                                                     BigDecimal balance,
                                                                     String currencyCode,
                                                                     String methodologyCode,
                                                                     LocalDate asOfDate,
                                                                     List<ZakatClassificationRule> rules,
                                                                     Map<String, BigDecimal> balancesByKey) {
        ZakatClassificationRule rule = resolveRule(account, rules);
        BigDecimal rawBalance = ZakatSupport.money(balance);
        if (rule == null) {
            return ZakatResponses.ZakatClassificationResult.builder()
                    .glAccountCode(account.getGlCode())
                    .glAccountName(account.getGlName())
                    .currencyCode(StringUtils.hasText(currencyCode) ? currencyCode : account.getCurrencyCode())
                    .glBalance(rawBalance)
                    .zakatClassification("UNCLASSIFIED")
                    .subCategory(account.getIslamicAccountCategory() != null ? account.getIslamicAccountCategory().name() : null)
                    .valuationMethod(ZakatDomainEnums.ValuationMethod.BOOK_VALUE.name())
                    .adjustedAmount(rawBalance)
                    .includedInZakatBase(false)
                    .exclusionReason("No active Zakat classification rule matched this GL account")
                    .build();
        }

        BigDecimal deferredProfit = rule.isDeductDeferredProfit()
                ? resolveDeferredProfit(account, currencyCode, asOfDate, balancesByKey)
                : BigDecimal.ZERO;
        BigDecimal provisions = rule.isDeductProvisions()
                ? resolveProvisions(account, currencyCode, asOfDate, balancesByKey)
                : BigDecimal.ZERO;

        BigDecimal adjusted = rawBalance.subtract(ZakatSupport.money(deferredProfit)).subtract(ZakatSupport.money(provisions));
        if (adjusted.compareTo(BigDecimal.ZERO) < 0) {
            adjusted = BigDecimal.ZERO;
        }

        boolean included = rule.getZakatClassification() == ZakatDomainEnums.ZakatClassification.ZAKATABLE_ASSET
                || rule.getZakatClassification() == ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY;
        String exclusionReason = included ? null : firstNonBlank(rule.getDescription(), rule.getShariahBasis(), "Excluded by methodology rule");

        return ZakatResponses.ZakatClassificationResult.builder()
                .glAccountCode(account.getGlCode())
                .glAccountName(account.getGlName())
                .currencyCode(StringUtils.hasText(currencyCode) ? currencyCode : account.getCurrencyCode())
                .glBalance(rawBalance)
                .zakatClassification(rule.getZakatClassification().name())
                .subCategory(firstNonBlank(rule.getSubCategory(), account.getIslamicAccountCategory() != null ? account.getIslamicAccountCategory().name() : null))
                .valuationMethod(rule.getValuationMethod().name())
                .adjustedAmount(ZakatSupport.money(adjusted))
                .provisionDeducted(ZakatSupport.money(provisions))
                .deferredProfitDeducted(ZakatSupport.money(deferredProfit))
                .includedInZakatBase(included)
                .classificationRuleCode(rule.getRuleCode())
                .exclusionReason(exclusionReason)
                .debated(rule.isDebated())
                .build();
    }

    private ZakatClassificationRule resolveRule(ChartOfAccounts account, Collection<ZakatClassificationRule> rules) {
        return rules.stream()
                .filter(rule -> ruleMatches(account, rule))
                .sorted(Comparator
                        .comparing((ZakatClassificationRule rule) -> exactMatch(rule.getGlAccountPattern(), account.getGlCode())).reversed()
                        .thenComparing(rule -> specificity(rule.getGlAccountPattern()), Comparator.reverseOrder())
                        .thenComparing(ZakatClassificationRule::getPriority, Comparator.reverseOrder())
                        .thenComparing(ZakatClassificationRule::getRuleCode))
                .findFirst()
                .orElse(null);
    }

    private boolean ruleMatches(ChartOfAccounts account, ZakatClassificationRule rule) {
        boolean patternMatch = ZakatSupport.matchesPattern(rule.getGlAccountPattern(), account.getGlCode());
        boolean categoryMatch = rule.getIslamicAccountCategory() == null
                || rule.getIslamicAccountCategory() == account.getIslamicAccountCategory();
        return patternMatch && categoryMatch;
    }

    private List<ZakatClassificationRule> loadActiveRules(String methodologyCode, LocalDate effectiveDate) {
        return ruleRepository.findByMethodologyCodeAndStatusAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
                        ZakatSupport.normalize(methodologyCode),
                        ZakatDomainEnums.RuleStatus.ACTIVE,
                        effectiveDate)
                .stream()
                .filter(ZakatClassificationRule::isApprovedBySsb)
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(effectiveDate))
                .toList();
    }

    private Map<String, BigDecimal> balanceSnapshotByKey(LocalDate asOfDate) {
        Map<String, BigDecimal> balances = new HashMap<>();
        for (GlBalance balance : glBalanceRepository.findByBalanceDateOrderByGlCodeAsc(asOfDate)) {
            String key = balanceKey(balance.getGlCode(), balance.getCurrencyCode());
            balances.merge(key, ZakatSupport.money(balance.getClosingBalance()), BigDecimal::add);
        }
        return balances;
    }

    private BigDecimal resolveDeferredProfit(ChartOfAccounts account,
                                             String currencyCode,
                                             LocalDate asOfDate,
                                             Map<String, BigDecimal> balancesByKey) {
        List<ChartOfAccounts> linkedContra = chartOfAccountsRepository.findByContraAccountCodeOrderByGlCodeAsc(account.getGlCode());
        BigDecimal linked = linkedContra.stream()
                .filter(item -> item.getNormalBalance() == NormalBalance.CREDIT)
                .filter(item -> item.getIslamicAccountCategory() == account.getIslamicAccountCategory())
                .map(item -> balanceFor(item.getGlCode(), currencyCode, balancesByKey))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (linked.compareTo(BigDecimal.ZERO) > 0) {
            return linked;
        }
        if ("1200-MRB-001".equalsIgnoreCase(account.getGlCode())) {
            return balanceFor("1200-MRB-002", currencyCode, balancesByKey);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal resolveProvisions(ChartOfAccounts account,
                                         String currencyCode,
                                         LocalDate asOfDate,
                                         Map<String, BigDecimal> balancesByKey) {
        List<ChartOfAccounts> linkedContra = chartOfAccountsRepository.findByContraAccountCodeOrderByGlCodeAsc(account.getGlCode());
        BigDecimal linked = linkedContra.stream()
                .filter(item -> item.getGlCode() != null && item.getGlCode().startsWith("1700-"))
                .map(item -> balanceFor(item.getGlCode(), currencyCode, balancesByKey))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (linked.compareTo(BigDecimal.ZERO) > 0) {
            return linked;
        }
        List<String> fallbacks = switch (account.getGlCode().toUpperCase(Locale.ROOT)) {
            case "1200-MRB-001" -> List.of("1700-MRB-001");
            case "1620-IJR-001" -> List.of("1700-IJR-001");
            case "1500-MSH-001" -> List.of("1700-MSH-001");
            case "1500-MDR-001" -> List.of("1700-MDR-001");
            default -> List.of();
        };
        return fallbacks.stream()
                .map(code -> balanceFor(code, currencyCode, balancesByKey))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal balanceFor(String glCode, String currencyCode, Map<String, BigDecimal> balancesByKey) {
        if (!StringUtils.hasText(glCode)) {
            return BigDecimal.ZERO;
        }
        BigDecimal amount = balancesByKey.get(balanceKey(glCode, currencyCode));
        if (amount != null) {
            return amount;
        }
        return balancesByKey.entrySet().stream()
                .filter(entry -> entry.getKey().startsWith(glCode + "::"))
                .map(Map.Entry::getValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean exactMatch(String pattern, String glCode) {
        return StringUtils.hasText(pattern) && pattern.equalsIgnoreCase(glCode);
    }

    private int specificity(String pattern) {
        return pattern == null ? 0 : pattern.replace("*", "").length();
    }

    private String balanceKey(String glCode, String currencyCode) {
        return glCode + "::" + (StringUtils.hasText(currencyCode) ? currencyCode.toUpperCase(Locale.ROOT) : "*");
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}