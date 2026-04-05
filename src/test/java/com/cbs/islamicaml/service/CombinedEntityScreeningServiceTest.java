package com.cbs.islamicaml.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.ProductCategory;
import com.cbs.account.repository.AccountRepository;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.CombinedScreeningAuditLog;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.repository.CombinedScreeningAuditLogRepository;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CombinedEntityScreeningServiceTest {

    @Mock private ShariahScreeningService shariahScreeningService;
    @Mock private IslamicSanctionsScreeningService sanctionsScreeningService;
    @Mock private AccountRepository accountRepository;
    @Mock private SanctionsScreeningResultRepository sanctionsResultRepository;
    @Mock private ShariahScreeningResultRepository shariahResultRepository;
    @Mock private ShariahExclusionListRepository exclusionListRepository;
    @Mock private ShariahExclusionListEntryRepository exclusionListEntryRepository;
    @Mock private CombinedScreeningAuditLogRepository combinedScreeningAuditLogRepository;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks private CombinedEntityScreeningService service;

    // ===================== COMBINED SCREENING OUTCOMES =====================

    @Test
    @DisplayName("Entity on both lists results in DUAL_BLOCKED")
    void entityOnBothLists_dualBlocked() {
        EntityScreeningRequest request = EntityScreeningRequest.builder()
                .entityName("Blocked Corp")
                .entityType("CORPORATE")
                .entityCountry("IR")
                .build();

        ShariahScreeningResultResponse shariahResult = ShariahScreeningResultResponse.builder()
                .overallResult(ScreeningOverallResult.FAIL)
                .alertId(11L)
                .build();

        SanctionsScreeningResultResponse sanctionsResult = SanctionsScreeningResultResponse.builder()
                .overallResult(SanctionsOverallResult.CONFIRMED_MATCH)
                .matchCount(1)
                .alertId(22L)
                .build();

        when(shariahScreeningService.screenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(combinedScreeningAuditLogRepository.save(any(CombinedScreeningAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.DUAL_BLOCKED, result.getOverallOutcome());
        assertFalse(result.isShariahClear());
        assertFalse(result.isSanctionsClear());
        assertEquals("Block - Both Shariah and Sanctions", result.getActionRequired());
        assertEquals(2, result.getAlertsGenerated().size());
    }

    @Test
    @DisplayName("Entity on Shariah list only results in SHARIAH_BLOCKED")
    void entityOnShariahOnly_shariahBlocked() {
        EntityScreeningRequest request = EntityScreeningRequest.builder()
                .entityName("Non-Compliant Corp")
                .entityType("CORPORATE")
                .entityCountry("SA")
                .build();

        ShariahScreeningResultResponse shariahResult = ShariahScreeningResultResponse.builder()
                .overallResult(ScreeningOverallResult.FAIL)
                .build();

        SanctionsScreeningResultResponse sanctionsResult = SanctionsScreeningResultResponse.builder()
                .overallResult(SanctionsOverallResult.CLEAR)
                .matchCount(0)
                .build();

        when(shariahScreeningService.screenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(combinedScreeningAuditLogRepository.save(any(CombinedScreeningAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.SHARIAH_BLOCKED, result.getOverallOutcome());
        assertFalse(result.isShariahClear());
        assertTrue(result.isSanctionsClear());
        assertEquals("Block - Shariah restriction", result.getActionRequired());
    }

    @Test
    @DisplayName("Entity on sanctions list only results in SANCTIONS_BLOCKED")
    void entityOnSanctionsOnly_sanctionsBlocked() {
        EntityScreeningRequest request = EntityScreeningRequest.builder()
                .entityName("Sanctioned Entity")
                .entityType("CORPORATE")
                .entityCountry("SY")
                .build();

        ShariahScreeningResultResponse shariahResult = ShariahScreeningResultResponse.builder()
                .overallResult(ScreeningOverallResult.PASS)
                .build();

        SanctionsScreeningResultResponse sanctionsResult = SanctionsScreeningResultResponse.builder()
                .overallResult(SanctionsOverallResult.POTENTIAL_MATCH)
                .matchCount(2)
                .build();

        when(shariahScreeningService.screenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(combinedScreeningAuditLogRepository.save(any(CombinedScreeningAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.SANCTIONS_BLOCKED, result.getOverallOutcome());
        assertTrue(result.isShariahClear());
        assertFalse(result.isSanctionsClear());
        assertEquals("Block - Sanctions match", result.getActionRequired());
    }

    @Test
    @DisplayName("Clean entity with no matches results in CLEAR")
    void cleanEntity_clear() {
        EntityScreeningRequest request = EntityScreeningRequest.builder()
                .entityName("Clean Trading Co")
                .entityType("CORPORATE")
                .entityCountry("SA")
                .build();

        ShariahScreeningResultResponse shariahResult = ShariahScreeningResultResponse.builder()
                .overallResult(ScreeningOverallResult.PASS)
                .build();

        SanctionsScreeningResultResponse sanctionsResult = SanctionsScreeningResultResponse.builder()
                .overallResult(SanctionsOverallResult.CLEAR)
                .matchCount(0)
                .build();

        when(shariahScreeningService.screenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(combinedScreeningAuditLogRepository.save(any(CombinedScreeningAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.CLEAR, result.getOverallOutcome());
        assertTrue(result.isShariahClear());
        assertTrue(result.isSanctionsClear());
        assertEquals("Proceed", result.getActionRequired());
    }

    @Test
    @DisplayName("Islamic account requires both AML and Shariah screening")
    void determineScreeningRequirement_islamicAccount_requiresBoth() {
        Product product = Product.builder()
                .code("WAD-SAV-001")
                .name("Wadiah Savings")
                .productCategory(ProductCategory.SAVINGS)
                .currencyCode("SAR")
                .build();
        Account account = Account.builder()
                .id(10L)
                .accountNumber("0001234567")
                .accountName("Islamic Savings")
                .product(product)
                .currencyCode("SAR")
                .build();

        when(accountRepository.findByIdWithProduct(10L)).thenReturn(java.util.Optional.of(account));

        ScreeningRequirement result = service.determineScreeningRequirement(10L, "INTERNAL_TRANSFER");

        assertTrue(result.isIslamicAccount());
        assertTrue(result.isAmlRequired());
        assertTrue(result.isShariahRequired());
        assertFalse(result.isEnhancedAmlRequired());
        assertEquals("AML_AND_SHARIAH", result.getRequirementCode());
    }

    @Test
    @DisplayName("Cross-border tawarruq flow requires enhanced AML and Shariah")
    void determineScreeningRequirement_tawarruqCrossBorder_enhanced() {
        Product product = Product.builder()
                .code("CUR-001")
                .name("Current Account")
                .productCategory(ProductCategory.CURRENT)
                .currencyCode("SAR")
                .build();
        Account account = Account.builder()
                .id(20L)
                .accountNumber("0009876543")
                .accountName("Operating Account")
                .product(product)
                .currencyCode("SAR")
                .build();

        when(accountRepository.findByIdWithProduct(20L)).thenReturn(java.util.Optional.of(account));

        ScreeningRequirement result = service.determineScreeningRequirement(20L, "TAWARRUQ_CROSS_BORDER");

        assertFalse(result.isIslamicAccount());
        assertTrue(result.isAmlRequired());
        assertTrue(result.isShariahRequired());
        assertTrue(result.isEnhancedAmlRequired());
        assertEquals("AML_AND_SHARIAH_ENHANCED", result.getRequirementCode());
    }
}
