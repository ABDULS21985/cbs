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
                log.info("Route matched: customer={}, rule={}, targetQueue={}", customerId, rule.getRuleName(), rule.getTargetQueue());
                Map<String, String> result = new HashMap<>();
                result.put("targetQueue", rule.getTargetQueue());
                result.put("targetAgent", rule.getTargetAgentId());
                result.put("ruleName", rule.getRuleName());
                return result;
            }
        }
        log.warn("No routing rule matched for customer={}, reason={}, channel={}", customerId, reason, channel);
        return Collections.emptyMap();
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

    public List<ContactQueue> getQueueDashboard(Long centerId) {
        return contactQueueRepository.findByCenterIdAndStatus(centerId, "ACTIVE");
    }

    public List<AgentState> getAgentPerformance(Long centerId) {
        List<AgentState> agents = new ArrayList<>(agentStateRepository.findByCenterIdAndCurrentStateIn(centerId,
                List.of("AVAILABLE", "BUSY", "WRAP_UP", "OFFLINE")));
        agents.sort((a, b) -> Integer.compare(
                b.getDailyHandled() != null ? b.getDailyHandled() : 0,
                a.getDailyHandled() != null ? a.getDailyHandled() : 0));
        return agents;
    }

    private boolean matchesConditions(RoutingRule rule, String reason, String channel) {
        Map<String, Object> conditions = rule.getConditions();
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }
        Object condChannel = conditions.get("channel");
        if (condChannel != null && !condChannel.toString().equalsIgnoreCase(channel)) {
            return false;
        }
        Object condReason = conditions.get("reason");
        if (condReason != null && !condReason.toString().equalsIgnoreCase(reason)) {
            return false;
        }
        return true;
    }
}
