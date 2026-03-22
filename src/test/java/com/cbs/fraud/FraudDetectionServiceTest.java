package com.cbs.fraud;

import com.cbs.common.exception.ResourceNotFoundException;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FraudDetectionServiceTest {

    @Mock
    private FraudRuleRepository ruleRepository;

    @Mock
    private FraudAlertRepository alertRepository;

    @InjectMocks
    private FraudDetectionService fraudService;

    // ── Score transaction tests ─────────────────────────────────────────

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
        assertThat(result.getRiskScore()).isEqualTo(60);
        assertThat(result.getTriggeredRules()).hasSize(2);
        assertThat(result.getActionTaken()).isEqualTo("STEP_UP_AUTH");
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

        assertThat(result).isNull();
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

    // ── Investigation workflow tests ────────────────────────────────────

    @Test
    @DisplayName("assignAlert sets status to INVESTIGATING and assignedTo")
    void assignAlertSetsStatusAndAssignee() {
        FraudAlert alert = FraudAlert.builder().id(1L).alertRef("FRD000000000001")
                .customerId(100L).status("NEW").riskScore(65).description("Test alert").build();

        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.assignAlert(1L, "analyst.john");

        assertThat(result.getStatus()).isEqualTo("INVESTIGATING");
        assertThat(result.getAssignedTo()).isEqualTo("analyst.john");
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("resolveAlert with FALSE_POSITIVE sets correct status")
    void resolveAlertFalsePositive() {
        FraudAlert alert = FraudAlert.builder().id(2L).alertRef("FRD000000000002")
                .customerId(100L).status("INVESTIGATING").riskScore(55).description("Test alert").build();

        when(alertRepository.findById(2L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.resolveAlert(2L, "FALSE_POSITIVE", "analyst.jane");

        assertThat(result.getStatus()).isEqualTo("FALSE_POSITIVE");
        assertThat(result.getResolutionNotes()).isEqualTo("FALSE_POSITIVE");
        assertThat(result.getResolvedBy()).isEqualTo("analyst.jane");
        assertThat(result.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("resolveAlert with other resolution sets CONFIRMED_FRAUD")
    void resolveAlertConfirmedFraud() {
        FraudAlert alert = FraudAlert.builder().id(3L).alertRef("FRD000000000003")
                .customerId(100L).status("INVESTIGATING").riskScore(75).description("Suspicious activity").build();

        when(alertRepository.findById(3L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.resolveAlert(3L, "FRAUD_CONFIRMED", "analyst.jane");

        assertThat(result.getStatus()).isEqualTo("CONFIRMED_FRAUD");
        assertThat(result.getResolutionNotes()).isEqualTo("FRAUD_CONFIRMED");
        assertThat(result.getResolvedBy()).isEqualTo("analyst.jane");
        assertThat(result.getResolvedAt()).isNotNull();
    }

    // ── Rule toggle tests ───────────────────────────────────────────────

    @Test
    @DisplayName("toggleRule flips isActive from true to false")
    void toggleRuleDeactivates() {
        FraudRule rule = FraudRule.builder().id(10L).ruleCode("AMT-01").ruleName("High Amount")
                .ruleCategory("AMOUNT_ANOMALY").isActive(true).scoreWeight(30).build();

        when(ruleRepository.findById(10L)).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(FraudRule.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudRule result = fraudService.toggleRule(10L);

        assertThat(result.getIsActive()).isFalse();
        verify(ruleRepository).save(rule);
    }

    @Test
    @DisplayName("toggleRule flips isActive from false to true")
    void toggleRuleActivates() {
        FraudRule rule = FraudRule.builder().id(11L).ruleCode("VEL-01").ruleName("Velocity Check")
                .ruleCategory("VELOCITY").isActive(false).scoreWeight(20).build();

        when(ruleRepository.findById(11L)).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(FraudRule.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudRule result = fraudService.toggleRule(11L);

        assertThat(result.getIsActive()).isTrue();
        verify(ruleRepository).save(rule);
    }

    // ── Action tests ────────────────────────────────────────────────────

    @Test
    @DisplayName("blockCard sets actionTaken to BLOCK_CARD and status to CONFIRMED_FRAUD")
    void blockCardSetsCorrectFields() {
        FraudAlert alert = FraudAlert.builder().id(4L).alertRef("FRD000000000004")
                .customerId(100L).status("NEW").riskScore(85).description("Card fraud detected").build();

        when(alertRepository.findById(4L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.blockCard(4L);

        assertThat(result.getActionTaken()).isEqualTo("BLOCK_CARD");
        assertThat(result.getStatus()).isEqualTo("CONFIRMED_FRAUD");
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("blockAccount sets actionTaken to BLOCK_ACCOUNT and status to CONFIRMED_FRAUD")
    void blockAccountSetsCorrectFields() {
        FraudAlert alert = FraudAlert.builder().id(5L).alertRef("FRD000000000005")
                .customerId(200L).status("INVESTIGATING").riskScore(90).description("Account takeover").build();

        when(alertRepository.findById(5L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.blockAccount(5L);

        assertThat(result.getActionTaken()).isEqualTo("BLOCK_ACCOUNT");
        assertThat(result.getStatus()).isEqualTo("CONFIRMED_FRAUD");
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("fileCase sets actionTaken to CASE_FILED and status to INVESTIGATING")
    void fileCaseSetsCorrectFields() {
        FraudAlert alert = FraudAlert.builder().id(6L).alertRef("FRD000000000006")
                .customerId(300L).status("NEW").riskScore(70).description("Suspicious transfers").build();

        when(alertRepository.findById(6L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudAlert result = fraudService.fileCase(6L, "Multiple suspicious wire transfers detected");

        assertThat(result.getActionTaken()).isEqualTo("CASE_FILED");
        assertThat(result.getStatus()).isEqualTo("INVESTIGATING");
        assertThat(result.getResolutionNotes()).isEqualTo("Multiple suspicious wire transfers detected");
        verify(alertRepository).save(alert);
    }

    // ── Rule creation test ──────────────────────────────────────────────

    @Test
    @DisplayName("createRule saves and returns rule")
    void createRuleSavesAndReturns() {
        FraudRule rule = FraudRule.builder().ruleCode("GEO-01").ruleName("Geo Anomaly")
                .ruleCategory("GEO_ANOMALY").scoreWeight(25).isActive(true)
                .ruleConfig(Map.of("expected_country", "NG")).applicableChannels("ALL").build();

        FraudRule savedRule = FraudRule.builder().id(20L).ruleCode("GEO-01").ruleName("Geo Anomaly")
                .ruleCategory("GEO_ANOMALY").scoreWeight(25).isActive(true)
                .ruleConfig(Map.of("expected_country", "NG")).applicableChannels("ALL").build();

        when(ruleRepository.save(rule)).thenReturn(savedRule);

        FraudRule result = fraudService.createRule(rule);

        assertThat(result.getId()).isEqualTo(20L);
        assertThat(result.getRuleCode()).isEqualTo("GEO-01");
        assertThat(result.getRuleName()).isEqualTo("Geo Anomaly");
        verify(ruleRepository).save(rule);
    }

    // ── Exception tests ─────────────────────────────────────────────────

    @Test
    @DisplayName("findAlertOrThrow throws ResourceNotFoundException for missing ID")
    void findAlertOrThrowThrowsForMissingId() {
        when(alertRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fraudService.assignAlert(999L, "analyst.john"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("FraudAlert")
                .hasMessageContaining("999");
    }
}
