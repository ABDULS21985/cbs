package com.cbs.security;

import com.cbs.security.entity.*;
import com.cbs.security.repository.*;
import com.cbs.security.service.SiemService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SiemServiceTest {

    @Mock private SecurityEventRepository eventRepository;
    @Mock private SiemCorrelationRuleRepository ruleRepository;
    @InjectMocks private SiemService siemService;

    @Test
    @DisplayName("CRITICAL severity event gets threat score >= 80")
    void criticalSeverityHighThreatScore() {
        when(ruleRepository.findByIsActiveTrueOrderByRuleNameAsc()).thenReturn(List.of());
        when(eventRepository.save(any())).thenAnswer(inv -> { SecurityEvent e = inv.getArgument(0); e.setId(1L); return e; });

        SecurityEvent event = SecurityEvent.builder()
                .eventCategory("DATA_EXFILTRATION").severity("CRITICAL")
                .eventSource("DLP_ENGINE").eventType("LARGE_DATA_EXPORT")
                .build();

        SecurityEvent result = siemService.ingestEvent(event);
        assertThat(result.getThreatScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.getActionTaken()).isIn("BLOCKED", "ESCALATED");
    }

    @Test
    @DisplayName("LOW severity INFO event gets minimal threat score")
    void lowSeverityMinimalScore() {
        when(ruleRepository.findByIsActiveTrueOrderByRuleNameAsc()).thenReturn(List.of());
        when(eventRepository.save(any())).thenAnswer(inv -> { SecurityEvent e = inv.getArgument(0); e.setId(1L); return e; });

        SecurityEvent event = SecurityEvent.builder()
                .eventCategory("AUTHENTICATION").severity("LOW")
                .eventSource("LOGIN_SERVICE").eventType("LOGIN_SUCCESS")
                .build();

        SecurityEvent result = siemService.ingestEvent(event);
        assertThat(result.getThreatScore()).isLessThanOrEqualTo(30);
        assertThat(result.getActionTaken()).isEqualTo("LOGGED");
    }

    @Test
    @DisplayName("Brute force detection boosts threat score after repeated LOGIN_FAILED")
    void bruteForceDetection() {
        when(ruleRepository.findByIsActiveTrueOrderByRuleNameAsc()).thenReturn(List.of());
        when(eventRepository.save(any())).thenAnswer(inv -> { SecurityEvent e = inv.getArgument(0); e.setId(1L); return e; });
        // Simulate 6 recent failed logins
        when(eventRepository.countByEventTypeAndUserIdAndCreatedAtAfter(eq("LOGIN_FAILED"), eq(100L), any()))
                .thenReturn(6L);

        SecurityEvent event = SecurityEvent.builder()
                .eventCategory("AUTHENTICATION").severity("MEDIUM").userId(100L)
                .eventSource("LOGIN_SERVICE").eventType("LOGIN_FAILED")
                .build();

        SecurityEvent result = siemService.ingestEvent(event);
        // MEDIUM base (40) + brute force bonus (20 for >5 failures) = 60
        assertThat(result.getThreatScore()).isGreaterThanOrEqualTo(60);
        assertThat(result.getActionTaken()).isIn("ALERTED", "ESCALATED");
    }
}
