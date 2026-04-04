package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.*;
import com.cbs.shariahcompliance.repository.*;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShariahScreeningServiceTest {

    @Mock
    ShariahScreeningRuleRepository ruleRepository;
    @Mock
    ShariahExclusionListRepository listRepository;
    @Mock
    ShariahExclusionListEntryRepository entryRepository;
    @Mock
    ShariahScreeningResultRepository resultRepository;
    @Mock
    ShariahComplianceAlertRepository alertRepository;
    @Mock
    CurrentActorProvider actorProvider;
    @Mock
    CurrentTenantResolver tenantResolver;

    @InjectMocks
    ShariahScreeningService service;

    private ShariahScreeningRule haramMccRule;
    private ShariahExclusionList mccExclusionList;

    @BeforeEach
    void setUp() {
        haramMccRule = ShariahScreeningRule.builder()
                .id(1L)
                .ruleCode("SCR-HARAM-MCC")
                .name("Haram MCC Check")
                .description("Block transactions to haram merchant categories")
                .category(ScreeningCategory.MERCHANT_CATEGORY)
                .ruleType(ScreeningRuleType.MCC_LIST)
                .action(ScreeningAction.BLOCK)
                .severity(ScreeningSeverity.CRITICAL)
                .referenceListCode("HARAM_MCC_LIST")
                .enabled(true)
                .priority(1)
                .effectiveFrom(LocalDate.of(2020, 1, 1))
                .build();

        mccExclusionList = ShariahExclusionList.builder()
                .id(10L)
                .listCode("HARAM_MCC_LIST")
                .name("Haram MCC List")
                .listType(ExclusionListType.MCC_CODE)
                .status("ACTIVE")
                .build();
    }

    @Test
    void screenTransaction_haramMcc_blocked() {
        // Arrange
        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-001")
                .transactionType("PURCHASE")
                .amount(new BigDecimal("500.00"))
                .currencyCode("SAR")
                .merchantCategoryCode("5813")
                .customerId(100L)
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(haramMccRule));
        when(listRepository.findByListCode("HARAM_MCC_LIST")).thenReturn(Optional.of(mccExclusionList));
        when(entryRepository.existsByListIdAndEntryValueAndStatus(10L, "5813", "ACTIVE")).thenReturn(true);
        when(actorProvider.getCurrentActor()).thenReturn("system");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(resultRepository.save(any(ShariahScreeningResult.class))).thenAnswer(inv -> {
            ShariahScreeningResult r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });
        when(alertRepository.save(any(ShariahComplianceAlert.class))).thenAnswer(inv -> {
            ShariahComplianceAlert a = inv.getArgument(0);
            a.setId(50L);
            return a;
        });

        // Act
        ShariahScreeningResultResponse result = service.screenTransaction(request);

        // Assert
        assertEquals(ScreeningOverallResult.FAIL, result.getOverallResult());
        assertEquals(ScreeningActionTaken.BLOCKED, result.getActionTaken());
        assertEquals(1, result.getRulesFailed());
        assertEquals(0, result.getRulesPassed());
        assertNotNull(result.getBlockReason());
        assertNotNull(result.getAlertId());
        verify(resultRepository).save(any(ShariahScreeningResult.class));
        verify(alertRepository).save(any(ShariahComplianceAlert.class));
    }

    @Test
    void screenTransaction_cleanMcc_pass() {
        // Arrange: MCC 5411 (grocery) not in exclusion list
        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-002")
                .transactionType("PURCHASE")
                .amount(new BigDecimal("200.00"))
                .currencyCode("SAR")
                .merchantCategoryCode("5411")
                .customerId(101L)
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(haramMccRule));
        when(listRepository.findByListCode("HARAM_MCC_LIST")).thenReturn(Optional.of(mccExclusionList));
        when(entryRepository.existsByListIdAndEntryValueAndStatus(10L, "5411", "ACTIVE")).thenReturn(false);
        when(actorProvider.getCurrentActor()).thenReturn("system");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(resultRepository.save(any(ShariahScreeningResult.class))).thenAnswer(inv -> {
            ShariahScreeningResult r = inv.getArgument(0);
            r.setId(2L);
            return r;
        });

        // Act
        ShariahScreeningResultResponse result = service.screenTransaction(request);

        // Assert
        assertEquals(ScreeningOverallResult.PASS, result.getOverallResult());
        assertEquals(ScreeningActionTaken.ALLOWED, result.getActionTaken());
        assertEquals(0, result.getRulesFailed());
        assertEquals(1, result.getRulesPassed());
        assertNull(result.getBlockReason());
        verify(alertRepository, never()).save(any(ShariahComplianceAlert.class));
    }

    @Test
    void screenTransaction_markupExceedsLimit_alert() {
        // Arrange: threshold rule for markup > 25%
        ShariahScreeningRule thresholdRule = ShariahScreeningRule.builder()
                .id(2L)
                .ruleCode("SCR-MARKUP-LIMIT")
                .name("Markup Rate Limit")
                .category(ScreeningCategory.PRICING)
                .ruleType(ScreeningRuleType.THRESHOLD)
                .action(ScreeningAction.ALERT)
                .severity(ScreeningSeverity.HIGH)
                .thresholdField("markupRate")
                .thresholdOperator(ThresholdOperator.GT)
                .thresholdValue(new BigDecimal("25"))
                .enabled(true)
                .priority(10)
                .effectiveFrom(LocalDate.of(2020, 1, 1))
                .build();

        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-003")
                .transactionType("MURABAHA_BOOKING")
                .amount(new BigDecimal("100000.00"))
                .currencyCode("SAR")
                .contractTypeCode("MURABAHA")
                .customerId(102L)
                .additionalContext(Map.of("markupRate", 30.0))
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(thresholdRule));
        when(actorProvider.getCurrentActor()).thenReturn("system");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(resultRepository.save(any(ShariahScreeningResult.class))).thenAnswer(inv -> {
            ShariahScreeningResult r = inv.getArgument(0);
            r.setId(3L);
            return r;
        });
        when(alertRepository.save(any(ShariahComplianceAlert.class))).thenAnswer(inv -> {
            ShariahComplianceAlert a = inv.getArgument(0);
            a.setId(51L);
            return a;
        });

        // Act
        ShariahScreeningResultResponse result = service.screenTransaction(request);

        // Assert
        assertEquals(ScreeningOverallResult.ALERT, result.getOverallResult());
        assertEquals(ScreeningActionTaken.ALLOWED_WITH_ALERT, result.getActionTaken());
        assertEquals(0, result.getRulesFailed());
        assertEquals(1, result.getRulesAlerted());
    }

    @Test
    void screenTransaction_productNonCompliant_blocked() {
        // Arrange: condition expression rule for non-compliant product
        ShariahScreeningRule conditionRule = ShariahScreeningRule.builder()
                .id(3L)
                .ruleCode("SCR-PRODUCT-COMPLIANCE")
                .name("Product Shariah Compliance Check")
                .description("Block transactions on non-compliant products")
                .category(ScreeningCategory.STRUCTURAL)
                .ruleType(ScreeningRuleType.CONDITION_EXPRESSION)
                .action(ScreeningAction.BLOCK)
                .severity(ScreeningSeverity.CRITICAL)
                .conditionExpression("product.shariahComplianceStatus != 'COMPLIANT'")
                .enabled(true)
                .priority(5)
                .effectiveFrom(LocalDate.of(2020, 1, 1))
                .build();

        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-004")
                .transactionType("DISBURSEMENT")
                .amount(new BigDecimal("50000.00"))
                .currencyCode("SAR")
                .customerId(103L)
                .additionalContext(Map.of("shariahComplianceStatus", "NON_COMPLIANT"))
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(conditionRule));
        when(actorProvider.getCurrentActor()).thenReturn("system");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(resultRepository.save(any(ShariahScreeningResult.class))).thenAnswer(inv -> {
            ShariahScreeningResult r = inv.getArgument(0);
            r.setId(4L);
            return r;
        });
        when(alertRepository.save(any(ShariahComplianceAlert.class))).thenAnswer(inv -> {
            ShariahComplianceAlert a = inv.getArgument(0);
            a.setId(52L);
            return a;
        });

        // Act
        ShariahScreeningResultResponse result = service.screenTransaction(request);

        // Assert
        assertEquals(ScreeningOverallResult.FAIL, result.getOverallResult());
        assertEquals(ScreeningActionTaken.BLOCKED, result.getActionTaken());
        assertEquals(1, result.getRulesFailed());
    }

    @Test
    void preScreenTransaction_doesNotPersist() {
        // Arrange
        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-005")
                .transactionType("PURCHASE")
                .amount(new BigDecimal("300.00"))
                .currencyCode("SAR")
                .merchantCategoryCode("5813")
                .customerId(104L)
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(haramMccRule));
        when(listRepository.findByListCode("HARAM_MCC_LIST")).thenReturn(Optional.of(mccExclusionList));
        when(entryRepository.existsByListIdAndEntryValueAndStatus(10L, "5813", "ACTIVE")).thenReturn(true);

        // Act
        ShariahScreeningResultResponse result = service.preScreenTransaction(request);

        // Assert
        assertEquals("PREVIEW", result.getScreeningRef());
        assertEquals(ScreeningOverallResult.FAIL, result.getOverallResult());
        assertEquals(ScreeningActionTaken.BLOCKED, result.getActionTaken());
        verify(resultRepository, never()).save(any(ShariahScreeningResult.class));
        verify(alertRepository, never()).save(any(ShariahComplianceAlert.class));
    }

    @Test
    void screenTransaction_block_createsAlert() {
        // Arrange
        ShariahScreeningRequest request = ShariahScreeningRequest.builder()
                .transactionRef("TXN-006")
                .transactionType("PURCHASE")
                .amount(new BigDecimal("1000.00"))
                .currencyCode("SAR")
                .merchantCategoryCode("5813")
                .customerId(105L)
                .build();

        when(ruleRepository.findByEnabledTrueOrderByPriorityAsc()).thenReturn(List.of(haramMccRule));
        when(listRepository.findByListCode("HARAM_MCC_LIST")).thenReturn(Optional.of(mccExclusionList));
        when(entryRepository.existsByListIdAndEntryValueAndStatus(10L, "5813", "ACTIVE")).thenReturn(true);
        when(actorProvider.getCurrentActor()).thenReturn("system");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(resultRepository.save(any(ShariahScreeningResult.class))).thenAnswer(inv -> {
            ShariahScreeningResult r = inv.getArgument(0);
            r.setId(6L);
            return r;
        });

        ArgumentCaptor<ShariahComplianceAlert> alertCaptor = ArgumentCaptor.forClass(ShariahComplianceAlert.class);
        when(alertRepository.save(alertCaptor.capture())).thenAnswer(inv -> {
            ShariahComplianceAlert a = inv.getArgument(0);
            a.setId(60L);
            return a;
        });

        // Act
        service.screenTransaction(request);

        // Assert
        verify(alertRepository).save(any(ShariahComplianceAlert.class));
        ShariahComplianceAlert capturedAlert = alertCaptor.getValue();
        assertEquals(AlertStatus.NEW, capturedAlert.getStatus());
        assertEquals(ScreeningSeverity.CRITICAL, capturedAlert.getSeverity());
        assertEquals("TXN-006", capturedAlert.getTransactionRef());
        assertNotNull(capturedAlert.getSlaDeadline());
        assertFalse(capturedAlert.isSlaBreach());
        assertEquals("SCR-HARAM-MCC", capturedAlert.getRuleCode());
    }
}
