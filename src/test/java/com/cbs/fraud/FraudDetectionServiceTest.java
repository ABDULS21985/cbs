package com.cbs.fraud;

import com.cbs.fraud.entity.*;
import com.cbs.fraud.repository.*;
import com.cbs.fraud.service.FraudDetectionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FraudDetectionServiceTest {

    @Mock private FraudRuleRepository ruleRepository;
    @Mock private FraudAlertRepository alertRepository;

    @InjectMocks private FraudDetectionService fraudService;

    @Test
    @DisplayName("Should generate alert when score exceeds threshold (amount + device anomaly)")
    void highScoreTriggersAlert() {
        FraudRule amountRule = FraudRule.builder().ruleCode("AMT-01").ruleName("High Amount")
                .ruleCategory("AMOUNT_ANOMALY").scoreWeight(35)
                .ruleConfig(Map.of("threshold", 100000)).applicableChannels("ALL").isActive(true).build();
        FraudRule deviceRule = FraudRule.builder().ruleCode("DEV-01").ruleName("New Device")
                .ruleCategory("DEVICE_ANOMALY").scoreWeight(25)
                .ruleConfig(Map.of()).applicableChannels("ALL").isActive(true).build();

        when(ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc()).thenReturn(List.of(amountRule, deviceRule));
        when(alertRepository.getNextAlertSequence()).thenReturn(1L);
        when(alertRepository.save(any())).thenAnswer(inv -> { FraudAlert a = inv.getArgument(0); a.setId(1L); return a; });

        FraudAlert result = fraudService.scoreTransaction(1L, 10L, "TRF-001",
                new BigDecimal("200000"), "ONLINE", "new-device-123", "1.2.3.4", "Lagos, NG",
                Map.of("is_new_device", true));

        assertThat(result).isNotNull();
        assertThat(result.getRiskScore()).isEqualTo(60); // 35 + 25
        assertThat(result.getTriggeredRules()).hasSize(2);
        assertThat(result.getActionTaken()).isEqualTo("STEP_UP_AUTH"); // 60-79 = STEP_UP_AUTH
    }

    @Test
    @DisplayName("Should return null (clean) when score below threshold")
    void lowScoreIsClean() {
        FraudRule amountRule = FraudRule.builder().ruleCode("AMT-01").ruleName("High Amount")
                .ruleCategory("AMOUNT_ANOMALY").scoreWeight(35)
                .ruleConfig(Map.of("threshold", 100000)).applicableChannels("ALL").isActive(true).build();

        when(ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc()).thenReturn(List.of(amountRule));

        FraudAlert result = fraudService.scoreTransaction(1L, 10L, "TRF-002",
                new BigDecimal("5000"), "ONLINE", null, null, null, Map.of());

        assertThat(result).isNull(); // Clean — no rules triggered, score = 0
    }

    @Test
    @DisplayName("Score >= 80 triggers BLOCK_TRANSACTION action")
    void veryHighScoreBlocksTransaction() {
        FraudRule r1 = FraudRule.builder().ruleCode("AMT-01").ruleCategory("AMOUNT_ANOMALY")
                .scoreWeight(40).ruleConfig(Map.of("threshold", 50000)).applicableChannels("ALL").isActive(true).build();
        FraudRule r2 = FraudRule.builder().ruleCode("DEV-01").ruleCategory("DEVICE_ANOMALY")
                .scoreWeight(25).ruleConfig(Map.of()).applicableChannels("ALL").isActive(true).build();
        FraudRule r3 = FraudRule.builder().ruleCode("ATO-01").ruleCategory("ACCOUNT_TAKEOVER")
                .scoreWeight(30).ruleConfig(Map.of()).applicableChannels("ALL").isActive(true).build();

        when(ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc()).thenReturn(List.of(r1, r2, r3));
        when(alertRepository.getNextAlertSequence()).thenReturn(2L);
        when(alertRepository.save(any())).thenAnswer(inv -> { FraudAlert a = inv.getArgument(0); a.setId(2L); return a; });

        FraudAlert result = fraudService.scoreTransaction(1L, 10L, "TRF-003",
                new BigDecimal("100000"), "ONLINE", "new-dev", "1.2.3.4", null,
                Map.of("is_new_device", true, "recent_password_change", true));

        assertThat(result).isNotNull();
        assertThat(result.getRiskScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.getActionTaken()).isEqualTo("BLOCK_TRANSACTION");
    }
}
