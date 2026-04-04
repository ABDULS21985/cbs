package com.cbs.rulesengine.service;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.service.AuditService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.rulesengine.dto.*;
import com.cbs.rulesengine.entity.*;
import com.cbs.rulesengine.repository.BusinessRuleRepository;
import com.cbs.rulesengine.repository.BusinessRuleVersionRepository;
import com.cbs.rulesengine.repository.DecisionTableRepository;
import com.cbs.rulesengine.repository.DecisionTableRowRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BusinessRuleService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private static final TypeReference<List<Map<String, Object>>> LIST_MAP_TYPE = new TypeReference<>() { };

    private final BusinessRuleRepository businessRuleRepository;
    private final BusinessRuleVersionRepository businessRuleVersionRepository;
    private final DecisionTableRepository decisionTableRepository;
    private final DecisionTableRowRepository decisionTableRowRepository;
    private final AuditService auditService;
    private final CurrentActorProvider currentActorProvider;
    private final CurrentTenantResolver currentTenantResolver;
    private final ObjectMapper objectMapper;

    public String cacheKey(String scope, String value) {
        return scope + ":" + value + ":tenant:" + tenantKey();
    }

    public long tenantKey() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return tenantId == null ? 0L : tenantId;
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse createRule(CreateBusinessRuleRequest request) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        ensureUniqueRuleCode(request.getRuleCode(), tenantId);

        BusinessRule rule = BusinessRule.builder()
                .ruleCode(request.getRuleCode().trim().toUpperCase(Locale.ROOT))
                .name(request.getName())
                .nameAr(request.getNameAr())
                .description(request.getDescription())
                .descriptionAr(request.getDescriptionAr())
                .category(request.getCategory())
                .subCategory(request.getSubCategory())
                .ruleType(request.getRuleType())
                .severity(request.getSeverity())
                .evaluationExpression(trimToNull(request.getEvaluationExpression()))
                .parameters(safeMap(request.getParameters()))
                .errorMessage(request.getErrorMessage())
                .errorMessageAr(request.getErrorMessageAr())
                .applicableProducts(safeList(request.getApplicableProducts()))
                .applicableModules(safeList(request.getApplicableModules()))
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .status(BusinessRuleStatus.DRAFT)
                .priority(request.getPriority())
                .shariahBoardResolution(request.getShariahBoardResolution())
                .tenantId(tenantId)
                .build();

        BusinessRule saved = businessRuleRepository.save(rule);
        createVersionSnapshot(saved, "Rule created", BusinessRuleVersionChangeType.CREATED);
        auditChange("BUSINESS_RULE_CREATE", saved, AuditAction.CREATE, Map.of(), snapshotRule(saved));
        log.info("Business rule created: code={}, tenant={}", saved.getRuleCode(), saved.getTenantId());
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse updateRule(Long ruleId, UpdateBusinessRuleRequest request) {
        BusinessRule rule = getRuleEntity(ruleId);
        if (!(rule.getStatus() == BusinessRuleStatus.DRAFT || rule.getStatus() == BusinessRuleStatus.SUSPENDED)) {
            throw new BusinessException("Only DRAFT and SUSPENDED rules can be updated");
        }

        Map<String, Object> before = snapshotRule(rule);

        if (StringUtils.hasText(request.getName())) rule.setName(request.getName());
        if (request.getNameAr() != null) rule.setNameAr(request.getNameAr());
        if (request.getDescription() != null) rule.setDescription(request.getDescription());
        if (request.getDescriptionAr() != null) rule.setDescriptionAr(request.getDescriptionAr());
        if (request.getCategory() != null) rule.setCategory(request.getCategory());
        if (request.getSubCategory() != null) rule.setSubCategory(request.getSubCategory());
        if (request.getRuleType() != null) rule.setRuleType(request.getRuleType());
        if (request.getSeverity() != null) rule.setSeverity(request.getSeverity());
        if (request.getEvaluationExpression() != null) rule.setEvaluationExpression(trimToNull(request.getEvaluationExpression()));
        if (request.getParameters() != null) rule.setParameters(safeMap(request.getParameters()));
        if (request.getErrorMessage() != null) rule.setErrorMessage(request.getErrorMessage());
        if (request.getErrorMessageAr() != null) rule.setErrorMessageAr(request.getErrorMessageAr());
        if (request.getApplicableProducts() != null) rule.setApplicableProducts(safeList(request.getApplicableProducts()));
        if (request.getApplicableModules() != null) rule.setApplicableModules(safeList(request.getApplicableModules()));
        if (request.getEffectiveFrom() != null) rule.setEffectiveFrom(request.getEffectiveFrom());
        if (request.getEffectiveTo() != null || request.getEffectiveFrom() != null) rule.setEffectiveTo(request.getEffectiveTo());
        if (request.getPriority() != null) rule.setPriority(request.getPriority());
        if (request.getShariahBoardResolution() != null) rule.setShariahBoardResolution(request.getShariahBoardResolution());

        BusinessRule saved = businessRuleRepository.save(rule);
        createVersionSnapshot(saved, "Rule updated", BusinessRuleVersionChangeType.MODIFIED);
        auditChange("BUSINESS_RULE_UPDATE", saved, AuditAction.UPDATE, before, snapshotRule(saved));
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse activateRule(Long ruleId) {
        BusinessRule rule = getRuleEntity(ruleId);
        if (rule.getStatus() == BusinessRuleStatus.RETIRED) {
            throw new BusinessException("Retired rules cannot be reactivated");
        }

        Map<String, Object> before = snapshotRule(rule);
        String actor = currentActorProvider.getCurrentActor();
        rule.setStatus(BusinessRuleStatus.ACTIVE);
        rule.setApprovedBy(actor);
        rule.setApprovedAt(Instant.now());

        BusinessRule saved = businessRuleRepository.save(rule);
        createVersionSnapshot(saved, "Rule activated", BusinessRuleVersionChangeType.ACTIVATED);
        auditChange("BUSINESS_RULE_ACTIVATE", saved, AuditAction.APPROVE, before, snapshotRule(saved));
        log.info("Business rule activated: code={}, by={}", saved.getRuleCode(), actor);
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse suspendRule(Long ruleId, String reason) {
        BusinessRule rule = getRuleEntity(ruleId);
        if (rule.getStatus() != BusinessRuleStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE rules can be suspended");
        }

        Map<String, Object> before = snapshotRule(rule);
        rule.setStatus(BusinessRuleStatus.SUSPENDED);
        BusinessRule saved = businessRuleRepository.save(rule);
        createVersionSnapshot(saved, "Rule suspended: " + defaultText(reason, "No reason provided"),
                BusinessRuleVersionChangeType.SUSPENDED);
        auditChange("BUSINESS_RULE_SUSPEND", saved, AuditAction.UPDATE, before, snapshotRule(saved));
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse retireRule(Long ruleId) {
        BusinessRule rule = getRuleEntity(ruleId);
        if (rule.getStatus() == BusinessRuleStatus.RETIRED) {
            throw new BusinessException("Rule is already retired");
        }

        Map<String, Object> before = snapshotRule(rule);
        rule.setStatus(BusinessRuleStatus.RETIRED);
        BusinessRule saved = businessRuleRepository.save(rule);
        createVersionSnapshot(saved, "Rule retired", BusinessRuleVersionChangeType.RETIRED);
        auditChange("BUSINESS_RULE_RETIRE", saved, AuditAction.UPDATE, before, snapshotRule(saved));
        return toResponse(saved);
    }

    public BusinessRuleResponse getRule(Long ruleId) {
        return toResponse(getRuleEntity(ruleId));
    }

    public BusinessRuleResponse getRuleByCode(String ruleCode) {
        return toResponse(resolveRuleByCode(ruleCode));
    }

    public PageImpl<BusinessRuleSummary> searchRules(BusinessRuleSearchRequest request) {
        List<BusinessRule> scoped = deduplicateRules(
                businessRuleRepository.findAll(buildSpecification(request), buildSort(request))
        );

        List<BusinessRule> filtered = scoped.stream()
                .filter(rule -> matchesProduct(rule, request.getProductCode()))
                .filter(rule -> matchesModule(rule, request.getModuleName()))
                .toList();

        int page = Math.max(request.getPage(), 0);
        int size = Math.max(request.getSize(), 1);
        int fromIndex = Math.min(page * size, filtered.size());
        int toIndex = Math.min(fromIndex + size, filtered.size());

        List<BusinessRuleSummary> content = filtered.subList(fromIndex, toIndex).stream()
                .map(this::toSummary)
                .toList();

        return new PageImpl<>(content, Pageable.ofSize(size).withPage(page), filtered.size());
    }

    @Cacheable(cacheNames = "rules-by-product", key = "#root.target.cacheKey('product', #productCode)")
    public List<BusinessRuleResponse> getActiveRulesForProduct(String productCode) {
        return getActiveScopedRules().stream()
                .filter(rule -> matchesProduct(rule, productCode))
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(cacheNames = "rules-by-module", key = "#root.target.cacheKey('module', #moduleName)")
    public List<BusinessRuleResponse> getActiveRulesForModule(String moduleName) {
        return getActiveScopedRules().stream()
                .filter(rule -> matchesModule(rule, moduleName))
                .map(this::toResponse)
                .toList();
    }

    public RuleStatisticsResponse getRuleStatistics() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<BusinessRule> scoped = deduplicateRules(fetchTenantScopedRules());
        List<BusinessRuleSummary> recentlyModified = scoped.stream()
                .sorted(Comparator.comparing(BusinessRule::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(this::toSummary)
                .toList();

        Map<String, Long> byCategory = scoped.stream()
                .collect(Collectors.groupingBy(rule -> rule.getCategory().name(), LinkedHashMap::new, Collectors.counting()));

        return RuleStatisticsResponse.builder()
                .totalRules((long) scoped.size())
                .activeCount(countByStatus(BusinessRuleStatus.ACTIVE, tenantId))
                .draftCount(countByStatus(BusinessRuleStatus.DRAFT, tenantId))
                .suspendedCount(countByStatus(BusinessRuleStatus.SUSPENDED, tenantId))
                .retiredCount(countByStatus(BusinessRuleStatus.RETIRED, tenantId))
                .byCategory(byCategory)
                .recentlyModified(recentlyModified)
                .build();
    }

    public List<RuleCategoryCountResponse> getRuleCategoryCounts() {
        return deduplicateRules(fetchTenantScopedRules()).stream()
                .collect(Collectors.groupingBy(rule -> rule.getCategory().name() + "::" + defaultText(rule.getSubCategory(), ""),
                        LinkedHashMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(entry -> {
                    String[] parts = entry.getKey().split("::", 2);
                    return RuleCategoryCountResponse.builder()
                            .category(parts[0])
                            .subCategory(parts.length > 1 && !parts[1].isBlank() ? parts[1] : null)
                            .count(entry.getValue())
                            .build();
                })
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleVersionResponse createNewVersion(Long ruleId, String changeDescription) {
        BusinessRule rule = getRuleEntity(ruleId);
        return toVersionResponse(createVersionSnapshot(
                rule,
                defaultText(changeDescription, "Manual version snapshot"),
                BusinessRuleVersionChangeType.MODIFIED
        ));
    }

    public List<BusinessRuleVersionSummary> getRuleVersions(Long ruleId) {
        getRuleEntity(ruleId);
        return businessRuleVersionRepository.findByRuleIdOrderByVersionNumberDesc(ruleId).stream()
                .map(this::toVersionSummary)
                .toList();
    }

    public BusinessRuleVersionResponse getRuleVersion(Long ruleId, Integer versionNumber) {
        getRuleEntity(ruleId);
        BusinessRuleVersion version = businessRuleVersionRepository.findByRuleIdAndVersionNumber(ruleId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRuleVersion", "versionNumber", versionNumber));
        return toVersionResponse(version);
    }

    public BusinessRuleVersionResponse getRuleAsOf(Long ruleId, Instant asOfDate) {
        getRuleEntity(ruleId);
        BusinessRuleVersion version = businessRuleVersionRepository.findVersionsAsOf(ruleId, asOfDate).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRuleVersion", "asOfDate", asOfDate));
        return toVersionResponse(version);
    }

    public VersionComparisonResponse compareVersions(Long ruleId, Integer version1, Integer version2) {
        BusinessRuleVersion first = businessRuleVersionRepository.findByRuleIdAndVersionNumber(ruleId, version1)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRuleVersion", "versionNumber", version1));
        BusinessRuleVersion second = businessRuleVersionRepository.findByRuleIdAndVersionNumber(ruleId, version2)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRuleVersion", "versionNumber", version2));

        Map<String, Object> flatFirst = flattenJson(objectMapper.valueToTree(first.getRuleSnapshot()));
        Map<String, Object> flatSecond = flattenJson(objectMapper.valueToTree(second.getRuleSnapshot()));

        Set<String> keys = new TreeSet<>();
        keys.addAll(flatFirst.keySet());
        keys.addAll(flatSecond.keySet());

        List<VersionDifferenceResponse> differences = new ArrayList<>();
        for (String key : keys) {
            Object left = flatFirst.get(key);
            Object right = flatSecond.get(key);
            if (!Objects.equals(left, right)) {
                differences.add(VersionDifferenceResponse.builder()
                        .field(key)
                        .oldValue(left)
                        .newValue(right)
                        .build());
            }
        }

        return VersionComparisonResponse.builder()
                .version1(version1)
                .version2(version2)
                .differences(differences)
                .build();
    }

    @Transactional
    @CacheEvict(cacheNames = {
            "rules-by-product", "rules-by-module", "decision-table-definitions", "decision-table-rule-code"
    }, allEntries = true)
    public BusinessRuleResponse rollbackToVersion(Long ruleId, Integer versionNumber, String reason) {
        BusinessRule current = getRuleEntity(ruleId);
        BusinessRuleVersion target = businessRuleVersionRepository.findByRuleIdAndVersionNumber(ruleId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRuleVersion", "versionNumber", versionNumber));

        Map<String, Object> before = snapshotRule(current);
        applyRuleSnapshot(current, target.getRuleSnapshot());
        BusinessRule saved = businessRuleRepository.save(current);
        restoreDecisionTables(saved, target.getDecisionTableSnapshot());
        createVersionSnapshot(saved,
                "Rollback to version " + versionNumber + ": " + defaultText(reason, "No reason provided"),
                BusinessRuleVersionChangeType.MODIFIED);
        auditChange("BUSINESS_RULE_ROLLBACK", saved, AuditAction.UPDATE, before, snapshotRule(saved));
        return toResponse(saved);
    }

    public BusinessRule getRuleEntity(Long ruleId) {
        BusinessRule rule = businessRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRule", "id", ruleId));
        validateTenantAccess(rule.getTenantId());
        return rule;
    }

    private List<BusinessRule> getActiveScopedRules() {
        return deduplicateRules(fetchTenantScopedRules()).stream()
                .filter(rule -> rule.getStatus() == BusinessRuleStatus.ACTIVE)
                .filter(this::isCurrentlyEffective)
                .sorted(Comparator.comparing(BusinessRule::getPriority)
                        .thenComparing(BusinessRule::getRuleCode))
                .toList();
    }

    private boolean isCurrentlyEffective(BusinessRule rule) {
        LocalDate today = LocalDate.now();
        if (rule.getEffectiveFrom() != null && rule.getEffectiveFrom().isAfter(today)) {
            return false;
        }
        return rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(today);
    }

    private Specification<BusinessRule> buildSpecification(BusinessRuleSearchRequest request) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (tenantId != null) {
                predicates.add(cb.or(cb.isNull(root.get("tenantId")), cb.equal(root.get("tenantId"), tenantId)));
            } else {
                predicates.add(cb.isNull(root.get("tenantId")));
            }

            if (StringUtils.hasText(request.getQuery())) {
                String like = "%" + request.getQuery().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("ruleCode")), like)
                ));
            }
            if (request.getCategory() != null) predicates.add(cb.equal(root.get("category"), request.getCategory()));
            if (StringUtils.hasText(request.getSubCategory())) predicates.add(cb.equal(root.get("subCategory"), request.getSubCategory()));
            if (request.getStatus() != null) predicates.add(cb.equal(root.get("status"), request.getStatus()));
            if (request.getRuleType() != null) predicates.add(cb.equal(root.get("ruleType"), request.getRuleType()));
            if (request.getSeverity() != null) predicates.add(cb.equal(root.get("severity"), request.getSeverity()));

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Sort buildSort(BusinessRuleSearchRequest request) {
        String property = switch (defaultText(request.getSortBy(), "updatedAt")) {
            case "ruleCode" -> "ruleCode";
            case "name" -> "name";
            case "category" -> "category";
            case "priority" -> "priority";
            case "effectiveFrom" -> "effectiveFrom";
            case "createdAt" -> "createdAt";
            default -> "updatedAt";
        };
        Sort.Direction direction = "asc".equalsIgnoreCase(request.getSortDir())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, property);
    }

    private BusinessRule resolveRuleByCode(String ruleCode) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        if (tenantId != null) {
            Optional<BusinessRule> tenantRule = businessRuleRepository.findByRuleCodeAndTenantId(ruleCode, tenantId);
            if (tenantRule.isPresent()) {
                return tenantRule.get();
            }
        }
        return businessRuleRepository.findByRuleCodeAndTenantIdIsNull(ruleCode)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRule", "ruleCode", ruleCode));
    }

    private void ensureUniqueRuleCode(String ruleCode, Long tenantId) {
        if (tenantId != null && businessRuleRepository.findByRuleCodeAndTenantId(ruleCode, tenantId).isPresent()) {
            throw new BusinessException("Rule code already exists for tenant: " + ruleCode);
        }
        if (tenantId == null && businessRuleRepository.findByRuleCodeAndTenantIdIsNull(ruleCode).isPresent()) {
            throw new BusinessException("Rule code already exists: " + ruleCode);
        }
    }

    private void validateTenantAccess(Long entityTenantId) {
        Long currentTenantId = currentTenantResolver.getCurrentTenantId();
        if (currentTenantId != null && entityTenantId != null && !Objects.equals(currentTenantId, entityTenantId)) {
            throw new BusinessException("Rule does not belong to the current tenant");
        }
    }

    private List<BusinessRule> fetchTenantScopedRules() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<BusinessRule> rules = new ArrayList<>();
        if (tenantId != null) {
            rules.addAll(businessRuleRepository.findAll((root, query, cb) ->
                    cb.equal(root.get("tenantId"), tenantId)));
        }
        rules.addAll(businessRuleRepository.findAll((root, query, cb) ->
                cb.isNull(root.get("tenantId"))));
        return rules;
    }

    private List<BusinessRule> deduplicateRules(List<BusinessRule> rules) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<BusinessRule> ordered = new ArrayList<>(rules);
        ordered.sort(Comparator
                .comparing((BusinessRule rule) -> !Objects.equals(rule.getTenantId(), tenantId))
                .thenComparing(BusinessRule::getPriority, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(BusinessRule::getRuleCode));

        LinkedHashMap<String, BusinessRule> deduplicated = new LinkedHashMap<>();
        for (BusinessRule rule : ordered) {
            deduplicated.putIfAbsent(rule.getRuleCode(), rule);
        }
        return new ArrayList<>(deduplicated.values());
    }

    private long countByStatus(BusinessRuleStatus status, Long tenantId) {
        long global = businessRuleRepository.countByStatusAndTenantIdIsNull(status);
        if (tenantId == null) {
            return global;
        }
        long tenant = businessRuleRepository.countByStatusAndTenantId(status, tenantId);
        return deduplicateRules(fetchTenantScopedRules().stream()
                .filter(rule -> rule.getStatus() == status)
                .toList()).size();
    }

    private boolean matchesProduct(BusinessRule rule, String productCode) {
        if (!StringUtils.hasText(productCode)) {
            return true;
        }
        List<String> products = safeList(rule.getApplicableProducts());
        return products.isEmpty()
                || products.stream().anyMatch("*"::equals)
                || products.stream().anyMatch(item -> item.equalsIgnoreCase(productCode));
    }

    private boolean matchesModule(BusinessRule rule, String moduleName) {
        if (!StringUtils.hasText(moduleName)) {
            return true;
        }
        List<String> modules = safeList(rule.getApplicableModules());
        return modules.isEmpty()
                || modules.stream().anyMatch("*"::equals)
                || modules.stream().anyMatch(item -> item.equalsIgnoreCase(moduleName));
    }

    private BusinessRuleResponse toResponse(BusinessRule rule) {
        Integer currentVersion = businessRuleVersionRepository.findFirstByRuleIdAndEffectiveToIsNullOrderByVersionNumberDesc(rule.getId())
                .map(BusinessRuleVersion::getVersionNumber)
                .orElse(null);

        return BusinessRuleResponse.builder()
                .id(rule.getId())
                .ruleCode(rule.getRuleCode())
                .name(rule.getName())
                .nameAr(rule.getNameAr())
                .description(rule.getDescription())
                .descriptionAr(rule.getDescriptionAr())
                .category(rule.getCategory())
                .subCategory(rule.getSubCategory())
                .ruleType(rule.getRuleType())
                .severity(rule.getSeverity())
                .evaluationExpression(rule.getEvaluationExpression())
                .parameters(rule.getParameters())
                .errorMessage(rule.getErrorMessage())
                .errorMessageAr(rule.getErrorMessageAr())
                .applicableProducts(rule.getApplicableProducts())
                .applicableModules(rule.getApplicableModules())
                .effectiveFrom(rule.getEffectiveFrom())
                .effectiveTo(rule.getEffectiveTo())
                .status(rule.getStatus())
                .priority(rule.getPriority())
                .shariahBoardResolution(rule.getShariahBoardResolution())
                .approvedBy(rule.getApprovedBy())
                .approvedAt(rule.getApprovedAt())
                .tenantId(rule.getTenantId())
                .currentVersion(currentVersion)
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .createdBy(rule.getCreatedBy())
                .updatedBy(rule.getUpdatedBy())
                .build();
    }

    private BusinessRuleSummary toSummary(BusinessRule rule) {
        return BusinessRuleSummary.builder()
                .id(rule.getId())
                .ruleCode(rule.getRuleCode())
                .name(rule.getName())
                .category(rule.getCategory())
                .status(rule.getStatus())
                .severity(rule.getSeverity())
                .effectiveFrom(rule.getEffectiveFrom())
                .effectiveTo(rule.getEffectiveTo())
                .priority(rule.getPriority())
                .build();
    }

    private BusinessRuleVersionSummary toVersionSummary(BusinessRuleVersion version) {
        return BusinessRuleVersionSummary.builder()
                .versionNumber(version.getVersionNumber())
                .changeType(version.getChangeType())
                .changeDescription(version.getChangeDescription())
                .changedBy(version.getChangedBy())
                .effectiveFrom(version.getEffectiveFrom())
                .effectiveTo(version.getEffectiveTo())
                .build();
    }

    private BusinessRuleVersionResponse toVersionResponse(BusinessRuleVersion version) {
        return BusinessRuleVersionResponse.builder()
                .versionNumber(version.getVersionNumber())
                .changeType(version.getChangeType())
                .changeDescription(version.getChangeDescription())
                .changedBy(version.getChangedBy())
                .approvedBy(version.getApprovedBy())
                .approvalReference(version.getApprovalReference())
                .effectiveFrom(version.getEffectiveFrom())
                .effectiveTo(version.getEffectiveTo())
                .ruleSnapshot(version.getRuleSnapshot())
                .decisionTableSnapshot(version.getDecisionTableSnapshot())
                .build();
    }

    private BusinessRuleVersion createVersionSnapshot(BusinessRule rule, String changeDescription,
                                                      BusinessRuleVersionChangeType changeType) {
        Instant now = Instant.now();
        businessRuleVersionRepository.findFirstByRuleIdAndEffectiveToIsNullOrderByVersionNumberDesc(rule.getId())
                .ifPresent(current -> {
                    current.setEffectiveTo(now);
                    businessRuleVersionRepository.save(current);
                });

        int nextVersion = (int) businessRuleVersionRepository.countByRuleId(rule.getId()) + 1;
        BusinessRuleVersion version = BusinessRuleVersion.builder()
                .ruleId(rule.getId())
                .versionNumber(nextVersion)
                .ruleSnapshot(snapshotRule(rule))
                .decisionTableSnapshot(buildDecisionTableSnapshot(rule.getId()))
                .changeDescription(changeDescription)
                .changeType(changeType)
                .changedBy(currentActorProvider.getCurrentActor())
                .approvedBy(rule.getApprovedBy())
                .approvalReference(rule.getShariahBoardResolution())
                .effectiveFrom(now)
                .tenantId(rule.getTenantId())
                .build();
        return businessRuleVersionRepository.save(version);
    }

    private Map<String, Object> snapshotRule(BusinessRule rule) {
        return objectMapper.convertValue(toResponse(rule), MAP_TYPE);
    }

    private List<Map<String, Object>> buildDecisionTableSnapshot(Long ruleId) {
        List<DecisionTable> tables = decisionTableRepository.findByRuleIdOrderByCreatedAtDesc(ruleId);
        List<Map<String, Object>> snapshot = new ArrayList<>();
        for (DecisionTable table : tables) {
            Map<String, Object> tableMap = new LinkedHashMap<>();
            tableMap.put("tableName", table.getTableName());
            tableMap.put("description", table.getDescription());
            tableMap.put("inputColumns", table.getInputColumns());
            tableMap.put("outputColumns", table.getOutputColumns());
            tableMap.put("hitPolicy", table.getHitPolicy().name());
            tableMap.put("status", table.getStatus().name());
            tableMap.put("tableVersion", table.getTableVersion());
            tableMap.put("tenantId", table.getTenantId());

            List<Map<String, Object>> rows = decisionTableRowRepository.findByDecisionTableIdOrderByRowNumberAsc(table.getId())
                    .stream()
                    .map(row -> {
                        Map<String, Object> rowMap = new LinkedHashMap<>();
                        rowMap.put("rowNumber", row.getRowNumber());
                        rowMap.put("inputValues", row.getInputValues());
                        rowMap.put("outputValues", row.getOutputValues());
                        rowMap.put("description", row.getDescription());
                        rowMap.put("isActive", row.getIsActive());
                        rowMap.put("priority", row.getPriority());
                        return rowMap;
                    })
                    .toList();
            tableMap.put("rows", rows);
            snapshot.add(tableMap);
        }
        return snapshot;
    }

    private void restoreDecisionTables(BusinessRule rule, List<Map<String, Object>> tableSnapshots) {
        List<DecisionTable> existingTables = decisionTableRepository.findByRuleIdOrderByCreatedAtDesc(rule.getId());
        for (DecisionTable table : existingTables) {
            decisionTableRowRepository.deleteByDecisionTableId(table.getId());
        }
        decisionTableRepository.deleteAll(existingTables);

        if (tableSnapshots == null) {
            return;
        }

        for (Map<String, Object> tableSnapshot : tableSnapshots) {
            DecisionTable table = DecisionTable.builder()
                    .rule(rule)
                    .tableName(asString(tableSnapshot.get("tableName")))
                    .description(asString(tableSnapshot.get("description")))
                    .inputColumns(asListOfMaps(tableSnapshot.get("inputColumns")))
                    .outputColumns(asListOfMaps(tableSnapshot.get("outputColumns")))
                    .hitPolicy(DecisionTableHitPolicy.valueOf(asString(tableSnapshot.get("hitPolicy"))))
                    .status(BusinessRuleStatus.valueOf(asString(tableSnapshot.get("status"))))
                    .tableVersion(asInteger(tableSnapshot.get("tableVersion"), 1))
                    .tenantId(rule.getTenantId())
                    .build();
            DecisionTable savedTable = decisionTableRepository.save(table);

            for (Map<String, Object> rowSnapshot : asListOfMaps(tableSnapshot.get("rows"))) {
                decisionTableRowRepository.save(DecisionTableRow.builder()
                        .decisionTable(savedTable)
                        .rowNumber(asInteger(rowSnapshot.get("rowNumber"), 1))
                        .inputValues(asListOfMaps(rowSnapshot.get("inputValues")))
                        .outputValues(asListOfMaps(rowSnapshot.get("outputValues")))
                        .description(asString(rowSnapshot.get("description")))
                        .isActive(asBoolean(rowSnapshot.get("isActive"), true))
                        .priority(asInteger(rowSnapshot.get("priority"), asInteger(rowSnapshot.get("rowNumber"), 1)))
                        .build());
            }
        }
    }

    private void applyRuleSnapshot(BusinessRule target, Map<String, Object> snapshot) {
        target.setRuleCode(asString(snapshot.get("ruleCode")));
        target.setName(asString(snapshot.get("name")));
        target.setNameAr(asString(snapshot.get("nameAr")));
        target.setDescription(asString(snapshot.get("description")));
        target.setDescriptionAr(asString(snapshot.get("descriptionAr")));
        target.setCategory(BusinessRuleCategory.valueOf(asString(snapshot.get("category"))));
        target.setSubCategory(asString(snapshot.get("subCategory")));
        target.setRuleType(BusinessRuleType.valueOf(asString(snapshot.get("ruleType"))));
        target.setSeverity(RuleSeverity.valueOf(asString(snapshot.get("severity"))));
        target.setEvaluationExpression(asString(snapshot.get("evaluationExpression")));
        target.setParameters(asMap(snapshot.get("parameters")));
        target.setErrorMessage(asString(snapshot.get("errorMessage")));
        target.setErrorMessageAr(asString(snapshot.get("errorMessageAr")));
        target.setApplicableProducts(asListOfStrings(snapshot.get("applicableProducts")));
        target.setApplicableModules(asListOfStrings(snapshot.get("applicableModules")));
        target.setEffectiveFrom(asLocalDate(snapshot.get("effectiveFrom")));
        target.setEffectiveTo(asLocalDate(snapshot.get("effectiveTo")));
        target.setStatus(BusinessRuleStatus.valueOf(asString(snapshot.get("status"))));
        target.setPriority(asInteger(snapshot.get("priority"), 100));
        target.setShariahBoardResolution(asString(snapshot.get("shariahBoardResolution")));
        target.setApprovedBy(asString(snapshot.get("approvedBy")));
        target.setApprovedAt(asInstant(snapshot.get("approvedAt")));
    }

    private void auditChange(String eventType, BusinessRule rule, AuditAction action,
                             Map<String, Object> beforeState, Map<String, Object> afterState) {
        auditService.logEvent(
                eventType,
                "BusinessRule",
                rule.getId(),
                action,
                currentActorProvider.getCurrentActor(),
                null,
                null,
                "API",
                eventType.replace('_', ' '),
                beforeState,
                afterState,
                changedFields(beforeState, afterState),
                Map.of("tenantId", rule.getTenantId())
        );
    }

    private List<String> changedFields(Map<String, Object> beforeState, Map<String, Object> afterState) {
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(beforeState.keySet());
        keys.addAll(afterState.keySet());
        return keys.stream()
                .filter(key -> !Objects.equals(beforeState.get(key), afterState.get(key)))
                .toList();
    }

    private Map<String, Object> flattenJson(JsonNode node) {
        Map<String, Object> flattened = new LinkedHashMap<>();
        flattenJson("", node, flattened);
        return flattened;
    }

    private void flattenJson(String path, JsonNode node, Map<String, Object> output) {
        if (node == null || node.isNull()) {
            output.put(path, null);
            return;
        }
        if (node.isValueNode()) {
            output.put(path, objectMapper.convertValue(node, Object.class));
            return;
        }
        if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                flattenJson(path + "[" + i + "]", node.get(i), output);
            }
            return;
        }
        node.fields().forEachRemaining(entry -> {
            String childPath = path.isEmpty() ? entry.getKey() : path + "." + entry.getKey();
            flattenJson(childPath, entry.getValue(), output);
        });
    }

    private Map<String, Object> safeMap(Map<String, Object> value) {
        return value == null ? new LinkedHashMap<>() : new LinkedHashMap<>(value);
    }

    private List<String> safeList(List<String> value) {
        return value == null ? new ArrayList<>() : new ArrayList<>(value);
    }

    private Map<String, Object> asMap(Object value) {
        return value == null ? new LinkedHashMap<>() : objectMapper.convertValue(value, MAP_TYPE);
    }

    private List<Map<String, Object>> asListOfMaps(Object value) {
        return value == null ? new ArrayList<>() : objectMapper.convertValue(value, LIST_MAP_TYPE);
    }

    private List<String> asListOfStrings(Object value) {
        if (value == null) {
            return new ArrayList<>();
        }
        return objectMapper.convertValue(value, new TypeReference<List<String>>() { });
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Integer asInteger(Object value, Integer defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private Boolean asBoolean(Object value, Boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private LocalDate asLocalDate(Object value) {
        return value == null || String.valueOf(value).isBlank() ? null : LocalDate.parse(String.valueOf(value));
    }

    private Instant asInstant(Object value) {
        return value == null || String.valueOf(value).isBlank() ? null : Instant.parse(String.valueOf(value));
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
