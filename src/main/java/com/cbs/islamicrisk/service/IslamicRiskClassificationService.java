package com.cbs.islamicrisk.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicFinancingRiskClassificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicRiskClassificationService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicFinancingRiskClassificationRepository classificationRepository;
    private final IslamicRiskSupport riskSupport;
    private final IslamicEclService islamicEclService;
    private final IslamicCollateralService islamicCollateralService;

    @Transactional
    public IslamicFinancingRiskClassification classifyContract(Long contractId,
                                                               String contractTypeCode,
                                                               LocalDate classificationDate) {
        return classifyContract(contractId, contractTypeCode, classificationDate, null);
    }

    @Transactional
    public IslamicFinancingRiskClassification classifyContract(Long contractId,
                                                               String contractTypeCode,
                                                               LocalDate classificationDate,
                                                               IslamicRiskRequests.ClassifyContractRequest request) {
        LocalDate asOf = classificationDate != null ? classificationDate : LocalDate.now();
        IslamicRiskSupport.ContractSnapshot snapshot = riskSupport.loadContract(contractId, contractTypeCode);
        IslamicEclCalculation latestEcl = ensureLatestEcl(snapshot.contractId(), snapshot.contractTypeCode(), asOf);
        IslamicRiskResponses.CollateralCoverageResult coverage = islamicCollateralService
                .calculateCoverage(snapshot.contractId(), snapshot.contractTypeCode());
        IslamicCreditAssessment assessment = riskSupport.latestAssessment(snapshot.customerId(), snapshot.contractTypeCode());
        IslamicFinancingRiskClassification previous = classificationRepository.findTopByContractIdOrderByClassificationDateDesc(contractId)
                .orElse(null);

        List<String> qualitativeFactors = request != null && request.getQualitativeFactors() != null
                ? new ArrayList<>(request.getQualitativeFactors()) : new ArrayList<>();
        boolean qualitativeOverride = request != null && Boolean.TRUE.equals(request.getQualitativeOverride());
        boolean watchList = previous != null && Boolean.TRUE.equals(previous.getOnWatchList());

        IslamicRiskDomainEnums.Stage ifrsStage = deriveIfrsStage(snapshot.daysPastDue(), qualitativeFactors, watchList, latestEcl);
        if (qualitativeOverride && !qualitativeFactors.isEmpty()) {
            ifrsStage = IslamicRiskDomainEnums.Stage.STAGE_2;
        }
        IslamicRiskDomainEnums.AaoifiClassification aaoifi = deriveAaoifiClassification(snapshot.daysPastDue(), qualitativeFactors, watchList);

        BigDecimal currentPd = assessment != null && assessment.getEstimatedPd() != null
                ? assessment.getEstimatedPd() : BigDecimal.ZERO;
        BigDecimal pdAtOrigination = assessment != null && assessment.getInputData() != null
                ? riskSupport.asBigDecimal(assessment.getInputData().get("originationPd")) : currentPd;
        BigDecimal exposure = latestEcl.getEad() != null ? latestEcl.getEad() : BigDecimal.ZERO;
        BigDecimal overdueAmount = snapshot.daysPastDue() > 0 ? exposure : BigDecimal.ZERO;

        IslamicFinancingRiskClassification classification = IslamicFinancingRiskClassification.builder()
                .contractId(snapshot.contractId())
                .contractRef(snapshot.contractRef())
                .contractTypeCode(snapshot.contractTypeCode())
                .classificationDate(asOf)
                .ifrs9Stage(ifrsStage)
                .ifrs9StagePrevious(previous != null ? previous.getIfrs9Stage() : null)
                .ifrs9StageChangedDate(previous == null || previous.getIfrs9Stage() != ifrsStage ? asOf
                        : previous.getIfrs9StageChangedDate())
                .ifrs9StagingReason(buildStageReason(snapshot.daysPastDue(), qualitativeFactors, watchList, latestEcl))
                .aaoifiClassification(aaoifi)
                .aaoifiClassificationPrevious(previous != null ? previous.getAaoifiClassification() : null)
                .aaoifiClassificationReason(buildAaoifiReason(snapshot.daysPastDue(), qualitativeFactors, watchList))
                .aaoifiMinimumProvisionRate(minimumProvisionRate(aaoifi))
                .daysPastDue(snapshot.daysPastDue())
                .consecutiveMissedPayments(Math.max(0, snapshot.daysPastDue() / 30))
                .totalOverdueAmount(riskSupport.scaleMoney(overdueAmount))
                .outstandingExposure(riskSupport.scaleMoney(exposure))
                .collateralCoverageRatio(coverage.getCoverageRatio().divide(HUNDRED, 6, RoundingMode.HALF_UP))
                .pdAtOrigination(pdAtOrigination)
                .pdCurrent(currentPd)
                .pdChange(currentPd.subtract(pdAtOrigination))
                .contractSpecificRisk(snapshot.contractSpecificRisk())
                .qualitativeOverride(qualitativeOverride)
                .qualitativeFactors(qualitativeFactors)
                .overriddenBy(request != null ? request.getOverriddenBy() : null)
                .overrideReason(request != null ? request.getOverrideReason() : null)
                .onWatchList(watchList || !qualitativeFactors.isEmpty())
                .watchListDate(watchList || !qualitativeFactors.isEmpty() ? asOf : null)
                .watchListReason(!qualitativeFactors.isEmpty() ? String.join("; ", qualitativeFactors)
                        : previous != null ? previous.getWatchListReason() : null)
                .watchListReviewDate((watchList || !qualitativeFactors.isEmpty()) ? asOf.plusDays(30) : null)
                .classifiedBy(request != null && request.getOverriddenBy() != null ? request.getOverriddenBy() : riskSupport.currentActor())
                .tenantId(riskSupport.currentTenantId())
                .build();
        return classificationRepository.save(classification);
    }

    @Transactional
    public void classifyAll(LocalDate classificationDate) {
        LocalDate asOf = classificationDate != null ? classificationDate : LocalDate.now();
        for (String contractType : List.of("MURABAHA", "IJARAH", "MUSHARAKAH")) {
            for (Long contractId : riskSupport.activeContractIds(contractType)) {
                classifyContract(contractId, contractType, asOf);
            }
        }
    }

    @Transactional
    public void addToWatchList(Long contractId, String contractTypeCode, String reason) {
        IslamicFinancingRiskClassification classification = classifyContract(contractId, contractTypeCode, LocalDate.now(),
                IslamicRiskRequests.ClassifyContractRequest.builder()
                        .contractTypeCode(contractTypeCode)
                        .qualitativeFactors(List.of(reason))
                        .build());
        classification.setOnWatchList(true);
        classification.setWatchListDate(LocalDate.now());
        classification.setWatchListReason(reason);
        classification.setWatchListReviewDate(LocalDate.now().plusDays(30));
        classificationRepository.save(classification);
    }

    @Transactional
    public void removeFromWatchList(Long contractId, String reason, String removedBy) {
        IslamicFinancingRiskClassification classification = getLatestClassification(contractId);
        classification.setOnWatchList(false);
        classification.setWatchListReason(reason);
        classification.setWatchListReviewDate(null);
        classification.setClassifiedBy(removedBy);
        classificationRepository.save(classification);
    }

    public List<IslamicFinancingRiskClassification> getWatchListContracts() {
        return classificationRepository.findByOnWatchListTrueOrderByClassificationDateDesc();
    }

    public IslamicRiskResponses.StageMigrationMatrix getStageMigration(LocalDate from, LocalDate to) {
        Map<Long, IslamicFinancingRiskClassification> opening = classificationRepository.findAll().stream()
                .filter(item -> item.getClassificationDate().equals(from))
                .collect(Collectors.toMap(IslamicFinancingRiskClassification::getContractId, item -> item, (left, right) -> right));
        Map<Long, IslamicFinancingRiskClassification> closing = classificationRepository.findAll().stream()
                .filter(item -> item.getClassificationDate().equals(to))
                .collect(Collectors.toMap(IslamicFinancingRiskClassification::getContractId, item -> item, (left, right) -> right));

        Map<String, Long> transitions = new LinkedHashMap<>();
        for (Map.Entry<Long, IslamicFinancingRiskClassification> entry : closing.entrySet()) {
            IslamicFinancingRiskClassification start = opening.get(entry.getKey());
            if (start == null) {
                continue;
            }
            String key = start.getIfrs9Stage().name() + "->" + entry.getValue().getIfrs9Stage().name();
            transitions.merge(key, 1L, Long::sum);
        }
        return IslamicRiskResponses.StageMigrationMatrix.builder()
                .from(from)
                .to(to)
                .transitions(transitions)
                .build();
    }

    public IslamicFinancingRiskClassification getLatestClassification(Long contractId) {
        return classificationRepository.findTopByContractIdOrderByClassificationDateDesc(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFinancingRiskClassification", "contractId", contractId));
    }

    public IslamicRiskResponses.RiskClassificationSummary getSummary(LocalDate asOfDate) {
        LocalDate asOf = asOfDate != null ? asOfDate : LocalDate.now();
        List<IslamicFinancingRiskClassification> classifications = classificationRepository.findByClassificationDate(asOf);
        Map<String, Long> byStage = new LinkedHashMap<>();
        Map<String, Long> byAaoifi = new LinkedHashMap<>();
        Map<String, BigDecimal> exposureByStage = new LinkedHashMap<>();
        Map<String, BigDecimal> exposureByAaoifi = new LinkedHashMap<>();
        for (IslamicFinancingRiskClassification classification : classifications) {
            byStage.merge(classification.getIfrs9Stage().name(), 1L, Long::sum);
            byAaoifi.merge(classification.getAaoifiClassification().name(), 1L, Long::sum);
            exposureByStage.merge(classification.getIfrs9Stage().name(), classification.getOutstandingExposure(), BigDecimal::add);
            exposureByAaoifi.merge(classification.getAaoifiClassification().name(), classification.getOutstandingExposure(), BigDecimal::add);
        }
        return IslamicRiskResponses.RiskClassificationSummary.builder()
                .asOfDate(asOf)
                .byIfrs9Stage(byStage)
                .byAaoifiClassification(byAaoifi)
                .exposureByIfrs9Stage(exposureByStage)
                .exposureByAaoifiClassification(exposureByAaoifi)
                .build();
    }

    private IslamicEclCalculation ensureLatestEcl(Long contractId, String contractTypeCode, LocalDate asOfDate) {
        return islamicEclService.getEclHistory(contractId).stream()
                .filter(item -> !item.getCalculationDate().isAfter(asOfDate))
                .findFirst()
                .orElseGet(() -> islamicEclService.calculateEcl(contractId, contractTypeCode, asOfDate));
    }

    private IslamicRiskDomainEnums.Stage deriveIfrsStage(Integer dpd,
                                                         List<String> qualitativeFactors,
                                                         boolean watchList,
                                                         IslamicEclCalculation latestEcl) {
        if (latestEcl != null && latestEcl.getCurrentStage() != null) {
            if (latestEcl.getCurrentStage() == IslamicRiskDomainEnums.Stage.STAGE_3) {
                return IslamicRiskDomainEnums.Stage.STAGE_3;
            }
            if (latestEcl.getCurrentStage() == IslamicRiskDomainEnums.Stage.STAGE_2 || watchList || !qualitativeFactors.isEmpty()) {
                return IslamicRiskDomainEnums.Stage.STAGE_2;
            }
        }
        int daysPastDue = dpd != null ? dpd : 0;
        if (daysPastDue > 90) {
            return IslamicRiskDomainEnums.Stage.STAGE_3;
        }
        if (daysPastDue > 30 || watchList || !qualitativeFactors.isEmpty()) {
            return IslamicRiskDomainEnums.Stage.STAGE_2;
        }
        return IslamicRiskDomainEnums.Stage.STAGE_1;
    }

    private IslamicRiskDomainEnums.AaoifiClassification deriveAaoifiClassification(Integer dpd,
                                                                                   List<String> qualitativeFactors,
                                                                                   boolean watchList) {
        int daysPastDue = dpd != null ? dpd : 0;
        if (daysPastDue > 360) {
            return IslamicRiskDomainEnums.AaoifiClassification.LOSS;
        }
        if (daysPastDue > 180) {
            return IslamicRiskDomainEnums.AaoifiClassification.DOUBTFUL;
        }
        if (daysPastDue >= 90) {
            return IslamicRiskDomainEnums.AaoifiClassification.SUBSTANDARD;
        }
        if (watchList || !qualitativeFactors.isEmpty()) {
            return IslamicRiskDomainEnums.AaoifiClassification.WATCH_LIST;
        }
        return IslamicRiskDomainEnums.AaoifiClassification.PERFORMING;
    }

    private String buildStageReason(Integer dpd, List<String> qualitativeFactors, boolean watchList, IslamicEclCalculation ecl) {
        if (ecl != null && ecl.getStagingReason() != null) {
            return ecl.getStagingReason();
        }
        if (watchList || !qualitativeFactors.isEmpty()) {
            return "Watch list / qualitative indicators";
        }
        return "DPD=" + (dpd != null ? dpd : 0);
    }

    private String buildAaoifiReason(Integer dpd, List<String> qualitativeFactors, boolean watchList) {
        if (watchList || !qualitativeFactors.isEmpty()) {
            return "Early warning indicators";
        }
        return "DPD=" + (dpd != null ? dpd : 0);
    }

    private BigDecimal minimumProvisionRate(IslamicRiskDomainEnums.AaoifiClassification classification) {
        return switch (classification) {
            case PERFORMING -> new BigDecimal("0.010000");
            case WATCH_LIST -> new BigDecimal("0.050000");
            case SUBSTANDARD -> new BigDecimal("0.200000");
            case DOUBTFUL -> new BigDecimal("0.500000");
            case LOSS -> BigDecimal.ONE.setScale(6, RoundingMode.HALF_UP);
        };
    }
}
