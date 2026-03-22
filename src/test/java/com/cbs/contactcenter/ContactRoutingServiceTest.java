package com.cbs.contactcenter;

import com.cbs.common.exception.BusinessException;
import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.repository.*;
import com.cbs.contactcenter.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRoutingServiceTest {

    @Mock private RoutingRuleRepository ruleRepo;
    @Mock private AgentStateRepository agentStateRepo;
    @Mock private ContactQueueRepository queueRepo;
    @Mock private CallbackRequestRepository callbackRepo;
    @InjectMocks private ContactRoutingService service;

    @Test
    @DisplayName("Routing evaluates rules by priority and matches conditions")
    void routingEvaluatesRulesByPriority() {
        RoutingRule rule1 = new RoutingRule();
        rule1.setId(1L);
        rule1.setRuleName("Complaints Rule");
        rule1.setRuleType("SKILL_BASED");
        rule1.setPriority(1);
        rule1.setConditions(Map.of("channel", "CHAT", "reason", "COMPLAINT"));
        rule1.setTargetQueue("COMPLAINTS");
        rule1.setIsActive(true);

        RoutingRule rule2 = new RoutingRule();
        rule2.setId(2L);
        rule2.setRuleName("General Rule");
        rule2.setRuleType("ROUND_ROBIN");
        rule2.setPriority(2);
        rule2.setConditions(Map.of("channel", "PHONE", "reason", "INQUIRY"));
        rule2.setTargetQueue("GENERAL");
        rule2.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc())
                .thenReturn(List.of(rule1, rule2));

        Map<String, String> result = service.routeContact(100L, "COMPLAINT", "CHAT");

        assertThat(result).containsEntry("targetQueue", "COMPLAINTS");
    }

    @Test
    @DisplayName("Routing returns default route when no rules match")
    void routingReturnsDefaultOnNoMatch() {
        RoutingRule rule = new RoutingRule();
        rule.setId(1L);
        rule.setRuleName("Chat Only");
        rule.setRuleType("SKILL_BASED");
        rule.setPriority(1);
        rule.setConditions(Map.of("channel", "CHAT"));
        rule.setTargetQueue("CHAT_QUEUE");
        rule.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        Map<String, String> result = service.routeContact(100L, "INQUIRY", "PHONE");

        assertThat(result).containsEntry("ruleName", "DEFAULT");
        assertThat(result).containsEntry("targetQueue", "GENERAL_QUEUE");
    }

    @Test
    @DisplayName("Structured AND conditions — both conditions must match")
    void structuredAndConditions() {
        Map<String, Object> conditions = new HashMap<>();
        conditions.put("AND_0_0_channelType", Map.of("operator", "IS", "value", "PHONE"));
        conditions.put("AND_0_1_contactReason", Map.of("operator", "IS", "value", "LOAN_INQUIRY"));

        RoutingRule rule = new RoutingRule();
        rule.setId(1L);
        rule.setRuleName("Loan Phone");
        rule.setRuleType("SKILL_BASED");
        rule.setPriority(1);
        rule.setConditions(conditions);
        rule.setTargetQueue("LOAN_QUEUE");
        rule.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        // Both match
        Map<String, String> result = service.routeContact(100L, "LOAN_INQUIRY", "PHONE");
        assertThat(result).containsEntry("ruleName", "Loan Phone");

        // Channel doesn't match
        Map<String, String> noMatch = service.routeContact(100L, "LOAN_INQUIRY", "CHAT");
        assertThat(noMatch).containsEntry("ruleName", "DEFAULT");
    }

    @Test
    @DisplayName("Structured OR groups — any group matching is sufficient")
    void structuredOrGroups() {
        Map<String, Object> conditions = new HashMap<>();
        // Group 0 (AND): channel=CHAT
        conditions.put("AND_0_0_channelType", Map.of("operator", "IS", "value", "CHAT"));
        // Group 1 (OR): channel=PHONE
        conditions.put("OR_1_0_channelType", Map.of("operator", "IS", "value", "PHONE"));

        RoutingRule rule = new RoutingRule();
        rule.setId(1L);
        rule.setRuleName("Chat or Phone");
        rule.setRuleType("OVERFLOW");
        rule.setPriority(1);
        rule.setConditions(conditions);
        rule.setTargetQueue("MULTI_QUEUE");
        rule.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        // Group 1 matches (PHONE)
        Map<String, String> result = service.routeContact(100L, "INQUIRY", "PHONE");
        assertThat(result).containsEntry("ruleName", "Chat or Phone");
    }

    @Test
    @DisplayName("IS_NOT operator excludes matching values")
    void isNotOperator() {
        Map<String, Object> conditions = new HashMap<>();
        conditions.put("AND_0_0_channelType", Map.of("operator", "IS_NOT", "value", "EMAIL"));

        RoutingRule rule = new RoutingRule();
        rule.setId(1L);
        rule.setRuleName("Non-Email");
        rule.setRuleType("ROUND_ROBIN");
        rule.setPriority(1);
        rule.setConditions(conditions);
        rule.setTargetQueue("NON_EMAIL");
        rule.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        // PHONE != EMAIL → matches
        assertThat(service.routeContact(100L, "INQUIRY", "PHONE")).containsEntry("ruleName", "Non-Email");
        // EMAIL == EMAIL → doesn't match
        assertThat(service.routeContact(100L, "INQUIRY", "EMAIL")).containsEntry("ruleName", "DEFAULT");
    }

    @Test
    @DisplayName("IN operator matches comma-separated values")
    void inOperator() {
        Map<String, Object> conditions = new HashMap<>();
        conditions.put("AND_0_0_channelType", Map.of("operator", "IN", "value", "PHONE,CHAT,VIDEO"));

        RoutingRule rule = new RoutingRule();
        rule.setId(1L);
        rule.setRuleName("Real-time Channels");
        rule.setRuleType("SKILL_BASED");
        rule.setPriority(1);
        rule.setConditions(conditions);
        rule.setTargetQueue("REALTIME_QUEUE");
        rule.setIsActive(true);

        when(ruleRepo.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of(rule));

        assertThat(service.routeContact(100L, "INQUIRY", "CHAT")).containsEntry("ruleName", "Real-time Channels");
        assertThat(service.routeContact(100L, "INQUIRY", "EMAIL")).containsEntry("ruleName", "DEFAULT");
    }

    @Test
    @DisplayName("Callback max attempts enforced - status set to FAILED")
    void callbackMaxAttemptsEnforced() {
        CallbackRequest callback = new CallbackRequest();
        callback.setId(1L);
        callback.setCustomerId(100L);
        callback.setAttemptCount(2);
        callback.setMaxAttempts(3);
        callback.setStatus("SCHEDULED");

        when(callbackRepo.findById(1L)).thenReturn(Optional.of(callback));
        when(callbackRepo.save(any(CallbackRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CallbackRequest result = service.attemptCallback(1L, "NO_ANSWER");

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getAttemptCount()).isEqualTo(3);
    }
}
