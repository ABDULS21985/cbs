package com.cbs.contactcenter.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ContactRoutingService {

    private final RoutingRuleRepository routingRuleRepository;
    private final AgentStateRepository agentStateRepository;
    private final ContactQueueRepository contactQueueRepository;
    private final CallbackRequestRepository callbackRequestRepository;

    @Transactional
    public RoutingRule createRule(RoutingRule rule) {
        RoutingRule saved = routingRuleRepository.save(rule);
        log.info("Routing rule created: id={}, name={}, type={}", saved.getId(), saved.getRuleName(), saved.getRuleType());
        return saved;
    }

    public List<RoutingRule> getActiveRules() {
        return routingRuleRepository.findByIsActiveTrueOrderByPriorityAsc();
    }

    public Map<String, String> routeContact(Long customerId, String reason, String channel) {
        List<RoutingRule> rules = routingRuleRepository.findByIsActiveTrueOrderByPriorityAsc();
        for (RoutingRule rule : rules) {
            if (matchesConditions(rule, reason, channel)) {
                log.info("Route matched: customer={}, rule={} (priority={}), targetQueue={}, skillGroup={}",
                        customerId, rule.getRuleName(), rule.getPriority(), rule.getTargetQueue(), rule.getTargetSkillGroup());
                Map<String, String> result = new LinkedHashMap<>();
                result.put("ruleName", rule.getRuleName());
                result.put("ruleType", rule.getRuleType());
                result.put("priority", rule.getPriority() != null ? rule.getPriority().toString() : "0");
                result.put("targetQueue", rule.getTargetQueue() != null ? rule.getTargetQueue() : "");
                result.put("targetSkillGroup", rule.getTargetSkillGroup() != null ? rule.getTargetSkillGroup() : "");
                result.put("targetAgent", rule.getTargetAgentId() != null ? rule.getTargetAgentId() : "");
                if (rule.getMaxWaitBeforeFallback() != null) {
                    result.put("maxWaitSeconds", rule.getMaxWaitBeforeFallback().toString());
                }
                if (rule.getFallbackRuleId() != null) {
                    result.put("fallbackRuleId", rule.getFallbackRuleId().toString());
                }
                return result;
            }
        }
        log.warn("No routing rule matched for customer={}, reason={}, channel={}", customerId, reason, channel);
        // Return default routing when no rule matches
        Map<String, String> defaultRoute = new LinkedHashMap<>();
        defaultRoute.put("ruleName", "DEFAULT");
        defaultRoute.put("ruleType", "ROUND_ROBIN");
        defaultRoute.put("targetQueue", "GENERAL_QUEUE");
        defaultRoute.put("targetSkillGroup", "TIER1_SUPPORT");
        defaultRoute.put("targetAgent", "");
        return defaultRoute;
    }

    @Transactional
    public AgentState updateAgentState(String agentId, String newState) {
        AgentState agent = agentStateRepository.findByAgentId(agentId)
                .orElseThrow(() -> new BusinessException("Agent not found: " + agentId));
        agent.setCurrentState(newState);
        agent.setStateChangedAt(Instant.now());
        if ("AVAILABLE".equals(newState)) {
            agent.setActiveChatCount(0);
        }
        AgentState saved = agentStateRepository.save(agent);
        log.info("Agent state updated: agentId={}, newState={}", agentId, newState);
        return saved;
    }

    @Transactional
    public CallbackRequest requestCallback(CallbackRequest request) {
        request.setStatus("SCHEDULED");
        CallbackRequest saved = callbackRequestRepository.save(request);
        log.info("Callback requested: id={}, customer={}, preferredTime={}", saved.getId(), saved.getCustomerId(), saved.getPreferredTime());
        return saved;
    }

    @Transactional
    public CallbackRequest attemptCallback(Long callbackId, String outcome) {
        CallbackRequest cb = callbackRequestRepository.findById(callbackId)
                .orElseThrow(() -> new ResourceNotFoundException("CallbackRequest", "id", callbackId));
        cb.setAttemptCount(cb.getAttemptCount() + 1);
        cb.setLastAttemptAt(Instant.now());
        cb.setLastOutcome(outcome);
        if ("ANSWERED".equals(outcome)) {
            cb.setStatus("COMPLETED");
        } else if (cb.getAttemptCount() >= cb.getMaxAttempts()) {
            cb.setStatus("FAILED");
        }
        CallbackRequest saved = callbackRequestRepository.save(cb);
        log.info("Callback attempt: id={}, attempt={}/{}, outcome={}, status={}", callbackId, saved.getAttemptCount(), saved.getMaxAttempts(), outcome, saved.getStatus());
        return saved;
    }

    public List<CallbackRequest> getAllCallbacks() { return callbackRequestRepository.findAll(); }

    public List<ContactQueue> getQueueDashboard(Long centerId) {
        return contactQueueRepository.findByCenterIdAndStatus(centerId, "ACTIVE");
    }

    public AgentState getAgentProfile(String agentId) {
        return agentStateRepository.findByAgentId(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("AgentState", "agentId", agentId));
    }

    public List<AgentState> getAgentPerformance(Long centerId) {
        List<AgentState> agents = new ArrayList<>(agentStateRepository.findByCenterIdAndCurrentStateIn(centerId,
                List.of("AVAILABLE", "BUSY", "WRAP_UP", "OFFLINE")));
        agents.sort((a, b) -> Integer.compare(
                b.getDailyHandled() != null ? b.getDailyHandled() : 0,
                a.getDailyHandled() != null ? a.getDailyHandled() : 0));
        return agents;
    }

    /**
     * Matches conditions against the contact context.
     * <p>
     * Supports two condition formats:
     * <ol>
     *   <li><b>Simple:</b> flat map with keys "channel", "reason", "customerSegment", etc.</li>
     *   <li><b>Structured (from frontend ConditionBuilder):</b> keys like "AND_0_0_customerSegment"
     *       with value objects containing "operator" and "value". Groups are separated by
     *       OR logic prefix: AND_0_* is group 0, OR_1_* is group 1, etc.</li>
     * </ol>
     *
     * @param rule    the routing rule to evaluate
     * @param reason  the contact reason (e.g. "ACCOUNT_INQUIRY")
     * @param channel the contact channel (e.g. "PHONE", "CHAT")
     * @return true if the contact matches this rule's conditions
     */
    private boolean matchesConditions(RoutingRule rule, String reason, String channel) {
        Map<String, Object> conditions = rule.getConditions();
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }

        // Check effective date range
        if (rule.getEffectiveFrom() != null && java.time.LocalDate.now().isBefore(rule.getEffectiveFrom())) {
            return false;
        }
        if (rule.getEffectiveTo() != null && java.time.LocalDate.now().isAfter(rule.getEffectiveTo())) {
            return false;
        }

        // Build context map for evaluation
        Map<String, String> context = new HashMap<>();
        context.put("channelType", channel);
        context.put("contactReason", reason);
        // Additional context fields can be enriched from customer data in future

        // Detect structured conditions (keys like "AND_0_0_field" or "OR_1_0_field")
        boolean hasStructuredKeys = conditions.keySet().stream()
                .anyMatch(k -> k.startsWith("AND_") || k.startsWith("OR_"));

        if (hasStructuredKeys) {
            return evaluateStructuredConditions(conditions, context);
        }

        // Simple flat-map conditions
        return evaluateSimpleConditions(conditions, context, reason, channel);
    }

    /**
     * Evaluates structured condition groups created by the frontend ConditionBuilder.
     * Keys: "{logic}_{groupIndex}_{condIndex}_{fieldName}" → { operator, value }
     * Groups connected by OR (any group matching = rule matches).
     * Conditions within a group connected by AND (all must match).
     */
    private boolean evaluateStructuredConditions(Map<String, Object> conditions, Map<String, String> context) {
        // Group conditions by group index
        Map<Integer, List<ConditionEntry>> groups = new TreeMap<>();

        for (Map.Entry<String, Object> entry : conditions.entrySet()) {
            String key = entry.getKey();
            String[] parts = key.split("_", 4);
            if (parts.length < 4) continue;

            int groupIndex;
            try {
                groupIndex = Integer.parseInt(parts[1]);
            } catch (NumberFormatException e) { continue; }

            String fieldName = parts[3];
            Object condValue = entry.getValue();

            String operator = "IS";
            String value = "";
            if (condValue instanceof Map<?, ?> map) {
                operator = map.containsKey("operator") ? String.valueOf(map.get("operator")) : "IS";
                value = map.containsKey("value") ? String.valueOf(map.get("value")) : "";
            } else {
                value = String.valueOf(condValue);
            }

            groups.computeIfAbsent(groupIndex, k -> new ArrayList<>())
                    .add(new ConditionEntry(fieldName, operator, value));
        }

        if (groups.isEmpty()) return true;

        // OR between groups: if any group matches, rule matches
        for (List<ConditionEntry> group : groups.values()) {
            boolean groupMatches = true;
            // AND within group: all conditions must match
            for (ConditionEntry cond : group) {
                if (!evaluateSingleCondition(cond, context)) {
                    groupMatches = false;
                    break;
                }
            }
            if (groupMatches) return true;
        }
        return false;
    }

    private boolean evaluateSingleCondition(ConditionEntry cond, Map<String, String> context) {
        String actual = context.getOrDefault(cond.field, "");
        String expected = cond.value;
        if (expected == null || expected.isBlank()) return true; // no value = always match

        return switch (cond.operator.toUpperCase()) {
            case "IS" -> actual.equalsIgnoreCase(expected);
            case "IS_NOT" -> !actual.equalsIgnoreCase(expected);
            case "IN" -> {
                Set<String> values = Set.of(expected.split(","));
                yield values.stream().anyMatch(v -> v.trim().equalsIgnoreCase(actual));
            }
            case "NOT_IN" -> {
                Set<String> values = Set.of(expected.split(","));
                yield values.stream().noneMatch(v -> v.trim().equalsIgnoreCase(actual));
            }
            case "GREATER_THAN" -> {
                try { yield Double.parseDouble(actual) > Double.parseDouble(expected); }
                catch (NumberFormatException e) { yield false; }
            }
            case "LESS_THAN" -> {
                try { yield Double.parseDouble(actual) < Double.parseDouble(expected); }
                catch (NumberFormatException e) { yield false; }
            }
            case "BETWEEN" -> {
                String[] range = expected.split(",");
                if (range.length == 2) {
                    try { double val = Double.parseDouble(actual); yield val >= Double.parseDouble(range[0].trim()) && val <= Double.parseDouble(range[1].trim()); }
                    catch (NumberFormatException e) { yield false; }
                }
                yield false;
            }
            default -> actual.equalsIgnoreCase(expected);
        };
    }

    private boolean evaluateSimpleConditions(Map<String, Object> conditions, Map<String, String> context,
                                              String reason, String channel) {
        Object condChannel = conditions.get("channel");
        if (condChannel != null && !condChannel.toString().equalsIgnoreCase(channel)) return false;
        Object condChannelType = conditions.get("channelType");
        if (condChannelType != null && !condChannelType.toString().equalsIgnoreCase(channel)) return false;
        Object condReason = conditions.get("reason");
        if (condReason != null && !condReason.toString().equalsIgnoreCase(reason)) return false;
        Object condContactReason = conditions.get("contactReason");
        if (condContactReason != null && !condContactReason.toString().equalsIgnoreCase(reason)) return false;
        return true;
    }

    private record ConditionEntry(String field, String operator, String value) {}
}
