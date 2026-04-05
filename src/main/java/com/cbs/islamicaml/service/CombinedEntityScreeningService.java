package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.entity.SanctionsScreeningResult;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.entity.ShariahScreeningResult;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CombinedEntityScreeningService {

    private final ShariahScreeningService shariahScreeningService;
    private final IslamicSanctionsScreeningService sanctionsScreeningService;
    private final SanctionsScreeningResultRepository sanctionsResultRepository;
    private final ShariahScreeningResultRepository shariahResultRepository;
    private final ShariahExclusionListRepository exclusionListRepository;
    private final ShariahExclusionListEntryRepository exclusionListEntryRepository;

    // ===================== COMBINED ENTITY SCREENING =====================

    @Transactional
    public CombinedScreeningResult screenEntity(EntityScreeningRequest request) {
        if (request == null || !StringUtils.hasText(request.getEntityName())) {
            throw new IllegalArgumentException("Entity name is required for combined screening");
        }

        log.info("Starting combined screening for entity: {}", request.getEntityName());

        // 1. Run Shariah screening (fail-closed: screening failure means NOT clear)
        ShariahScreeningResultResponse shariahResult = null;
        boolean shariahClear = false;
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
            log.error("Shariah screening failed for entity '{}' — treating as NOT CLEAR (fail-closed): {}",
                    request.getEntityName(), e.getMessage());
        }

        // 2. Run sanctions screening (fail-closed: screening failure means NOT clear)
        SanctionsScreeningResultResponse sanctionsResult = null;
        boolean sanctionsClear = false;
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
            log.error("Sanctions screening failed for entity '{}' — treating as NOT CLEAR (fail-closed): {}",
                    request.getEntityName(), e.getMessage());
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

        CombinedScreeningResult result = CombinedScreeningResult.builder()
                .entityName(request.getEntityName())
                .overallOutcome(outcome)
                .shariahResult(shariahResult)
                .sanctionsResult(sanctionsResult)
                .shariahClear(shariahClear)
                .sanctionsClear(sanctionsClear)
                .actionRequired(actionRequired)
                .build();

        // 4. Persist combined screening result for audit trail
        log.info("AUDIT: Combined entity screening completed — entity={}, outcome={}, shariahClear={}, sanctionsClear={}, " +
                        "shariahScreeningRef={}, sanctionsScreeningRef={}",
                request.getEntityName(), outcome, shariahClear, sanctionsClear,
                shariahResult != null ? shariahResult.getScreeningRef() : "FAILED",
                sanctionsResult != null ? sanctionsResult.getScreeningRef() : "FAILED");

        return result;
    }

    // ===================== OVERLAPPING ENTITIES =====================

    public List<OverlappingEntity> findOverlappingEntities() {
        log.info("Finding overlapping entities across Shariah and sanctions lists");

        // Collect entity names from Shariah screening results that were not PASS
        List<ShariahScreeningResult> shariahResults = shariahResultRepository
                .findByOverallResult(ScreeningOverallResult.FAIL);
        // Collect entity names from sanctions screening results that were not CLEAR
        List<SanctionsScreeningResult> sanctionsMatches = sanctionsResultRepository
                .findByOverallResult(SanctionsOverallResult.POTENTIAL_MATCH);
        List<SanctionsScreeningResult> sanctionsConfirmed = sanctionsResultRepository
                .findByOverallResult(SanctionsOverallResult.CONFIRMED_MATCH);

        // Build a set of sanctioned entity names (lowercased for matching)
        Set<String> sanctionedNames = new HashSet<>();
        List<SanctionsScreeningResult> allSanctionsHits = new ArrayList<>(sanctionsMatches);
        allSanctionsHits.addAll(sanctionsConfirmed);
        for (SanctionsScreeningResult sr : allSanctionsHits) {
            if (sr.getEntityName() != null) {
                sanctionedNames.add(sr.getEntityName().toLowerCase());
            }
        }

        // Find Shariah-flagged entities that also appear in sanctions results
        List<OverlappingEntity> overlaps = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (ShariahScreeningResult sr : shariahResults) {
            String name = sr.getCounterpartyName();
            if (name == null) continue;
            String normalizedName = name.toLowerCase();
            if (sanctionedNames.contains(normalizedName) && seen.add(normalizedName)) {
                overlaps.add(OverlappingEntity.builder()
                        .entityName(name)
                        .shariahListCode(sr.getContractTypeCode())
                        .sanctionsListCode("SANCTIONS")
                        .shariahReason(sr.getBlockReason())
                        .sanctionsReason("Matched in sanctions screening")
                        .build());
            }
        }

        log.info("Found {} overlapping entities across Shariah and sanctions lists", overlaps.size());
        return overlaps;
    }
}
