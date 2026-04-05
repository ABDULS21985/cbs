package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.rulesengine.dto.BusinessRuleResponse;
import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.service.BusinessRuleService;
import com.cbs.shariahcompliance.dto.*;
import com.cbs.shariahcompliance.entity.*;
import com.cbs.shariahcompliance.repository.*;
import com.cbs.tenant.service.CurrentTenantResolver;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.MapAccessor;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ShariahScreeningService {

    private final ShariahScreeningRuleRepository ruleRepository;
    private final ShariahExclusionListRepository listRepository;
    private final ShariahExclusionListEntryRepository entryRepository;
    private final ShariahScreeningResultRepository resultRepository;
    private final ShariahComplianceAlertRepository alertRepository;
    private final BusinessRuleService businessRuleService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private final ExpressionParser spelParser = new SpelExpressionParser();

    private static final AtomicLong SCREENING_SEQ = new AtomicLong(System.nanoTime());
    private static final AtomicLong ALERT_SEQ = new AtomicLong(System.nanoTime());

    // ===================== CORE SCREENING =====================

    public ShariahScreeningResultResponse screenTransaction(ShariahScreeningRequest request) {
        if (request == null) {
            throw new BusinessException("Screening request must not be null", "SCREENING_REQUEST_NULL");
        }

        long startTime = System.currentTimeMillis();
        List<ShariahScreeningRule> rules = loadApplicableRules(request);

        List<Map<String, Object>> ruleResults = new ArrayList<>();
        int passed = 0, failed = 0, alerted = 0;
        String blockReason = null;
        String blockReasonAr = null;

        for (ShariahScreeningRule rule : rules) {
            boolean ruleTriggered = evaluateRule(rule, request);
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("ruleCode", rule.getRuleCode());
            detail.put("ruleName", rule.getName());
            detail.put("result", ruleTriggered ? "FAIL" : "PASS");
            detail.put("severity", rule.getSeverity().name());
            detail.put("action", rule.getAction().name());
            ruleResults.add(detail);

            if (!ruleTriggered) {
                passed++;
            } else {
                switch (rule.getAction()) {
                    case BLOCK -> {
                        failed++;
                        if (blockReason == null) {
                            blockReason = StringUtils.hasText(rule.getDescription()) ? rule.getDescription() : rule.getName();
                            blockReasonAr = rule.getDescriptionAr();
                        }
                    }
                    case ALERT -> alerted++;
                    case WARN -> alerted++;
                    case LOG_ONLY -> passed++; // logged but counts as pass
                }
            }
        }

        ScreeningOverallResult overall = failed > 0 ? ScreeningOverallResult.FAIL
                : alerted > 0 ? ScreeningOverallResult.ALERT : ScreeningOverallResult.PASS;
        ScreeningActionTaken actionTaken = failed > 0 ? ScreeningActionTaken.BLOCKED
                : alerted > 0 ? ScreeningActionTaken.ALLOWED_WITH_ALERT : ScreeningActionTaken.ALLOWED;

        ShariahScreeningResult result = ShariahScreeningResult.builder()
                .screeningRef("SSR-" + LocalDate.now().getYear() + "-" + String.format("%06d", SCREENING_SEQ.incrementAndGet()))
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
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        // Create alert if blocked or alerted
        Long alertId = null;
        if (overall == ScreeningOverallResult.FAIL || overall == ScreeningOverallResult.ALERT) {
            ShariahComplianceAlert alert = createAlertFromScreening(result, ruleResults);
            alertId = alert.getId();
            result.setAlertId(alertId);
        }

        result = resultRepository.save(result);
        log.info("Screening completed: ref={}, result={}, action={}, time={}ms",
                result.getScreeningRef(), overall, actionTaken, result.getProcessingTimeMs());
        if (overall == ScreeningOverallResult.FAIL) {
            log.warn("AUDIT: Transaction BLOCKED by Shariah screening - txnRef={}, rule={}, reason={}, actor={}",
                    request.getTransactionRef(), blockReason, result.getBlockReason(),
                    actorProvider.getCurrentActor());
        }
        return toResultResponse(result);
    }

    public ShariahScreeningResultResponse preScreenTransaction(ShariahScreeningRequest request) {
        // Same evaluation logic but does NOT persist
        long startTime = System.currentTimeMillis();
        List<ShariahScreeningRule> rules = loadApplicableRules(request);
        List<Map<String, Object>> ruleResults = new ArrayList<>();
        int passed = 0, failed = 0, alerted = 0;
        String blockReason = null;

        for (ShariahScreeningRule rule : rules) {
            boolean triggered = evaluateRule(rule, request);
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("ruleCode", rule.getRuleCode());
            detail.put("ruleName", rule.getName());
            detail.put("result", triggered ? "FAIL" : "PASS");
            detail.put("severity", rule.getSeverity().name());
            detail.put("action", rule.getAction().name());
            ruleResults.add(detail);
            if (!triggered) { passed++; }
            else if (rule.getAction() == ScreeningAction.BLOCK) { failed++; blockReason = rule.getName(); }
            else { alerted++; }
        }

        ScreeningOverallResult overall = failed > 0 ? ScreeningOverallResult.FAIL
                : alerted > 0 ? ScreeningOverallResult.ALERT : ScreeningOverallResult.PASS;

        return ShariahScreeningResultResponse.builder()
                .screeningRef("PREVIEW")
                .transactionRef(request.getTransactionRef())
                .overallResult(overall)
                .rulesEvaluated(rules.size())
                .rulesPassed(passed).rulesFailed(failed).rulesAlerted(alerted)
                .ruleResults(ruleResults)
                .actionTaken(failed > 0 ? ScreeningActionTaken.BLOCKED : ScreeningActionTaken.ALLOWED)
                .blockReason(blockReason)
                .screenedAt(LocalDateTime.now())
                .processingTimeMs(System.currentTimeMillis() - startTime)
                .build();
    }

    public ShariahScreeningResultResponse screenPreExecution(ShariahScreeningRequest request) {
        return screenTransaction(request);
    }

    public void ensureAllowed(ShariahScreeningResultResponse result) {
        if (result != null && result.getActionTaken() == ScreeningActionTaken.BLOCKED) {
            throw new BusinessException(
                    StringUtils.hasText(result.getBlockReason()) ? result.getBlockReason() : "Shariah screening blocked execution",
                    "SHARIAH_SCREENING_BLOCKED");
        }
    }

    public List<ShariahScreeningResultResponse> batchScreen(List<ShariahScreeningRequest> requests) {
        return requests.stream().map(this::screenTransaction).toList();
    }

    // ===================== RULE MANAGEMENT =====================

    public ScreeningRuleResponse createRule(CreateScreeningRuleRequest request) {
        if (ruleRepository.findByRuleCode(request.getRuleCode()).isPresent()) {
            throw new BusinessException("Screening rule already exists: " + request.getRuleCode(), "DUPLICATE_RULE");
        }
        ShariahScreeningRule rule = ShariahScreeningRule.builder()
                .ruleCode(request.getRuleCode())
                .name(request.getName()).nameAr(request.getNameAr())
                .description(request.getDescription())
                .category(ScreeningCategory.valueOf(request.getCategory()))
                .applicableTransactionTypes(request.getApplicableTransactionTypes())
                .applicableContractTypes(request.getApplicableContractTypes())
                .screeningPoint(ScreeningPoint.PRE_EXECUTION)
                .action(ScreeningAction.valueOf(request.getAction()))
                .severity(request.getSeverity() != null ? ScreeningSeverity.valueOf(request.getSeverity()) : ScreeningSeverity.MEDIUM)
                .ruleType(ScreeningRuleType.valueOf(request.getRuleType()))
                .businessRuleCode(request.getBusinessRuleCode())
                .conditionExpression(request.getConditionExpression())
                .thresholdField(request.getThresholdField())
                .thresholdOperator(request.getThresholdOperator() != null ? ThresholdOperator.valueOf(request.getThresholdOperator()) : null)
                .thresholdValue(request.getThresholdValue())
                .referenceListCode(request.getReferenceListCode())
                .shariahReference(request.getShariahReference())
                .approvedBy(actorProvider.getCurrentActor())
                .approvedAt(LocalDateTime.now())
                .effectiveFrom(request.getEffectiveFrom())
                .enabled(true)
                .priority(request.getPriority() != null ? request.getPriority() : 100)
                .build();
        rule = ruleRepository.save(rule);
        log.info("Screening rule created: {}", rule.getRuleCode());
        return toRuleResponse(rule);
    }

    public ScreeningRuleResponse updateRule(Long ruleId, CreateScreeningRuleRequest request) {
        ShariahScreeningRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening rule not found: " + ruleId));
        rule.setName(request.getName());
        rule.setNameAr(request.getNameAr());
        rule.setDescription(request.getDescription());
        if (request.getCategory() != null) rule.setCategory(ScreeningCategory.valueOf(request.getCategory()));
        if (request.getAction() != null) rule.setAction(ScreeningAction.valueOf(request.getAction()));
        if (request.getSeverity() != null) rule.setSeverity(ScreeningSeverity.valueOf(request.getSeverity()));
        if (request.getRuleType() != null) rule.setRuleType(ScreeningRuleType.valueOf(request.getRuleType()));
        rule.setBusinessRuleCode(request.getBusinessRuleCode());
        rule.setConditionExpression(request.getConditionExpression());
        rule.setThresholdField(request.getThresholdField());
        rule.setThresholdValue(request.getThresholdValue());
        rule.setReferenceListCode(request.getReferenceListCode());
        rule.setShariahReference(request.getShariahReference());
        rule.setApplicableTransactionTypes(request.getApplicableTransactionTypes());
        rule.setApplicableContractTypes(request.getApplicableContractTypes());
        if (request.getPriority() != null) rule.setPriority(request.getPriority());
        rule = ruleRepository.save(rule);
        return toRuleResponse(rule);
    }

    public void enableRule(Long ruleId) {
        ShariahScreeningRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening rule not found: " + ruleId));
        rule.setEnabled(true);
        ruleRepository.save(rule);
    }

    public void disableRule(Long ruleId) {
        ShariahScreeningRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening rule not found: " + ruleId));
        rule.setEnabled(false);
        ruleRepository.save(rule);
    }

    @Transactional(readOnly = true)
    public List<ScreeningRuleResponse> getActiveRules() {
        return ruleRepository.findByEnabledTrueOrderByPriorityAsc().stream().map(this::toRuleResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ScreeningRuleResponse> getRulesByCategory(ScreeningCategory category) {
        return ruleRepository.findByCategoryAndEnabledTrue(category).stream().map(this::toRuleResponse).toList();
    }

    @Transactional(readOnly = true)
    public ScreeningRuleResponse getRule(Long ruleId) {
        return toRuleResponse(ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening rule not found: " + ruleId)));
    }

    // ===================== EXCLUSION LIST MANAGEMENT =====================

    public ShariahExclusionList createExclusionList(CreateExclusionListRequest request) {
        if (listRepository.findByListCode(request.getListCode()).isPresent()) {
            throw new BusinessException("Exclusion list already exists: " + request.getListCode(), "DUPLICATE_LIST");
        }
        ShariahExclusionList list = ShariahExclusionList.builder()
                .listCode(request.getListCode())
                .name(request.getName())
                .description(request.getDescription())
                .listType(ExclusionListType.valueOf(request.getListType()))
                .status("ACTIVE")
                .lastUpdatedAt(LocalDateTime.now())
                .lastUpdatedBy(actorProvider.getCurrentActor())
                .approvedBy(actorProvider.getCurrentActor())
                .build();
        return listRepository.save(list);
    }

    public void addEntryToList(String listCode, AddExclusionEntryRequest request) {
        ShariahExclusionList list = listRepository.findByListCode(listCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exclusion list not found: " + listCode));
        if (entryRepository.existsByListIdAndEntryValueAndStatus(list.getId(), request.getEntryValue(), "ACTIVE")) {
            throw new BusinessException("Entry already exists in list: " + request.getEntryValue(), "DUPLICATE_ENTRY");
        }
        ShariahExclusionListEntry entry = ShariahExclusionListEntry.builder()
                .listId(list.getId())
                .entryValue(request.getEntryValue())
                .entryDescription(request.getEntryDescription())
                .reason(request.getReason())
                .addedAt(LocalDate.now())
                .addedBy(actorProvider.getCurrentActor())
                .status("ACTIVE")
                .build();
        entryRepository.save(entry);
        list.setLastUpdatedAt(LocalDateTime.now());
        list.setLastUpdatedBy(actorProvider.getCurrentActor());
        listRepository.save(list);
    }

    public void removeEntryFromList(String listCode, Long entryId, String reason) {
        ShariahExclusionList list = listRepository.findByListCode(listCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exclusion list not found: " + listCode));
        ShariahExclusionListEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Entry not found: " + entryId));
        entry.setStatus("REMOVED");
        entryRepository.save(entry);
        list.setLastUpdatedAt(LocalDateTime.now());
        list.setLastUpdatedBy(actorProvider.getCurrentActor());
        listRepository.save(list);
    }

    @Transactional(readOnly = true)
    public List<ShariahExclusionListEntry> getListEntries(String listCode) {
        ShariahExclusionList list = listRepository.findByListCode(listCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exclusion list not found: " + listCode));
        return entryRepository.findByListIdAndStatus(list.getId(), "ACTIVE");
    }

    @Transactional(readOnly = true)
    public boolean isValueInList(String listCode, String value) {
        ShariahExclusionList list = listRepository.findByListCode(listCode).orElse(null);
        if (list == null) return false;
        return entryRepository.existsByListIdAndEntryValueAndStatus(list.getId(), value, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public List<ShariahExclusionList> getAllExclusionLists() {
        return listRepository.findByStatus("ACTIVE");
    }

    // ===================== ALERT MANAGEMENT =====================

    @Transactional(readOnly = true)
    public ShariahComplianceAlert getAlert(Long alertId) {
        return alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
    }

    @Transactional(readOnly = true)
    public Page<ShariahComplianceAlert> getAlerts(AlertSearchCriteria criteria, Pageable pageable) {
        Specification<ShariahComplianceAlert> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (criteria.getStatus() != null) {
                try {
                    predicates.add(cb.equal(root.get("status"), AlertStatus.valueOf(criteria.getStatus())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid alert status filter value '{}' — skipping predicate", criteria.getStatus());
                }
            }
            if (criteria.getSeverity() != null) {
                try {
                    predicates.add(cb.equal(root.get("severity"), ScreeningSeverity.valueOf(criteria.getSeverity())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid severity filter value '{}' — skipping predicate", criteria.getSeverity());
                }
            }
            if (criteria.getAlertType() != null) {
                try {
                    predicates.add(cb.equal(root.get("alertType"), AlertType.valueOf(criteria.getAlertType())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid alert type filter value '{}' — skipping predicate", criteria.getAlertType());
                }
            }
            if (criteria.getCustomerId() != null) {
                predicates.add(cb.equal(root.get("customerId"), criteria.getCustomerId()));
            }
            if (criteria.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                        criteria.getDateFrom().atZone(java.time.ZoneId.systemDefault()).toInstant()));
            }
            if (criteria.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"),
                        criteria.getDateTo().atZone(java.time.ZoneId.systemDefault()).toInstant()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return alertRepository.findAll(spec, pageable);
    }

    public void assignAlert(Long alertId, String assignedTo) {
        ShariahComplianceAlert alert = getAlert(alertId);
        alert.setAssignedTo(assignedTo);
        alert.setAssignedAt(LocalDateTime.now());
        alert.setStatus(AlertStatus.UNDER_REVIEW);
        alertRepository.save(alert);
    }

    public void resolveAlert(Long alertId, ResolveAlertRequest request) {
        ShariahComplianceAlert alert = getAlert(alertId);

        Set<AlertStatus> terminalStatuses = EnumSet.of(
                AlertStatus.RESOLVED_COMPLIANT, AlertStatus.RESOLVED_NON_COMPLIANT,
                AlertStatus.RESOLVED_FALSE_POSITIVE, AlertStatus.CLOSED);
        if (terminalStatuses.contains(alert.getStatus())) {
            throw new BusinessException(
                    "Alert " + alertId + " is already in terminal status: " + alert.getStatus(),
                    "ALERT_ALREADY_RESOLVED");
        }

        alert.setResolution(request.getResolution());
        alert.setResolvedBy(actorProvider.getCurrentActor());
        alert.setResolvedAt(LocalDateTime.now());
        alert.setStatus(AlertStatus.valueOf(request.getResolutionStatus()));
        alertRepository.save(alert);
    }

    public void escalateAlert(Long alertId, String escalatedTo, String reason) {
        ShariahComplianceAlert alert = getAlert(alertId);
        alert.setEscalatedTo(escalatedTo);
        alert.setEscalatedAt(LocalDateTime.now());
        alert.setEscalationReason(reason);
        alert.setStatus(AlertStatus.ESCALATED);
        alertRepository.save(alert);
        log.info("Alert {} escalated to {} — reason: {}", alertId, escalatedTo, reason);
    }

    @Transactional(readOnly = true)
    public List<ShariahComplianceAlert> getOverdueAlerts() {
        return alertRepository.findOverdueAlerts();
    }

    @Transactional(readOnly = true)
    public AlertStatistics getAlertStatistics() {
        long total = alertRepository.count();
        long newCount = alertRepository.countByStatus(AlertStatus.NEW);
        long underReview = alertRepository.countByStatus(AlertStatus.UNDER_REVIEW);
        long escalated = alertRepository.countByStatus(AlertStatus.ESCALATED);
        long resolvedCompliant = alertRepository.countByStatus(AlertStatus.RESOLVED_COMPLIANT);
        long resolvedNonCompliant = alertRepository.countByStatus(AlertStatus.RESOLVED_NON_COMPLIANT);
        long resolvedFP = alertRepository.countByStatus(AlertStatus.RESOLVED_FALSE_POSITIVE);

        Map<String, Long> byType = new LinkedHashMap<>();
        for (AlertType type : AlertType.values()) {
            long count = alertRepository.countByAlertType(type);
            if (count > 0) byType.put(type.name(), count);
        }
        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (ScreeningSeverity sev : ScreeningSeverity.values()) {
            long count = alertRepository.countBySeverity(sev);
            if (count > 0) bySeverity.put(sev.name(), count);
        }

        return AlertStatistics.builder()
                .totalAlerts(total)
                .newCount(newCount)
                .underReviewCount(underReview)
                .resolvedCount(resolvedCompliant + resolvedNonCompliant + resolvedFP)
                .escalatedCount(escalated)
                .slaBreach(alertRepository.countOverdueAlerts())
                .byType(byType)
                .bySeverity(bySeverity)
                .build();
    }

    // ===================== PRIVATE HELPERS =====================

    private List<ShariahScreeningRule> loadApplicableRules(ShariahScreeningRequest request) {
        LocalDate today = LocalDate.now();
        return ruleRepository.findByEnabledTrueOrderByPriorityAsc().stream()
                .filter(rule -> rule.getEffectiveFrom() == null || !rule.getEffectiveFrom().isAfter(today))
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(today))
                .filter(rule -> isApplicableToTransaction(rule, request))
                .toList();
    }

    private boolean isApplicableToTransaction(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        // Check transaction type applicability
        if (rule.getApplicableTransactionTypes() != null && !rule.getApplicableTransactionTypes().isEmpty()) {
            if (request.getTransactionType() == null || !rule.getApplicableTransactionTypes().contains(request.getTransactionType())) {
                return false;
            }
        }
        // Check contract type applicability
        if (rule.getApplicableContractTypes() != null && !rule.getApplicableContractTypes().isEmpty()) {
            if (!rule.getApplicableContractTypes().contains("ALL")) {
                if (request.getContractTypeCode() == null || !rule.getApplicableContractTypes().contains(request.getContractTypeCode())) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Evaluates a rule. Returns TRUE if the rule is TRIGGERED (violation detected), FALSE if compliant.
     */
    private boolean evaluateRule(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        try {
            return switch (rule.getRuleType()) {
                case MCC_LIST -> evaluateMccList(rule, request);
                case ENTITY_LIST -> evaluateEntityList(rule, request);
                case THRESHOLD -> evaluateThreshold(rule, request);
                case CONDITION_EXPRESSION -> evaluateCondition(rule, request);
                case BUSINESS_RULE_REF -> evaluateBusinessRuleReference(rule, request);
                case COMPOSITE -> evaluateCompositeRule(rule, request);
                default -> {
                    log.warn("Unhandled rule type {} for rule {} — defaulting to fail-closed", rule.getRuleType(), rule.getRuleCode());
                    yield true;
                }
            };
        } catch (Exception e) {
            log.error("Error evaluating rule {} — failing closed for safety: {}", rule.getRuleCode(), e.getMessage());
            return true; // fail-closed on error: treat evaluation failure as triggered (safe default)
        }
    }

    private boolean evaluateBusinessRuleReference(ShariahScreeningRule screeningRule, ShariahScreeningRequest request) {
        if (!StringUtils.hasText(screeningRule.getBusinessRuleCode())) {
            log.warn("BUSINESS_RULE_REF rule {} has no businessRuleCode — failing closed", screeningRule.getRuleCode());
            return true;
        }

        try {
            BusinessRuleResponse businessRule = businessRuleService.getRuleByCode(screeningRule.getBusinessRuleCode());
            if (businessRule == null || businessRule.getStatus() != BusinessRuleStatus.ACTIVE) {
                log.warn("Referenced business rule {} is missing or not active for screening rule {}",
                        screeningRule.getBusinessRuleCode(), screeningRule.getRuleCode());
                return true;
            }
            if (!isBusinessRuleApplicable(businessRule, request.getContractTypeCode())) {
                return false;
            }

            Boolean compliant = evaluateBusinessRuleCompliance(businessRule, request);
            if (compliant == null) {
                log.warn("Referenced business rule {} returned no boolean result for screening rule {} — failing closed",
                        businessRule.getRuleCode(), screeningRule.getRuleCode());
                return true;
            }
            return !compliant;
        } catch (Exception exception) {
            log.error("Failed to evaluate referenced business rule {} for screening rule {} — failing closed: {}",
                    screeningRule.getBusinessRuleCode(), screeningRule.getRuleCode(), exception.getMessage(), exception);
            return true;
        }
    }

    private boolean isBusinessRuleApplicable(BusinessRuleResponse businessRule, String contractTypeCode) {
        if (businessRule.getApplicableProducts() == null || businessRule.getApplicableProducts().isEmpty()) {
            return true;
        }
        if (businessRule.getApplicableProducts().stream().anyMatch("*"::equals)) {
            return true;
        }
        return StringUtils.hasText(contractTypeCode)
                && businessRule.getApplicableProducts().stream().anyMatch(product -> product.equalsIgnoreCase(contractTypeCode));
    }

    private Boolean evaluateBusinessRuleCompliance(BusinessRuleResponse businessRule, ShariahScreeningRequest request) {
        if (!StringUtils.hasText(businessRule.getEvaluationExpression())) {
            return null;
        }

        Map<String, Object> evaluationRoot = buildBusinessRuleContext(request, businessRule.getParameters());
        SimpleEvaluationContext evaluationContext = SimpleEvaluationContext
                .forPropertyAccessors(new MapAccessor())
                .withInstanceMethods()
                .withRootObject(evaluationRoot)
                .build();
        evaluationContext.setVariable("params", businessRule.getParameters());
        evaluationContext.setVariable("request", request);

        Object value = spelParser.parseExpression(businessRule.getEvaluationExpression()).getValue(evaluationContext, evaluationRoot);
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        if (value instanceof Number numberValue) {
            return numberValue.intValue() != 0;
        }
        return value != null ? Boolean.valueOf(String.valueOf(value)) : null;
    }

    private Map<String, Object> buildBusinessRuleContext(ShariahScreeningRequest request, Map<String, Object> parameters) {
        Map<String, Object> root = new LinkedHashMap<>();

        Map<String, Object> transaction = new LinkedHashMap<>();
        transaction.put("ref", request.getTransactionRef());
        transaction.put("type", request.getTransactionType());
        transaction.put("amount", request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO);
        transaction.put("currency", request.getCurrencyCode());
        transaction.put("purpose", request.getPurpose());
        transaction.put("merchantCategoryCode", request.getMerchantCategoryCode());
        root.put("transaction", transaction);

        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("ref", request.getContractRef());
        contract.put("typeCode", request.getContractTypeCode());
        root.put("contract", contract);

        Map<String, Object> counterparty = new LinkedHashMap<>();
        counterparty.put("id", request.getCounterpartyId());
        counterparty.put("name", request.getCounterpartyName());
        root.put("counterparty", counterparty);

        root.put("customerId", request.getCustomerId());
        root.put("merchantCategoryCode", request.getMerchantCategoryCode());
        root.put("params", parameters != null ? parameters : Map.of());

        if (request.getAdditionalContext() != null) {
            root.putAll(request.getAdditionalContext());
        }

        return root;
    }

    private boolean evaluateMccList(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        if (request.getMerchantCategoryCode() == null || rule.getReferenceListCode() == null) return false;
        return isValueInList(rule.getReferenceListCode(), request.getMerchantCategoryCode());
    }

    private boolean evaluateEntityList(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        if (rule.getReferenceListCode() == null) return false;
        if (request.getCounterpartyName() != null && isValueInList(rule.getReferenceListCode(), request.getCounterpartyName())) {
            return true;
        }
        if (request.getCounterpartyId() != null && isValueInList(rule.getReferenceListCode(), request.getCounterpartyId())) {
            return true;
        }
        return false;
    }

    private boolean evaluateThreshold(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        if (rule.getThresholdField() == null || rule.getThresholdOperator() == null || rule.getThresholdValue() == null) {
            return false;
        }
        BigDecimal fieldValue = getFieldValue(request, rule.getThresholdField());
        if (fieldValue == null) return false;

        return switch (rule.getThresholdOperator()) {
            case GT -> fieldValue.compareTo(rule.getThresholdValue()) > 0;
            case GTE -> fieldValue.compareTo(rule.getThresholdValue()) >= 0;
            case LT -> fieldValue.compareTo(rule.getThresholdValue()) < 0;
            case LTE -> fieldValue.compareTo(rule.getThresholdValue()) <= 0;
            case EQ -> fieldValue.compareTo(rule.getThresholdValue()) == 0;
            case BETWEEN -> rule.getThresholdValueTo() != null
                    && fieldValue.compareTo(rule.getThresholdValue()) >= 0
                    && fieldValue.compareTo(rule.getThresholdValueTo()) <= 0;
        };
    }

    private boolean evaluateCondition(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        String expr = rule.getConditionExpression();
        if (expr == null || expr.isBlank()) {
            log.warn("Condition-expression rule {} has no expression configured - failing closed",
                    rule.getRuleCode());
            return true;
        }

        try {
            // Use SimpleEvaluationContext to prevent arbitrary method invocation (e.g. T(Runtime).exec())
            Map<String, Object> variables = new LinkedHashMap<>();
            variables.put("transactionRef", request.getTransactionRef());
            variables.put("transactionType", request.getTransactionType());
            variables.put("amount", request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO);
            variables.put("currencyCode", request.getCurrencyCode());
            variables.put("contractRef", request.getContractRef());
            variables.put("contractTypeCode", request.getContractTypeCode());
            variables.put("customerId", request.getCustomerId());
            variables.put("counterpartyName", request.getCounterpartyName());
            variables.put("merchantCategoryCode", request.getMerchantCategoryCode());
            variables.put("purpose", request.getPurpose());

            if (request.getAdditionalContext() != null) {
                variables.putAll(request.getAdditionalContext());
            }

            SimpleEvaluationContext context = SimpleEvaluationContext
                    .forReadOnlyDataBinding()
                    .build();
            variables.forEach(context::setVariable);

            Boolean result = spelParser.parseExpression(expr).getValue(context, Boolean.class);
            if (result == null) {
                log.warn("Condition-expression rule {} returned null for expression '{}' - failing closed",
                        rule.getRuleCode(), expr);
                return true;
            }
            return result;
        } catch (Exception e) {
            log.warn("SpEL evaluation failed for rule {} expression '{}': {}",
                    rule.getRuleCode(), expr, e.getMessage());
            return true;
        }
    }

    private boolean evaluateCompositeRule(ShariahScreeningRule rule, ShariahScreeningRequest request) {
        // Composite rules encode sub-rule codes in the conditionExpression field
        // Format: "AND:RULE_CODE_1,RULE_CODE_2,RULE_CODE_3" or "OR:RULE_CODE_1,RULE_CODE_2"
        String expr = rule.getConditionExpression();
        if (expr == null || expr.isBlank()) return false;

        boolean isAnd = true;
        String codesPart = expr;

        if (expr.startsWith("OR:")) {
            isAnd = false;
            codesPart = expr.substring(3);
        } else if (expr.startsWith("AND:")) {
            codesPart = expr.substring(4);
        }

        List<String> codes = Arrays.stream(codesPart.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        if (codes.isEmpty()) return false;

        for (String code : codes) {
            var subRule = ruleRepository.findByRuleCode(code).orElse(null);
            if (subRule == null) continue;
            boolean triggered = evaluateRule(subRule, request);
            if (isAnd && !triggered) return false; // AND: all must trigger
            if (!isAnd && triggered) return true;  // OR: any trigger is enough
        }
        return isAnd; // AND: all passed; OR: none passed
    }

    private BigDecimal getFieldValue(ShariahScreeningRequest request, String fieldName) {
        if ("amount".equalsIgnoreCase(fieldName)) return request.getAmount();
        if ("markupRate".equalsIgnoreCase(fieldName) && request.getAdditionalContext() != null) {
            Object val = request.getAdditionalContext().get("markupRate");
            if (val instanceof BigDecimal bd) return bd;
            if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (val != null) try { return new BigDecimal(val.toString()); } catch (Exception ignored) {}
        }
        if (request.getAdditionalContext() != null) {
            Object val = request.getAdditionalContext().get(fieldName);
            if (val instanceof BigDecimal bd) return bd;
            if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (val != null) try { return new BigDecimal(val.toString()); } catch (Exception ignored) {}
        }
        return null;
    }

    private ShariahComplianceAlert createAlertFromScreening(ShariahScreeningResult result, List<Map<String, Object>> ruleResults) {
        // Find the first failing rule for alert details
        String failedRuleCode = null;
        String matchedValue = null;
        for (Map<String, Object> rr : ruleResults) {
            if ("FAIL".equals(rr.get("result"))) {
                failedRuleCode = (String) rr.get("ruleCode");
                if (rr.get("matchedValue") != null) {
                    matchedValue = rr.get("matchedValue").toString();
                }
                break;
            }
        }

        AlertType alertType = AlertType.OTHER;
        if (result.getMerchantCategoryCode() != null) alertType = AlertType.HARAM_ACTIVITY;
        else if ("MURABAHA".equals(result.getContractTypeCode())) alertType = AlertType.STRUCTURAL_VIOLATION;

        ScreeningSeverity severity = result.getOverallResult() == ScreeningOverallResult.FAIL
                ? ScreeningSeverity.CRITICAL : ScreeningSeverity.HIGH;

        // SLA based on severity
        long slaHours = switch (severity) {
            case CRITICAL -> 4;
            case HIGH -> 24;
            case MEDIUM -> 72;
            case LOW -> 168;
            default -> {
                log.warn("Unhandled severity {} for SLA calculation — defaulting to 72 hours", severity);
                yield 72;
            }
        };

        ShariahComplianceAlert alert = ShariahComplianceAlert.builder()
                .alertRef("SCA-" + LocalDate.now().getYear() + "-" + String.format("%06d", ALERT_SEQ.incrementAndGet()))
                .screeningResultId(result.getId())
                .transactionRef(result.getTransactionRef())
                .contractRef(result.getContractRef())
                .customerId(result.getCustomerId())
                .alertType(alertType)
                .severity(severity)
                .description(result.getBlockReason() != null ? result.getBlockReason() : "Shariah screening flagged transaction")
                .descriptionAr(result.getBlockReasonAr())
                .ruleCode(failedRuleCode)
                .matchedValue(matchedValue != null ? matchedValue : result.getMerchantCategoryCode())
                .status(AlertStatus.NEW)
                .generatedSnciRecord(false)
                .slaBreach(false)
                .slaDeadline(LocalDateTime.now().plusHours(slaHours))
                .build();
        return alertRepository.save(alert);
    }

    private ShariahScreeningResultResponse toResultResponse(ShariahScreeningResult r) {
        return ShariahScreeningResultResponse.builder()
                .id(r.getId())
                .screeningRef(r.getScreeningRef())
                .transactionRef(r.getTransactionRef())
                .transactionType(r.getTransactionType())
                .transactionAmount(r.getTransactionAmount())
                .transactionCurrency(r.getTransactionCurrency())
                .contractRef(r.getContractRef())
                .contractTypeCode(r.getContractTypeCode())
                .customerId(r.getCustomerId())
                .counterpartyName(r.getCounterpartyName())
                .merchantCategoryCode(r.getMerchantCategoryCode())
                .overallResult(r.getOverallResult())
                .rulesEvaluated(r.getRulesEvaluated())
                .rulesPassed(r.getRulesPassed())
                .rulesFailed(r.getRulesFailed())
                .rulesAlerted(r.getRulesAlerted())
                .ruleResults(r.getRuleResults())
                .actionTaken(r.getActionTaken())
                .blockReason(r.getBlockReason())
                .blockReasonAr(r.getBlockReasonAr())
                .alertId(r.getAlertId())
                .screenedAt(r.getScreenedAt())
                .screenedBy(r.getScreenedBy())
                .processingTimeMs(r.getProcessingTimeMs())
                .tenantId(r.getTenantId())
                .build();
    }

    private ScreeningRuleResponse toRuleResponse(ShariahScreeningRule r) {
        return ScreeningRuleResponse.builder()
                .id(r.getId())
                .ruleCode(r.getRuleCode())
                .name(r.getName())
                .nameAr(r.getNameAr())
                .description(r.getDescription())
                .descriptionAr(r.getDescriptionAr())
                .category(r.getCategory())
                .applicableTransactionTypes(r.getApplicableTransactionTypes())
                .applicableContractTypes(r.getApplicableContractTypes())
                .screeningPoint(r.getScreeningPoint())
                .action(r.getAction())
                .severity(r.getSeverity())
                .ruleType(r.getRuleType())
                .businessRuleCode(r.getBusinessRuleCode())
                .conditionExpression(r.getConditionExpression())
                .thresholdField(r.getThresholdField())
                .thresholdOperator(r.getThresholdOperator())
                .thresholdValue(r.getThresholdValue())
                .thresholdValueTo(r.getThresholdValueTo())
                .referenceListCode(r.getReferenceListCode())
                .shariahReference(r.getShariahReference())
                .approvedBy(r.getApprovedBy())
                .approvedAt(r.getApprovedAt())
                .effectiveFrom(r.getEffectiveFrom())
                .effectiveTo(r.getEffectiveTo())
                .enabled(r.isEnabled())
                .priority(r.getPriority())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .version(r.getVersion())
                .build();
    }
}
