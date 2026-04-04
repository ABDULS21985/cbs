package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningAction;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ScreeningPoint;
import com.cbs.shariahcompliance.entity.ScreeningRuleType;
import com.cbs.shariahcompliance.entity.ShariahScreeningResult;
import com.cbs.shariahcompliance.entity.ShariahScreeningRule;
import com.cbs.shariahcompliance.entity.ThresholdOperator;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import com.cbs.shariahcompliance.repository.ShariahScreeningRuleRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.expression.MapAccessor;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ShariahScreeningService {

    private static final AtomicLong SCREENING_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final ShariahScreeningRuleRepository ruleRepository;
    private final ShariahScreeningResultRepository resultRepository;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private final ExpressionParser parser = new SpelExpressionParser();

    public ShariahScreeningResultResponse screen(ShariahScreeningRequest request, ScreeningPoint point) {
        long started = System.currentTimeMillis();
        Map<String, Object> context = buildContext(request);
        List<ShariahScreeningRule> rules = ruleRepository.findByEnabledTrueOrderByPriorityAsc().stream()
                .filter(rule -> isApplicable(rule, request, point))
                .toList();

        List<Map<String, Object>> ruleResults = new ArrayList<>();
        int passed = 0;
        int failed = 0;
        int alerted = 0;
        String blockReason = null;
        String blockReasonAr = null;

        for (ShariahScreeningRule rule : rules) {
            boolean matched = evaluateRule(rule, context);
            Map<String, Object> item = new HashMap<>();
            item.put("ruleCode", rule.getRuleCode());
            item.put("name", rule.getName());
            item.put("action", rule.getAction().name());
            item.put("matched", matched);
            item.put("severity", rule.getSeverity().name());
            ruleResults.add(item);

            if (!matched) {
                passed++;
                continue;
            }

            switch (rule.getAction()) {
                case BLOCK -> {
                    failed++;
                    if (blockReason == null) {
                        blockReason = StringUtils.hasText(rule.getDescription()) ? rule.getDescription() : rule.getName();
                        blockReasonAr = rule.getDescriptionAr();
                    }
                }
                case ALERT, WARN, LOG_ONLY -> alerted++;
            }
        }

        ScreeningOverallResult overall = failed > 0
                ? ScreeningOverallResult.FAIL
                : alerted > 0 ? ScreeningOverallResult.ALERT : ScreeningOverallResult.PASS;
        ScreeningActionTaken actionTaken = failed > 0
                ? ScreeningActionTaken.BLOCKED
                : alerted > 0 ? ScreeningActionTaken.ALLOWED_WITH_ALERT : ScreeningActionTaken.ALLOWED;

        ShariahScreeningResult result = ShariahScreeningResult.builder()
                .screeningRef(nextScreeningRef())
                .transactionRef(request.getTransactionRef())
                .transactionType(request.getTransactionType())
                .transactionAmount(request.getAmount())
                .transactionCurrency(request.getCurrencyCode())
                .contractRef(request.getContractRef())
                .contractTypeCode(request.getContractTypeCode())
                .customerId(request.getCustomerId())
                .counterpartyName(request.getCounterpartyName())
                .merchantCategoryCode(request.getMerchantCategoryCode())
                .overallResult(overall)
                .rulesEvaluated(rules.size())
                .rulesPassed(passed)
                .rulesFailed(failed)
                .rulesAlerted(alerted)
                .ruleResults(ruleResults)
                .actionTaken(actionTaken)
                .blockReason(blockReason)
                .blockReasonAr(blockReasonAr)
                .screenedAt(LocalDateTime.now())
                .screenedBy(actorProvider.getCurrentActor())
                .processingTimeMs(System.currentTimeMillis() - started)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        result = resultRepository.save(result);
        return toResponse(result);
    }

    public void ensurePass(ShariahScreeningRequest request, ScreeningPoint point) {
        ShariahScreeningResultResponse response = screen(request, point);
        if (response.getOverallResult() == ScreeningOverallResult.FAIL) {
            throw new BusinessException(
                    response.getBlockReason() != null ? response.getBlockReason() : "Shariah screening blocked the transaction",
                    "SHARIAH_SCREENING_BLOCKED");
        }
    }

    private boolean isApplicable(ShariahScreeningRule rule, ShariahScreeningRequest request, ScreeningPoint point) {
        if (rule.getScreeningPoint() != ScreeningPoint.BOTH && rule.getScreeningPoint() != point) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (rule.getEffectiveFrom() != null && rule.getEffectiveFrom().isAfter(today)) {
            return false;
        }
        if (rule.getEffectiveTo() != null && rule.getEffectiveTo().isBefore(today)) {
            return false;
        }
        if (rule.getApplicableContractTypes() != null && !rule.getApplicableContractTypes().isEmpty()) {
            String contractType = normalize(request.getContractTypeCode());
            boolean contractMatch = rule.getApplicableContractTypes().stream()
                    .map(this::normalize)
                    .anyMatch(code -> "ALL".equals(code) || code.equals(contractType));
            if (!contractMatch) {
                return false;
            }
        }
        if (rule.getApplicableTransactionTypes() != null && !rule.getApplicableTransactionTypes().isEmpty()) {
            String txnType = normalize(request.getTransactionType());
            boolean txnMatch = rule.getApplicableTransactionTypes().stream()
                    .map(this::normalize)
                    .anyMatch(code -> "ALL".equals(code) || code.equals(txnType));
            if (!txnMatch) {
                return false;
            }
        }
        return true;
    }

    private boolean evaluateRule(ShariahScreeningRule rule, Map<String, Object> context) {
        if (rule.getRuleType() == ScreeningRuleType.CONDITION_EXPRESSION && StringUtils.hasText(rule.getConditionExpression())) {
            StandardEvaluationContext evaluationContext = new StandardEvaluationContext(context);
            evaluationContext.addPropertyAccessor(new MapAccessor());
            context.forEach(evaluationContext::setVariable);
            try {
                Boolean result = parser.parseExpression(rule.getConditionExpression())
                        .getValue(evaluationContext, Boolean.class);
                return Boolean.TRUE.equals(result);
            } catch (RuntimeException ex) {
                log.warn("Unable to evaluate screening rule {}: {}", rule.getRuleCode(), ex.getMessage());
                return false;
            }
        }
        if (rule.getRuleType() == ScreeningRuleType.THRESHOLD) {
            BigDecimal actual = toDecimal(resolveField(context, rule.getThresholdField()));
            BigDecimal from = rule.getThresholdValue();
            BigDecimal to = rule.getThresholdValueTo();
            if (actual == null || from == null || rule.getThresholdOperator() == null) {
                return false;
            }
            return compare(actual, from, to, rule.getThresholdOperator());
        }
        return false;
    }

    private Object resolveField(Map<String, Object> context, String field) {
        if (!StringUtils.hasText(field)) {
            return null;
        }
        if (context.containsKey(field)) {
            return context.get(field);
        }
        Object request = context.get("request");
        if (request instanceof Map<?, ?> map) {
            return map.get(field);
        }
        return null;
    }

    private boolean compare(BigDecimal actual, BigDecimal from, BigDecimal to, ThresholdOperator operator) {
        actual = actual.setScale(4, RoundingMode.HALF_UP);
        from = from.setScale(4, RoundingMode.HALF_UP);
        return switch (operator) {
            case GT -> actual.compareTo(from) > 0;
            case GTE -> actual.compareTo(from) >= 0;
            case LT -> actual.compareTo(from) < 0;
            case LTE -> actual.compareTo(from) <= 0;
            case EQ -> actual.compareTo(from) == 0;
            case BETWEEN -> to != null && actual.compareTo(from) >= 0 && actual.compareTo(to.setScale(4, RoundingMode.HALF_UP)) <= 0;
        };
    }

    private Map<String, Object> buildContext(ShariahScreeningRequest request) {
        Map<String, Object> context = new HashMap<>();
        Map<String, Object> requestMap = new HashMap<>();
        requestMap.put("transactionRef", request.getTransactionRef());
        requestMap.put("transactionType", request.getTransactionType());
        requestMap.put("amount", request.getAmount());
        requestMap.put("currencyCode", request.getCurrencyCode());
        requestMap.put("contractRef", request.getContractRef());
        requestMap.put("contractTypeCode", request.getContractTypeCode());
        requestMap.put("customerId", request.getCustomerId());
        requestMap.put("counterpartyName", request.getCounterpartyName());
        requestMap.put("merchantCategoryCode", request.getMerchantCategoryCode());
        requestMap.put("productId", request.getProductId());
        requestMap.put("purpose", request.getPurpose());
        context.putAll(requestMap);
        context.put("request", requestMap);
        if (request.getAdditionalContext() != null) {
            context.putAll(request.getAdditionalContext());
        }
        return context;
    }

    private BigDecimal toDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private String nextScreeningRef() {
        long seq = Math.floorMod(SCREENING_SEQUENCE.incrementAndGet(), 1_000_000L);
        return "SCR-%d-%06d".formatted(LocalDate.now().getYear(), seq);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private ShariahScreeningResultResponse toResponse(ShariahScreeningResult result) {
        return ShariahScreeningResultResponse.builder()
                .id(result.getId())
                .screeningRef(result.getScreeningRef())
                .transactionRef(result.getTransactionRef())
                .transactionType(result.getTransactionType())
                .transactionAmount(result.getTransactionAmount())
                .transactionCurrency(result.getTransactionCurrency())
                .contractRef(result.getContractRef())
                .contractTypeCode(result.getContractTypeCode())
                .customerId(result.getCustomerId())
                .counterpartyName(result.getCounterpartyName())
                .merchantCategoryCode(result.getMerchantCategoryCode())
                .overallResult(result.getOverallResult())
                .rulesEvaluated(result.getRulesEvaluated())
                .rulesPassed(result.getRulesPassed())
                .rulesFailed(result.getRulesFailed())
                .rulesAlerted(result.getRulesAlerted())
                .ruleResults(result.getRuleResults())
                .actionTaken(result.getActionTaken())
                .blockReason(result.getBlockReason())
                .blockReasonAr(result.getBlockReasonAr())
                .alertId(result.getAlertId())
                .screenedAt(result.getScreenedAt())
                .screenedBy(result.getScreenedBy())
                .processingTimeMs(result.getProcessingTimeMs())
                .tenantId(result.getTenantId())
                .build();
    }
}
