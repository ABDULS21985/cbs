package com.cbs.gl.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.JournalLine;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.AccountResolutionType;
import com.cbs.gl.islamic.entity.AmountExpressionType;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IslamicPostingEntryType;
import com.cbs.gl.islamic.entity.IslamicPostingRule;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PostingRuleEntry;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.IslamicPostingRuleRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.expression.MapAccessor;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicPostingRuleService {

    private static final Pattern TEMPLATE_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*}}");

    private final IslamicPostingRuleRepository postingRuleRepository;
    private final IslamicGLMetadataService metadataService;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final AccountRepository accountRepository;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;
    private final CbsProperties cbsProperties;

    private final ExpressionParser expressionParser = new SpelExpressionParser();

    @Transactional
    public IslamicPostingRule createRule(IslamicPostingRule request) {
        postingRuleRepository.findByRuleCode(request.getRuleCode()).ifPresent(existing -> {
            throw new BusinessException("Posting rule already exists: " + request.getRuleCode(), "DUPLICATE_POSTING_RULE");
        });
        validateRule(request);
        return postingRuleRepository.save(request);
    }

    @Transactional
    public IslamicPostingRule updateRule(Long ruleId, IslamicPostingRule request) {
        IslamicPostingRule existing = postingRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicPostingRule", "id", ruleId));
        if (StringUtils.hasText(request.getRuleCode())) {
            existing.setRuleCode(request.getRuleCode());
        }
        if (StringUtils.hasText(request.getName())) {
            existing.setName(request.getName());
        }
        existing.setNameAr(request.getNameAr());
        if (StringUtils.hasText(request.getContractTypeCode())) {
            existing.setContractTypeCode(IslamicContractSupport.normalize(request.getContractTypeCode()));
        }
        if (request.getTransactionType() != null) {
            existing.setTransactionType(request.getTransactionType());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getDescriptionAr() != null) {
            existing.setDescriptionAr(request.getDescriptionAr());
        }
        if (request.getEntries() != null && !request.getEntries().isEmpty()) {
            existing.setEntries(request.getEntries());
        }
        existing.setConditionExpression(request.getConditionExpression());
        if (request.getPriority() != null) {
            existing.setPriority(request.getPriority());
        }
        if (request.getEnabled() != null) {
            existing.setEnabled(request.getEnabled());
        }
        if (request.getEffectiveFrom() != null) {
            existing.setEffectiveFrom(request.getEffectiveFrom());
        }
        existing.setEffectiveTo(request.getEffectiveTo());
        existing.setAaoifiReference(request.getAaoifiReference());
        existing.setApprovedBy(request.getApprovedBy());
        existing.setApprovedAt(request.getApprovedAt());
        if (request.getRuleVersion() != null) {
            existing.setRuleVersion(request.getRuleVersion());
        }
        validateRule(existing);
        return postingRuleRepository.save(existing);
    }

    public IslamicPostingRule getRuleByCode(String ruleCode) {
        return postingRuleRepository.findByRuleCode(ruleCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicPostingRule", "ruleCode", ruleCode));
    }

    public List<IslamicPostingRule> getRulesByContractType(String contractTypeCode) {
        return postingRuleRepository.findByContractTypeCodeIgnoreCaseOrderByPriorityDescRuleCodeAsc(contractTypeCode);
    }

    public List<IslamicPostingRule> getRulesByTransactionType(IslamicTransactionType txnType) {
        return postingRuleRepository.findByTransactionTypeOrderByPriorityDescRuleCodeAsc(txnType);
    }

    public List<IslamicPostingRule> getAllRules() {
        return postingRuleRepository.findAll().stream()
                .sorted((left, right) -> {
                    int priorityCompare = Integer.compare(right.getPriority(), left.getPriority());
                    return priorityCompare != 0 ? priorityCompare : left.getRuleCode().compareTo(right.getRuleCode());
                })
                .toList();
    }

    public IslamicPostingRule resolveRule(String contractTypeCode, IslamicTransactionType txnType, Map<String, Object> context) {
        IslamicContractSupport.validate(contractTypeCode);
        String normalizedContractType = IslamicContractSupport.normalize(contractTypeCode);
        LocalDate effectiveDate = resolveEffectiveDate(context);
        return postingRuleRepository
                .findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(txnType, effectiveDate)
                .stream()
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(effectiveDate))
                .filter(rule -> "ALL".equalsIgnoreCase(rule.getContractTypeCode())
                        || normalizedContractType.equalsIgnoreCase(rule.getContractTypeCode()))
                .filter(rule -> matchesCondition(rule.getConditionExpression(), context))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "No Islamic posting rule found for contract=" + contractTypeCode + ", txnType=" + txnType,
                        "POSTING_RULE_NOT_FOUND"));
    }

    public JournalEntry generateJournalEntries(IslamicPostingRequest request) {
        ResolvedJournal resolvedJournal = resolveJournal(request);
        JournalEntry preview = JournalEntry.builder()
                .journalNumber("PREVIEW-" + request.getTxnType() + "-" + (request.getReference() != null ? request.getReference() : "NA"))
                .journalType("SYSTEM")
                .description(resolvedJournal.description())
                .sourceModule("ISLAMIC_GL")
                .sourceRef(request.getReference())
                .valueDate(request.getValueDate() != null ? request.getValueDate() : LocalDate.now())
                .postingDate(request.getValueDate() != null ? request.getValueDate() : LocalDate.now())
                .status("PENDING")
                .createdBy("PREVIEW")
                .build();

        BigDecimal previewFxRate = request.getFxRate() != null ? request.getFxRate() : BigDecimal.ONE;
        int lineNumber = 1;
        for (ResolvedLine line : resolvedJournal.lines()) {
            preview.addLine(JournalLine.builder()
                    .lineNumber(lineNumber++)
                    .glCode(line.glCode())
                    .debitAmount(line.debitAmount())
                    .creditAmount(line.creditAmount())
                    .currencyCode(line.currencyCode())
                    .localDebit(line.debitAmount().multiply(previewFxRate).setScale(2, RoundingMode.HALF_UP))
                    .localCredit(line.creditAmount().multiply(previewFxRate).setScale(2, RoundingMode.HALF_UP))
                    .fxRate(previewFxRate)
                    .narration(line.narration())
                    .branchCode(line.branchCode())
                    .accountId(line.accountId())
                    .customerId(line.customerId())
                    .build());
        }
        return preview;
    }

    @Transactional
    public JournalEntry postIslamicTransaction(IslamicPostingRequest request) {
        ResolvedJournal resolvedJournal = resolveJournal(request);
        BigDecimal effectiveFxRate = request.getFxRate() != null ? request.getFxRate() : BigDecimal.ONE;
        List<GeneralLedgerService.JournalLineRequest> lineRequests = resolvedJournal.lines().stream()
                .map(line -> new GeneralLedgerService.JournalLineRequest(
                        line.glCode(),
                        line.debitAmount(),
                        line.creditAmount(),
                        line.currencyCode(),
                        effectiveFxRate,
                        line.narration(),
                        null,
                        line.branchCode(),
                        line.accountId(),
                        line.customerId()))
                .toList();
        return generalLedgerService.postJournal(
                "SYSTEM",
                resolvedJournal.description(),
                "ISLAMIC_GL",
                request.getReference(),
                request.getValueDate(),
                currentActorProvider.getCurrentActor(),
                lineRequests);
    }

    private ResolvedJournal resolveJournal(IslamicPostingRequest request) {
        LoadedReferences refs = loadReferences(request);
        Map<String, Object> evaluationContext = buildEvaluationContext(request, refs);
        IslamicPostingRule rule = resolveRule(request.getContractTypeCode(), request.getTxnType(), evaluationContext);

        List<ResolvedLine> lines = new ArrayList<>();
        for (PostingRuleEntry entry : rule.getEntries()) {
            BigDecimal amount = resolveAmount(entry, request, evaluationContext);
            if (amount.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            String glCode = resolveAccountCode(entry, request, refs);
            String narration = StringUtils.hasText(request.getNarration())
                    ? request.getNarration()
                    : renderNarration(entry.getNarrationTemplate(), evaluationContext, rule.getName());

            if (entry.getEntryType() == IslamicPostingEntryType.DEBIT) {
                lines.add(new ResolvedLine(
                        glCode,
                        amount,
                        BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                        narration,
                        refs.accountId(),
                        refs.customerId(),
                        resolvedBranchCode(refs.account()),
                        resolvedCurrency(request, refs)));
            } else {
                lines.add(new ResolvedLine(
                        glCode,
                        BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                        amount,
                        narration,
                        refs.accountId(),
                        refs.customerId(),
                        resolvedBranchCode(refs.account()),
                        resolvedCurrency(request, refs)));
            }
        }

        if (lines.isEmpty()) {
            throw new BusinessException("Posting rule resolved to zero-value journal lines", "EMPTY_ISLAMIC_JOURNAL");
        }
        return new ResolvedJournal(lines, StringUtils.hasText(request.getNarration()) ? request.getNarration() : rule.getName());
    }

    private void validateRule(IslamicPostingRule rule) {
        if (!StringUtils.hasText(rule.getRuleCode())) {
            throw new BusinessException("Posting rule code is required", "MISSING_RULE_CODE");
        }
        if (!StringUtils.hasText(rule.getName())) {
            throw new BusinessException("Posting rule name is required", "MISSING_RULE_NAME");
        }
        if (rule.getTransactionType() == null) {
            throw new BusinessException("Posting rule transaction type is required", "MISSING_TRANSACTION_TYPE");
        }
        if (rule.getEntries() == null || rule.getEntries().isEmpty()) {
            throw new BusinessException("Posting rule must contain at least one entry", "MISSING_POSTING_ENTRIES");
        }
        IslamicContractSupport.validate(rule.getContractTypeCode());
        for (PostingRuleEntry entry : rule.getEntries()) {
            if (entry.getEntryType() == null || entry.getAccountResolution() == null || entry.getAmountExpression() == null) {
                throw new BusinessException("Posting rule entries require entryType, accountResolution and amountExpression",
                        "INVALID_POSTING_RULE_ENTRY");
            }
            if (entry.getAccountResolution() == AccountResolutionType.FIXED) {
                if (!StringUtils.hasText(entry.getFixedAccountCode())
                        || chartOfAccountsRepository.findByGlCode(entry.getFixedAccountCode()).isEmpty()) {
                    throw new BusinessException("Fixed posting rule GL code not found: " + entry.getFixedAccountCode(),
                            "INVALID_FIXED_GL_CODE");
                }
            }
        }
    }

    private LoadedReferences loadReferences(IslamicPostingRequest request) {
        Account account = request.getAccountId() != null
                ? accountRepository.findByIdWithProduct(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()))
                : null;
        ProductTemplate productTemplate = request.getProductId() != null
                ? productTemplateRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductTemplate", "id", request.getProductId()))
                : null;
        InvestmentPool pool = request.getPoolId() != null
                ? investmentPoolRepository.findById(request.getPoolId())
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", request.getPoolId()))
                : null;
        if (pool != null && pool.getStatus() == PoolStatus.SUSPENDED) {
            throw new BusinessException("Investment pool is suspended: " + pool.getPoolCode(), "POOL_SUSPENDED");
        }
        return new LoadedReferences(
                account,
                account != null ? account.getId() : null,
                account != null ? account.getCustomer().getId() : null,
                productTemplate,
                pool);
    }

    private Map<String, Object> buildEvaluationContext(IslamicPostingRequest request, LoadedReferences refs) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("transaction", request);
        context.put("contractTypeCode", request.getContractTypeCode());
        context.put("txnType", request.getTxnType());
        context.put("amount", nullSafe(request.getAmount()));
        context.put("principal", nullSafe(request.getPrincipal()));
        context.put("profit", nullSafe(request.getProfit()));
        context.put("markup", nullSafe(request.getMarkup()));
        context.put("rental", nullSafe(request.getRental()));
        context.put("penalty", nullSafe(request.getPenalty()));
        context.put("depreciation", nullSafe(request.getDepreciation()));
        context.put("reference", request.getReference());
        context.put("narration", request.getNarration());
        context.put("valueDate", request.getValueDate());
        context.put("account", refs.account());
        context.put("pool", refs.pool());
        context.put("product", refs.productTemplate());
        if (request.getAdditionalContext() != null) {
            context.putAll(request.getAdditionalContext());
        }
        return context;
    }

    private BigDecimal resolveAmount(PostingRuleEntry entry,
                                     IslamicPostingRequest request,
                                     Map<String, Object> evaluationContext) {
        BigDecimal amount = switch (entry.getAmountExpression()) {
            case FULL_AMOUNT -> nullSafe(request.getAmount());
            case PRINCIPAL -> nullSafe(request.getPrincipal());
            case PROFIT -> nullSafe(request.getProfit());
            case MARKUP -> nullSafe(request.getMarkup());
            case RENTAL -> nullSafe(request.getRental());
            case PENALTY -> nullSafe(request.getPenalty());
            case DEPRECIATION -> nullSafe(request.getDepreciation());
            case CUSTOM -> evaluateBigDecimal(entry.getCustomAmountExpression(), evaluationContext);
        };
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveAccountCode(PostingRuleEntry entry,
                                      IslamicPostingRequest request,
                                      LoadedReferences refs) {
        return switch (entry.getAccountResolution()) {
            case FIXED -> normalizeGlCode(entry.getFixedAccountCode());
            case BY_CONTRACT_TYPE -> resolveByContractType(entry, request, refs);
            case BY_POOL -> resolveByPool(entry, refs.pool());
            case BY_PRODUCT -> resolveByProduct(entry, request, refs);
            case BY_PARAMETER -> resolveByParameter(entry, request, refs);
        };
    }

    private String resolveByContractType(PostingRuleEntry entry, IslamicPostingRequest request, LoadedReferences refs) {
        if (entry.getAccountCategory() != null) {
            return metadataService.resolveAccountByCategory(entry.getAccountCategory(), resolvedCurrency(request, refs));
        }
        return metadataService.resolveFinancingReceivableAccount(request.getContractTypeCode(), resolvedCurrency(request, refs));
    }

    private String resolveByPool(PostingRuleEntry entry, InvestmentPool pool) {
        if (pool == null) {
            throw new BusinessException("Pool-specific Islamic posting requires poolId", "MISSING_POOL_ID");
        }
        if (entry.getAccountCategory() == IslamicAccountCategory.PROFIT_EQUALISATION_RESERVE) {
            return metadataService.resolvePerAccount(pool.getId());
        }
        if (entry.getAccountCategory() == IslamicAccountCategory.INVESTMENT_RISK_RESERVE) {
            return metadataService.resolveIrrAccount(pool.getId());
        }
        if (entry.getAccountCategory() == IslamicAccountCategory.UNRESTRICTED_INVESTMENT_ACCOUNT
                || entry.getAccountCategory() == IslamicAccountCategory.RESTRICTED_INVESTMENT_ACCOUNT
                || entry.getAccountCategory() == IslamicAccountCategory.RESTRICTED_INVESTMENT_POOL_LIABILITY) {
            if (StringUtils.hasText(pool.getGlLiabilityAccountCode())) {
                return pool.getGlLiabilityAccountCode();
            }
        }
        if (entry.getAccountCategory() == IslamicAccountCategory.RESTRICTED_INVESTMENT_POOL_ASSET
                || entry.getAccountCategory() == IslamicAccountCategory.CASH_AND_EQUIVALENTS) {
            if (StringUtils.hasText(pool.getGlAssetAccountCode())) {
                return pool.getGlAssetAccountCode();
            }
        }
        return metadataService.resolveAccountByCategory(entry.getAccountCategory(), null);
    }

    private String resolveByProduct(PostingRuleEntry entry, IslamicPostingRequest request, LoadedReferences refs) {
        if (refs.productTemplate() != null) {
            String key = StringUtils.hasText(entry.getAccountParameter())
                    ? entry.getAccountParameter()
                    : defaultProductKey(entry.getAccountCategory());
            Object value = refs.productTemplate().getGlMapping().get(key);
            if (value instanceof String text && StringUtils.hasText(text)) {
                return normalizeGlCode(text);
            }
        }
        if (refs.account() != null && refs.account().getProduct() != null && StringUtils.hasText(refs.account().getProduct().getGlAccountCode())) {
            return refs.account().getProduct().getGlAccountCode();
        }
        throw new BusinessException("Unable to resolve product GL account for posting request", "MISSING_PRODUCT_GL_MAPPING");
    }

    private String resolveByParameter(PostingRuleEntry entry, IslamicPostingRequest request, LoadedReferences refs) {
        if (StringUtils.hasText(entry.getAccountParameter()) && request.getAdditionalContext() != null) {
            Object contextValue = request.getAdditionalContext().get(entry.getAccountParameter());
            if (contextValue instanceof String text && StringUtils.hasText(text)) {
                return normalizeGlCode(text);
            }
        }
        if (refs.productTemplate() != null && StringUtils.hasText(entry.getAccountParameter())) {
            Object productValue = refs.productTemplate().getGlMapping().get(entry.getAccountParameter());
            if (productValue instanceof String text && StringUtils.hasText(text)) {
                return normalizeGlCode(text);
            }
        }
        if (refs.account() != null && refs.account().getProduct() != null && StringUtils.hasText(refs.account().getProduct().getGlAccountCode())) {
            return refs.account().getProduct().getGlAccountCode();
        }
        if (StringUtils.hasText(entry.getAccountParameter())
                && entry.getAccountParameter().toLowerCase(Locale.ROOT).contains("cash")) {
            return metadataService.resolveAccountByCategory(IslamicAccountCategory.CASH_AND_EQUIVALENTS, null);
        }
        if (entry.getAccountCategory() != null) {
            return metadataService.resolveAccountByCategory(entry.getAccountCategory(), null);
        }
        throw new BusinessException("Unable to resolve account parameter: " + entry.getAccountParameter(),
                "MISSING_PARAMETER_GL_MAPPING");
    }

    private LocalDate resolveEffectiveDate(Map<String, Object> context) {
        Object valueDate = context.get("valueDate");
        if (valueDate instanceof LocalDate localDate) {
            return localDate;
        }
        Object transaction = context.get("transaction");
        if (transaction instanceof IslamicPostingRequest request && request.getValueDate() != null) {
            return request.getValueDate();
        }
        return LocalDate.now();
    }

    private boolean matchesCondition(String conditionExpression, Map<String, Object> evaluationContext) {
        if (!StringUtils.hasText(conditionExpression)) {
            return true;
        }
        Object value = evaluateExpression(conditionExpression, evaluationContext);
        if (!(value instanceof Boolean match)) {
            throw new BusinessException("Posting rule condition must evaluate to boolean: " + conditionExpression,
                    "INVALID_POSTING_RULE_CONDITION");
        }
        return match;
    }

    private Object evaluateExpression(String expression, Map<String, Object> evaluationContext) {
        // Use SimpleEvaluationContext to restrict SpEL to read-only property access (sandboxed)
        SimpleEvaluationContext context = SimpleEvaluationContext
                .forPropertyAccessors(new MapAccessor())
                .build();
        return expressionParser.parseExpression(expression).getValue(context, evaluationContext);
    }

    private BigDecimal evaluateBigDecimal(String expression, Map<String, Object> evaluationContext) {
        Object value = evaluateExpression(expression, evaluationContext);
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private String renderNarration(String template, Map<String, Object> context, String defaultText) {
        if (!StringUtils.hasText(template)) {
            return defaultText;
        }
        Matcher matcher = TEMPLATE_PATTERN.matcher(template);
        StringBuffer rendered = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            Object value = context.get(key);
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(value != null ? value.toString() : ""));
        }
        matcher.appendTail(rendered);
        return rendered.toString();
    }

    private String defaultProductKey(IslamicAccountCategory category) {
        if (category == null) {
            return "glAccountCode";
        }
        return switch (category) {
            case FINANCING_RECEIVABLE_MURABAHA,
                    FINANCING_RECEIVABLE_IJARAH,
                    FINANCING_RECEIVABLE_MUSHARAKAH,
                    FINANCING_RECEIVABLE_MUDARABAH,
                    FINANCING_RECEIVABLE_SALAM,
                    FINANCING_RECEIVABLE_ISTISNA -> "financingAssetGl";
            case OTHER_ISLAMIC_ASSETS -> "profitReceivableGl";
            case MURABAHA_INCOME, IJARAH_INCOME, MUSHARAKAH_INCOME, MUDARABAH_INCOME,
                    SALAM_INCOME, ISTISNA_INCOME, SUKUK_INCOME, WAKALAH_FEE_INCOME -> "incomeGl";
            case CURRENT_ACCOUNT_WADIAH, CURRENT_ACCOUNT_QARD, UNRESTRICTED_INVESTMENT_ACCOUNT -> "liabilityGl";
            default -> "glAccountCode";
        };
    }

    private String resolvedCurrency(IslamicPostingRequest request, LoadedReferences refs) {
        if (request.getAdditionalContext() != null) {
            Object currency = request.getAdditionalContext().get("currencyCode");
            if (currency instanceof String text && StringUtils.hasText(text)) {
                return text.toUpperCase(Locale.ROOT);
            }
        }
        if (refs.account() != null && StringUtils.hasText(refs.account().getCurrencyCode())) {
            return refs.account().getCurrencyCode();
        }
        return cbsProperties.getDeployment().getDefaultCurrency();
    }

    private String resolvedBranchCode(Account account) {
        if (account != null && StringUtils.hasText(account.getBranchCode())) {
            return account.getBranchCode();
        }
        return cbsProperties.getLedger().getDefaultBranchCode();
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String normalizeGlCode(String glCode) {
        ChartOfAccounts account = chartOfAccountsRepository.findByGlCode(glCode)
                .orElseThrow(() -> new BusinessException("GL code not found: " + glCode, "INVALID_GL_CODE"));
        return account.getGlCode();
    }

    private record LoadedReferences(Account account,
                                    Long accountId,
                                    Long customerId,
                                    ProductTemplate productTemplate,
                                    InvestmentPool pool) {
    }

    private record ResolvedLine(String glCode,
                                BigDecimal debitAmount,
                                BigDecimal creditAmount,
                                String narration,
                                Long accountId,
                                Long customerId,
                                String branchCode,
                                String currencyCode) {
    }

    private record ResolvedJournal(List<ResolvedLine> lines, String description) {
    }
}
