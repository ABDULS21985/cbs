package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
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
                .build();

        SanctionsScreeningResultResponse sanctionsResult = SanctionsScreeningResultResponse.builder()
                .overallResult(SanctionsOverallResult.CONFIRMED_MATCH)
                .matchCount(1)
                .build();

        when(shariahScreeningService.preScreenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.DUAL_BLOCKED, result.getOverallOutcome());
        assertFalse(result.isShariahClear());
        assertFalse(result.isSanctionsClear());
        assertEquals("Block - Both Shariah and Sanctions", result.getActionRequired());
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

        when(shariahScreeningService.preScreenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);

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

        when(shariahScreeningService.preScreenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);

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

        when(shariahScreeningService.preScreenTransaction(any())).thenReturn(shariahResult);
        when(sanctionsScreeningService.screenTransactionCounterparty(any())).thenReturn(sanctionsResult);

        CombinedScreeningResult result = service.screenEntity(request);

        assertNotNull(result);
        assertEquals(CombinedScreeningOutcome.CLEAR, result.getOverallOutcome());
        assertTrue(result.isShariahClear());
        assertTrue(result.isSanctionsClear());
        assertEquals("Proceed", result.getActionRequired());
    }
}
