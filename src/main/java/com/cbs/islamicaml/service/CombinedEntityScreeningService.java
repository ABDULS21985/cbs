package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.entity.SanctionsScreeningResult;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ExclusionListType;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
        List<EntitySource> shariahSources = collectShariahSources();
        List<EntitySource> sanctionsSources = collectSanctionsSources();
        List<OverlappingEntity> overlaps = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (EntitySource shariahSource : shariahSources) {
            for (EntitySource sanctionsSource : sanctionsSources) {
                if (!isOverlap(shariahSource, sanctionsSource)) {
                    continue;
                }
                String dedupeKey = shariahSource.normalizedName + "|"
                        + shariahSource.listCode + "|" + sanctionsSource.listCode;
                if (!seen.add(dedupeKey)) {
                    continue;
                }
                overlaps.add(OverlappingEntity.builder()
                        .entityName(shariahSource.rawName)
                        .shariahListCode(shariahSource.listCode)
                        .sanctionsListCode(sanctionsSource.listCode)
                        .shariahReason(shariahSource.reason)
                        .sanctionsReason(sanctionsSource.reason)
                        .build());
            }
        }

        log.info("Found {} overlapping entities across Shariah and sanctions lists", overlaps.size());
        return overlaps;
    }

    private List<EntitySource> collectShariahSources() {
        List<EntitySource> sources = new ArrayList<>();

        List<ShariahScreeningResult> results = new ArrayList<>(shariahResultRepository.findByOverallResult(ScreeningOverallResult.FAIL));
        results.addAll(shariahResultRepository.findByOverallResult(ScreeningOverallResult.ALERT));
        for (ShariahScreeningResult result : results) {
            if (StringUtils.hasText(result.getCounterpartyName())) {
                sources.add(new EntitySource(
                        result.getCounterpartyName(),
                        normalize(result.getCounterpartyName()),
                        StringUtils.hasText(result.getContractTypeCode()) ? result.getContractTypeCode() : "SHARIAH_SCREENING",
                        StringUtils.hasText(result.getBlockReason()) ? result.getBlockReason() : "Flagged in Shariah screening"));
            }
        }

        for (ShariahExclusionList list : exclusionListRepository.findByStatus("ACTIVE")) {
            if (list.getListType() != ExclusionListType.COUNTERPARTY_ID
                    && list.getListType() != ExclusionListType.KEYWORD) {
                continue;
            }
            for (ShariahExclusionListEntry entry : exclusionListEntryRepository.findByListIdAndStatus(list.getId(), "ACTIVE")) {
                if (!StringUtils.hasText(entry.getEntryValue())) {
                    continue;
                }
                sources.add(new EntitySource(
                        entry.getEntryValue(),
                        normalize(entry.getEntryValue()),
                        list.getListCode(),
                        StringUtils.hasText(entry.getReason()) ? entry.getReason() : list.getName()));
            }
        }

        return deduplicateSources(sources);
    }

    private List<EntitySource> collectSanctionsSources() {
        List<EntitySource> sources = new ArrayList<>();
        List<SanctionsScreeningResult> allSanctionsHits = new ArrayList<>(sanctionsResultRepository
                .findByOverallResult(SanctionsOverallResult.POTENTIAL_MATCH));
        allSanctionsHits.addAll(sanctionsResultRepository.findByOverallResult(SanctionsOverallResult.CONFIRMED_MATCH));

        for (SanctionsScreeningResult result : allSanctionsHits) {
            if (StringUtils.hasText(result.getEntityName())) {
                sources.add(new EntitySource(
                        result.getEntityName(),
                        normalize(result.getEntityName()),
                        "SANCTIONS_SCREENING",
                        "Entity screened as sanctions hit with overall result " + result.getOverallResult()));
            }
            if (result.getMatchDetails() == null) {
                continue;
            }
            for (Map<String, Object> matchDetail : result.getMatchDetails()) {
                String matchedName = stringValue(matchDetail.get("matchedName"));
                if (!StringUtils.hasText(matchedName)) {
                    continue;
                }
                String listCode = stringValue(matchDetail.get("listCode"));
                String matchType = stringValue(matchDetail.get("matchType"));
                String matchScore = stringValue(matchDetail.get("matchScore"));
                sources.add(new EntitySource(
                        matchedName,
                        normalize(matchedName),
                        StringUtils.hasText(listCode) ? listCode : "SANCTIONS",
                        "Matched in sanctions screening"
                                + (StringUtils.hasText(matchType) ? " (" + matchType + ")" : "")
                                + (StringUtils.hasText(matchScore) ? " score=" + matchScore : "")));
            }
        }
        return deduplicateSources(sources);
    }

    private List<EntitySource> deduplicateSources(List<EntitySource> sources) {
        Map<String, EntitySource> deduped = new LinkedHashMap<>();
        for (EntitySource source : sources) {
            if (!StringUtils.hasText(source.normalizedName)) {
                continue;
            }
            deduped.putIfAbsent(source.normalizedName + "|" + source.listCode, source);
        }
        return new ArrayList<>(deduped.values());
    }

    private boolean isOverlap(EntitySource shariahSource, EntitySource sanctionsSource) {
        if (!StringUtils.hasText(shariahSource.normalizedName) || !StringUtils.hasText(sanctionsSource.normalizedName)) {
            return false;
        }
        if (shariahSource.normalizedName.equals(sanctionsSource.normalizedName)) {
            return true;
        }
        return sanctionsScreeningService.calculateNameSimilarity(
                shariahSource.normalizedName,
                sanctionsSource.normalizedName) >= 90.0;
    }

    private String normalize(String value) {
        return sanctionsScreeningService.normalizeArabicName(value);
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static final class EntitySource {
        private final String rawName;
        private final String normalizedName;
        private final String listCode;
        private final String reason;

        private EntitySource(String rawName, String normalizedName, String listCode, String reason) {
            this.rawName = rawName;
            this.normalizedName = normalizedName;
            this.listCode = listCode;
            this.reason = reason;
        }
    }
}
