package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CombinedEntityScreeningService {

    private final ShariahScreeningService shariahScreeningService;
    private final IslamicSanctionsScreeningService sanctionsScreeningService;

    // ===================== COMBINED ENTITY SCREENING =====================

    public CombinedScreeningResult screenEntity(EntityScreeningRequest request) {
        if (request == null || !StringUtils.hasText(request.getEntityName())) {
            throw new IllegalArgumentException("Entity name is required for combined screening");
        }

        log.info("Starting combined screening for entity: {}", request.getEntityName());

        // 1. Run Shariah screening
        ShariahScreeningResultResponse shariahResult = null;
        boolean shariahClear = true;
        try {
            ShariahScreeningRequest shariahReq = ShariahScreeningRequest.builder()
                    .transactionRef(request.getEntityName())
                    .counterpartyName(request.getEntityName())
                    .transactionType(request.getTransactionType())
                    .contractRef(request.getShariahContractRef())
                    .contractTypeCode(request.getShariahProductCode())
                    .build();
            shariahResult = shariahScreeningService.preScreenTransaction(shariahReq);
            shariahClear = shariahResult.getOverallResult() == ScreeningOverallResult.PASS;
        } catch (Exception e) {
            log.warn("Shariah screening failed for entity '{}': {}", request.getEntityName(), e.getMessage());
        }

        // 2. Run sanctions screening
        SanctionsScreeningResultResponse sanctionsResult = null;
        boolean sanctionsClear = true;
        try {
            TransactionCounterpartyRequest counterpartyReq = TransactionCounterpartyRequest.builder()
                    .entityName(request.getEntityName())
                    .entityType(StringUtils.hasText(request.getEntityType())
                            ? request.getEntityType() : "CORPORATE")
                    .entityCountry(request.getEntityCountry())
                    .entityIdentifiers(request.getEntityIdentifiers())
                    .build();
            sanctionsResult = sanctionsScreeningService.screenTransactionCounterparty(counterpartyReq);
            sanctionsClear = sanctionsResult.getOverallResult() == SanctionsOverallResult.CLEAR;
        } catch (Exception e) {
            log.warn("Sanctions screening failed for entity '{}': {}", request.getEntityName(), e.getMessage());
        }

        // 3. Determine combined outcome
        CombinedScreeningOutcome outcome;
        String actionRequired;

        if (shariahClear && sanctionsClear) {
            outcome = CombinedScreeningOutcome.CLEAR;
            actionRequired = "Proceed";
        } else if (!shariahClear && sanctionsClear) {
            outcome = CombinedScreeningOutcome.SHARIAH_BLOCKED;
            actionRequired = "Block - Shariah restriction";
        } else if (shariahClear && !sanctionsClear) {
            outcome = CombinedScreeningOutcome.SANCTIONS_BLOCKED;
            actionRequired = "Block - Sanctions match";
        } else {
            outcome = CombinedScreeningOutcome.DUAL_BLOCKED;
            actionRequired = "Block - Both Shariah and Sanctions";
        }

        log.info("Combined screening for entity '{}': outcome={}, shariahClear={}, sanctionsClear={}",
                request.getEntityName(), outcome, shariahClear, sanctionsClear);

        return CombinedScreeningResult.builder()
                .entityName(request.getEntityName())
                .overallOutcome(outcome)
                .shariahResult(shariahResult)
                .sanctionsResult(sanctionsResult)
                .shariahClear(shariahClear)
                .sanctionsClear(sanctionsClear)
                .actionRequired(actionRequired)
                .build();
    }

    // ===================== OVERLAPPING ENTITIES =====================

    public List<OverlappingEntity> findOverlappingEntities() {
        // Simplified: in a full implementation this would cross-reference
        // Shariah exclusion list entries with sanctions list entries
        // to find entities that appear on both types of lists
        log.info("Finding overlapping entities across Shariah and sanctions lists");
        return List.of();
    }
}
