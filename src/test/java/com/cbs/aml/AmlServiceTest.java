package com.cbs.aml;

import com.cbs.account.repository.AccountRepository;
import com.cbs.aml.engine.AmlMonitoringEngine;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import com.cbs.aml.entity.AmlRule;
import com.cbs.aml.entity.AmlRuleCategory;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.aml.repository.AmlRuleRepository;
import com.cbs.aml.service.AmlService;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.repository.CustomerRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AmlServiceTest {

    @Mock
    private AmlRuleRepository ruleRepository;

    @Mock
    private AmlAlertRepository alertRepository;

    @Mock
    private AmlMonitoringEngine monitoringEngine;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private AmlService service;

    // ========================================================================
    // ALERT WORKFLOW
    // ========================================================================

    @Test
    @DisplayName("assignAlert sets status to UNDER_REVIEW and assignedTo")
    void assignAlertSetsStatusAndAssignee() {
        AmlAlert alert = buildAlert(1L, AmlAlertStatus.NEW);

        when(alertRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(AmlAlert.class))).thenAnswer(i -> i.getArgument(0));

        AmlAlert result = service.assignAlert(1L, "analyst@bank.com");

        assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.UNDER_REVIEW);
        assertThat(result.getAssignedTo()).isEqualTo("analyst@bank.com");
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("escalateAlert sets status to ESCALATED and priority to CRITICAL")
    void escalateAlertSetsStatusAndPriority() {
        AmlAlert alert = buildAlert(2L, AmlAlertStatus.UNDER_REVIEW);

        when(alertRepository.findByIdWithDetails(2L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(AmlAlert.class))).thenAnswer(i -> i.getArgument(0));

        AmlAlert result = service.escalateAlert(2L);

        assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.ESCALATED);
        assertThat(result.getPriority()).isEqualTo("CRITICAL");
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("resolveAlert with FALSE_POSITIVE sets FALSE_POSITIVE status")
    void resolveAlertFalsePositive() {
        AmlAlert alert = buildAlert(3L, AmlAlertStatus.UNDER_REVIEW);

        when(alertRepository.findByIdWithDetails(3L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(AmlAlert.class))).thenAnswer(i -> i.getArgument(0));

        AmlAlert result = service.resolveAlert(3L, "FALSE_POSITIVE", "compliance_officer");

        assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.FALSE_POSITIVE);
        assertThat(result.getResolutionNotes()).isEqualTo("FALSE_POSITIVE");
        assertThat(result.getResolvedBy()).isEqualTo("compliance_officer");
        assertThat(result.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("resolveAlert with other resolution sets CLOSED status")
    void resolveAlertClosed() {
        AmlAlert alert = buildAlert(4L, AmlAlertStatus.UNDER_REVIEW);

        when(alertRepository.findByIdWithDetails(4L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(AmlAlert.class))).thenAnswer(i -> i.getArgument(0));

        AmlAlert result = service.resolveAlert(4L, "CONFIRMED_ACTIVITY", "senior_analyst");

        assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.CLOSED);
        assertThat(result.getResolutionNotes()).isEqualTo("CONFIRMED_ACTIVITY");
        assertThat(result.getResolvedBy()).isEqualTo("senior_analyst");
        assertThat(result.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("fileSar sets SAR_FILED status with reference and date")
    void fileSarSetsStatusReferenceAndDate() {
        AmlAlert alert = buildAlert(5L, AmlAlertStatus.ESCALATED);

        when(alertRepository.findByIdWithDetails(5L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(AmlAlert.class))).thenAnswer(i -> i.getArgument(0));

        AmlAlert result = service.fileSar(5L, "SAR-2026-00123", "compliance_head");

        assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.SAR_FILED);
        assertThat(result.getSarReference()).isEqualTo("SAR-2026-00123");
        assertThat(result.getSarFiledDate()).isEqualTo(LocalDate.now());
        assertThat(result.getResolvedBy()).isEqualTo("compliance_head");
        assertThat(result.getResolvedAt()).isNotNull();
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("getAlert throws ResourceNotFoundException for missing ID")
    void getAlertThrowsForMissingId() {
        when(alertRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getAlert(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ========================================================================
    // RULES
    // ========================================================================

    @Test
    @DisplayName("toggleRule flips isActive from true to false")
    void toggleRuleDeactivates() {
        AmlRule rule = buildRule(1L, true);

        when(ruleRepository.findById(1L)).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(AmlRule.class))).thenAnswer(i -> i.getArgument(0));

        AmlRule result = service.toggleRule(1L);

        assertThat(result.getIsActive()).isFalse();
        verify(ruleRepository).save(rule);
    }

    @Test
    @DisplayName("toggleRule flips isActive from false to true")
    void toggleRuleActivates() {
        AmlRule rule = buildRule(2L, false);

        when(ruleRepository.findById(2L)).thenReturn(Optional.of(rule));
        when(ruleRepository.save(any(AmlRule.class))).thenAnswer(i -> i.getArgument(0));

        AmlRule result = service.toggleRule(2L);

        assertThat(result.getIsActive()).isTrue();
        verify(ruleRepository).save(rule);
    }

    @Test
    @DisplayName("createRule saves and returns rule")
    void createRuleSavesAndReturns() {
        AmlRule rule = buildRule(null, true);
        AmlRule saved = buildRule(10L, true);

        when(ruleRepository.save(rule)).thenReturn(saved);

        AmlRule result = service.createRule(rule);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getRuleCode()).isEqualTo(saved.getRuleCode());
        verify(ruleRepository).save(rule);
    }

    // ========================================================================
    // DASHBOARD
    // ========================================================================

    @Test
    @DisplayName("getDashboard returns correct counts for each status")
    void getDashboardReturnsCorrectCounts() {
        when(alertRepository.countByStatus(AmlAlertStatus.NEW)).thenReturn(15L);
        when(alertRepository.countByStatus(AmlAlertStatus.UNDER_REVIEW)).thenReturn(8L);
        when(alertRepository.countByStatus(AmlAlertStatus.ESCALATED)).thenReturn(3L);
        when(alertRepository.countByStatus(AmlAlertStatus.SAR_FILED)).thenReturn(1L);

        AmlService.AmlDashboard dashboard = service.getDashboard();

        assertThat(dashboard.newAlerts()).isEqualTo(15L);
        assertThat(dashboard.underReview()).isEqualTo(8L);
        assertThat(dashboard.escalated()).isEqualTo(3L);
        assertThat(dashboard.sarFiled()).isEqualTo(1L);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private AmlAlert buildAlert(Long id, AmlAlertStatus status) {
        AmlAlert alert = new AmlAlert();
        alert.setId(id);
        alert.setAlertRef("AML" + String.format("%012d", id));
        alert.setAlertType("STRUCTURING");
        alert.setSeverity("HIGH");
        alert.setDescription("Suspicious structuring pattern detected");
        alert.setTriggerAmount(new BigDecimal("9500.00"));
        alert.setPriority("HIGH");
        alert.setStatus(status);
        return alert;
    }

    private AmlRule buildRule(Long id, boolean active) {
        AmlRule rule = new AmlRule();
        rule.setId(id);
        rule.setRuleCode("AML-STR-001");
        rule.setRuleName("Structuring Detection");
        rule.setRuleCategory(AmlRuleCategory.STRUCTURING);
        rule.setSeverity("HIGH");
        rule.setThresholdAmount(new BigDecimal("10000.00"));
        rule.setThresholdCount(3);
        rule.setThresholdPeriodHours(24);
        rule.setIsActive(active);
        return rule;
    }
}
