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
