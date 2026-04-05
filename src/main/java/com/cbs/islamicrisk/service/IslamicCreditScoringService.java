package com.cbs.islamicrisk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicCreditScoreModel;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicCreditAssessmentRepository;
import com.cbs.islamicrisk.repository.IslamicCreditScoreModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicCreditScoringService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicCreditScoreModelRepository modelRepository;
    private final IslamicCreditAssessmentRepository assessmentRepository;
    private final IslamicRiskSupport riskSupport;

    @Transactional
    public IslamicCreditAssessment assessCredit(IslamicRiskRequests.CreditAssessmentRequest request) {
        String contractTypeCode = riskSupport.uppercase(request.getContractTypeCode());
        String productCategory = StringUtils.hasText(request.getProductCategory())
                ? riskSupport.uppercase(request.getProductCategory()) : null;

        IslamicCreditScoreModel model = getModel(contractTypeCode, productCategory);
        validateComponentWeights(model.getScoreComponents());

        Map<String, Object> inputData = new LinkedHashMap<>();
        if (request.getInputData() != null) {
            inputData.putAll(request.getInputData());
        }
        if (request.getRequestedAmount() != null) {
            inputData.put("requestedAmount", request.getRequestedAmount());
        }
        if (request.getRequestedTenorMonths() != null) {
            inputData.put("requestedTenorMonths", request.getRequestedTenorMonths());
        }
        if (productCategory != null) {
            inputData.putIfAbsent("productCategory", productCategory);
        }

        List<Map<String, Object>> componentScores = new ArrayList<>();
        BigDecimal totalWeightedScore = BigDecimal.ZERO;
        for (Map<String, Object> component : model.getScoreComponents()) {
            Map<String, Object> result = scoreComponent(component, inputData);
            componentScores.add(result);
            totalWeightedScore = totalWeightedScore.add(riskSupport.asBigDecimal(result.get("weightedScore")));
        }

        int totalScore = totalWeightedScore.setScale(0, RoundingMode.HALF_UP).intValue();
        Map<String, Object> band = resolveBand(model, totalScore);
        BigDecimal estimatedPd = resolveEstimatedPd(band);
        BigDecimal monthlyIncome = riskSupport.asBigDecimal(riskSupport.extractValue(inputData, "monthlyIncome"));
        BigDecimal financingMultiple = riskSupport.asBigDecimal(band.get("maxFinancingMultiple"));
        BigDecimal maxApprovedAmount = monthlyIncome.compareTo(BigDecimal.ZERO) > 0
                ? riskSupport.scaleMoney(monthlyIncome.multiply(financingMultiple.compareTo(BigDecimal.ZERO) > 0
                ? financingMultiple : BigDecimal.ONE))
                : riskSupport.scaleMoney(request.getRequestedAmount());
        Integer maxApprovedTenor = riskSupport.asInteger(
                band.containsKey("maxApprovedTenorMonths") ? band.get("maxApprovedTenorMonths") : request.getRequestedTenorMonths());

        IslamicCreditAssessment assessment = IslamicCreditAssessment.builder()
                .assessmentRef(riskSupport.nextRef("ICR-ASS"))
                .customerId(request.getCustomerId())
                .applicationId(request.getApplicationId())
                .applicationRef(request.getApplicationRef())
                .contractTypeCode(contractTypeCode)
                .productCode(request.getProductCode())
                .modelId(model.getId())
                .modelCode(model.getModelCode())
                .assessmentDate(LocalDate.now())
                .inputData(inputData)
                .totalScore(totalScore)
                .scoreBand(stringValue(band.get("band"), "UNRATED"))
                .scoreBandLabel(stringValue(band.get("label"), "Unrated"))
                .componentScores(componentScores)
                .estimatedPd(estimatedPd)
                .riskRating(stringValue(band.get("riskRating"), stringValue(band.get("band"), "UNRATED")))
                .approvalRecommendation(resolveApprovalRecommendation(band))
                .maxApprovedAmount(maxApprovedAmount)
                .maxApprovedTenor(maxApprovedTenor > 0 ? maxApprovedTenor : null)
                .conditions(resolveConditions(band))
                .assessedBy(StringUtils.hasText(request.getAssessedBy()) ? request.getAssessedBy() : riskSupport.currentActor())
                .status(IslamicRiskDomainEnums.AssessmentStatus.COMPLETED)
                .validUntil(LocalDate.now().plusDays(90))
                .tenantId(riskSupport.currentTenantId())
                .build();
        IslamicCreditAssessment saved = assessmentRepository.save(assessment);
        log.info("Islamic credit assessment completed: ref={}, contractType={}, score={}, band={}",
                saved.getAssessmentRef(), contractTypeCode, totalScore, saved.getScoreBand());
        return saved;
    }

    @Transactional
    public IslamicCreditAssessment overrideScore(Long assessmentId, IslamicRiskRequests.ScoreOverrideRequest request) {
        IslamicCreditAssessment assessment = getAssessment(assessmentId);
        IslamicCreditScoreModel model = modelRepository.findById(assessment.getModelId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditScoreModel", "id", assessment.getModelId()));

        Map<String, Object> overriddenBand = StringUtils.hasText(request.getOverriddenBand())
                ? resolveBand(model, request.getOverriddenBand())
                : resolveBand(model, request.getOverriddenScore());

        assessment.setOverriddenScore(request.getOverriddenScore());
        assessment.setOverriddenBand(stringValue(overriddenBand.get("band"), assessment.getScoreBand()));
        assessment.setOverriddenBy(request.getOverriddenBy());
        assessment.setOverrideReason(request.getOverrideReason());
        assessment.setOverrideApprovedBy(request.getOverrideApprovedBy());
        assessment.setStatus(IslamicRiskDomainEnums.AssessmentStatus.OVERRIDDEN);
        assessment.setTotalScore(request.getOverriddenScore());
        assessment.setScoreBand(assessment.getOverriddenBand());
        assessment.setScoreBandLabel(stringValue(overriddenBand.get("label"), assessment.getScoreBandLabel()));
        assessment.setEstimatedPd(resolveEstimatedPd(overriddenBand));
        assessment.setApprovalRecommendation(resolveApprovalRecommendation(overriddenBand));
        return assessmentRepository.save(assessment);
    }

    public IslamicCreditScoreModel getModel(String contractTypeCode, String productCategory) {
        String normalizedType = riskSupport.uppercase(contractTypeCode);
        String normalizedCategory = StringUtils.hasText(productCategory) ? riskSupport.uppercase(productCategory) : null;
        if (normalizedCategory != null) {
            return modelRepository.findFirstByContractTypeCodeAndProductCategoryAndStatusOrderByModelVersionDesc(
                            normalizedType, normalizedCategory, IslamicRiskDomainEnums.ModelStatus.ACTIVE)
                    .or(() -> modelRepository.findFirstByContractTypeCodeAndProductCategoryAndStatusOrderByModelVersionDesc(
                            "ALL", normalizedCategory, IslamicRiskDomainEnums.ModelStatus.ACTIVE))
                    .orElseGet(() -> modelRepository.findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
                                    normalizedType, IslamicRiskDomainEnums.ModelStatus.ACTIVE)
                            .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditScoreModel", "contractTypeCode", normalizedType)));
        }
        return modelRepository.findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
                        normalizedType, IslamicRiskDomainEnums.ModelStatus.ACTIVE)
                .orElseGet(() -> modelRepository.findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
                                "ALL", IslamicRiskDomainEnums.ModelStatus.ACTIVE)
                        .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditScoreModel", "contractTypeCode", normalizedType)));
    }

    public List<IslamicCreditScoreModel> getActiveModels() {
        return modelRepository.findByStatusOrderByContractTypeCodeAscModelVersionDesc(IslamicRiskDomainEnums.ModelStatus.ACTIVE);
    }

    @Transactional
    public IslamicCreditScoreModel createModel(IslamicRiskRequests.ScoreModelRequest request) {
        validateComponentWeights(request.getScoreComponents());
        IslamicCreditScoreModel model = IslamicCreditScoreModel.builder()
                .modelCode(request.getModelCode())
                .name(request.getName())
                .description(request.getDescription())
                .contractTypeCode(riskSupport.uppercase(request.getContractTypeCode()))
                .productCategory(StringUtils.hasText(request.getProductCategory()) ? riskSupport.uppercase(request.getProductCategory()) : null)
                .modelVersion(request.getModelVersion())
                .scoreComponents(new ArrayList<>(request.getScoreComponents()))
                .maximumScore(request.getMaximumScore())
                .scoreBands(new ArrayList<>(request.getScoreBands()))
                .lastCalibrationDate(request.getLastCalibrationDate())
                .nextCalibrationDate(request.getNextCalibrationDate())
                .calibrationDataPeriod(request.getCalibrationDataPeriod())
                .backtestingAccuracy(request.getBacktestingAccuracy())
                .status(request.getStatus())
                .approvedBy(request.getApprovedBy())
                .approvedAt(LocalDateTime.now())
                .tenantId(riskSupport.currentTenantId())
                .build();
        return modelRepository.save(model);
    }

    @Transactional
    public IslamicCreditScoreModel updateModel(Long modelId, IslamicRiskRequests.ScoreModelRequest request) {
        validateComponentWeights(request.getScoreComponents());
        IslamicCreditScoreModel model = modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditScoreModel", "id", modelId));
        model.setName(request.getName());
        model.setDescription(request.getDescription());
        model.setContractTypeCode(riskSupport.uppercase(request.getContractTypeCode()));
        model.setProductCategory(StringUtils.hasText(request.getProductCategory()) ? riskSupport.uppercase(request.getProductCategory()) : null);
        model.setModelVersion(request.getModelVersion());
        model.setScoreComponents(new ArrayList<>(request.getScoreComponents()));
        model.setMaximumScore(request.getMaximumScore());
        model.setScoreBands(new ArrayList<>(request.getScoreBands()));
        model.setLastCalibrationDate(request.getLastCalibrationDate());
        model.setNextCalibrationDate(request.getNextCalibrationDate());
        model.setCalibrationDataPeriod(request.getCalibrationDataPeriod());
        model.setBacktestingAccuracy(request.getBacktestingAccuracy());
        model.setStatus(request.getStatus());
        model.setApprovedBy(request.getApprovedBy());
        model.setApprovedAt(LocalDateTime.now());
        return modelRepository.save(model);
    }

    public IslamicRiskResponses.BacktestResult backtestModel(Long modelId, LocalDate from, LocalDate to) {
        IslamicCreditScoreModel model = modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditScoreModel", "id", modelId));
        List<IslamicCreditAssessment> assessments = assessmentRepository.findByModelIdAndAssessmentDateBetween(modelId, from, to);
        long sampleSize = assessments.size();
        BigDecimal expectedDefaultRate = sampleSize == 0 ? BigDecimal.ZERO : assessments.stream()
                .map(IslamicCreditAssessment::getEstimatedPd)
                .map(pd -> pd != null ? pd : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(sampleSize), 6, RoundingMode.HALF_UP);
        long actualDefaults = assessments.stream()
                .filter(this::actualDefaulted)
                .count();
        BigDecimal actualDefaultRate = sampleSize == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(actualDefaults).divide(BigDecimal.valueOf(sampleSize), 6, RoundingMode.HALF_UP);

        BigDecimal denominator = expectedDefaultRate.max(actualDefaultRate).max(new BigDecimal("0.000001"));
        BigDecimal delta = expectedDefaultRate.subtract(actualDefaultRate).abs();
        BigDecimal accuracy = BigDecimal.ONE.subtract(delta.divide(denominator, 6, RoundingMode.HALF_UP))
                .max(BigDecimal.ZERO);
        BigDecimal gini = accuracy.multiply(new BigDecimal("2")).subtract(BigDecimal.ONE)
                .setScale(6, RoundingMode.HALF_UP);
        BigDecimal ks = delta.setScale(6, RoundingMode.HALF_UP);

        return IslamicRiskResponses.BacktestResult.builder()
                .modelId(model.getId())
                .modelCode(model.getModelCode())
                .from(from)
                .to(to)
                .sampleSize(sampleSize)
                .expectedDefaultRate(expectedDefaultRate)
                .actualDefaultRate(actualDefaultRate)
                .accuracy(accuracy)
                .giniCoefficient(gini)
                .ksStatistic(ks)
                .summary("Backtesting completed using frozen assessment snapshots and actualDefaulted flags where available.")
                .build();
    }

    public IslamicCreditAssessment getAssessment(Long assessmentId) {
        return assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCreditAssessment", "id", assessmentId));
    }

    public IslamicCreditAssessment getLatestAssessment(Long customerId, String contractTypeCode) {
        IslamicCreditAssessment assessment = riskSupport.latestAssessment(customerId, contractTypeCode);
        if (assessment == null) {
            throw new ResourceNotFoundException("IslamicCreditAssessment", "customerId", customerId);
        }
        return assessment;
    }

    public List<IslamicCreditAssessment> getAssessmentsByCustomer(Long customerId) {
        return assessmentRepository.findByCustomerIdOrderByAssessmentDateDesc(customerId);
    }

    public IslamicRiskResponses.ScoreDistribution getScoreDistribution(String contractTypeCode) {
        String normalizedType = riskSupport.uppercase(contractTypeCode);
        List<IslamicCreditAssessment> assessments = assessmentRepository.findAll().stream()
                .filter(item -> normalizedType.equals(riskSupport.uppercase(item.getContractTypeCode())))
                .toList();
        Map<String, Long> distribution = assessments.stream()
                .collect(java.util.stream.Collectors.groupingBy(IslamicCreditAssessment::getScoreBand,
                        LinkedHashMap::new, java.util.stream.Collectors.counting()));
        BigDecimal averageScore = assessments.isEmpty() ? BigDecimal.ZERO : assessments.stream()
                .map(IslamicCreditAssessment::getTotalScore)
                .filter(score -> score != null)
                .map(BigDecimal::valueOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(assessments.size()), 2, RoundingMode.HALF_UP);
        return IslamicRiskResponses.ScoreDistribution.builder()
                .contractTypeCode(normalizedType)
                .totalAssessments(assessments.size())
                .averageScore(averageScore)
                .distributionByBand(distribution)
                .build();
    }

    private Map<String, Object> scoreComponent(Map<String, Object> component, Map<String, Object> inputData) {
        String code = stringValue(component.get("componentCode"), "UNKNOWN");
        String name = stringValue(component.get("name"), code);
        BigDecimal weight = riskSupport.asBigDecimal(component.get("weight"));
        String dataSource = stringValue(component.get("dataSource"), code);
        Object rawValue = riskSupport.extractValue(inputData, dataSource);
        if (rawValue == null && inputData.containsKey(dataSource)) {
            rawValue = inputData.get(dataSource);
        }

        BigDecimal tierScore = resolveTierScore(component, rawValue);
        BigDecimal weightedScore = tierScore.multiply(weight).divide(HUNDRED, 6, RoundingMode.HALF_UP);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("componentCode", code);
        result.put("name", name);
        result.put("rawValue", rawValue);
        result.put("tierScore", tierScore);
        result.put("weight", weight);
        result.put("weightedScore", weightedScore);
        return result;
    }

    @SuppressWarnings("unchecked")
    private BigDecimal resolveTierScore(Map<String, Object> component, Object rawValue) {
        Object tiersObject = component.get("scoringTiers");
        if (!(tiersObject instanceof List<?> tiers) || tiers.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal numericValue = riskSupport.asBigDecimal(rawValue);
        String textValue = rawValue == null ? null : String.valueOf(rawValue);
        for (Object tierObject : tiers) {
            if (!(tierObject instanceof Map<?, ?> tierMap)) {
                continue;
            }
            Map<String, Object> tier = (Map<String, Object>) tierMap;
            if (matchesTier(numericValue, textValue, tier)) {
                return riskSupport.asBigDecimal(tier.get("score"));
            }
        }
        return BigDecimal.ZERO;
    }

    private boolean matchesTier(BigDecimal numericValue, String textValue, Map<String, Object> tier) {
        if (tier.containsKey("value")) {
            return StringUtils.hasText(textValue) && textValue.equalsIgnoreCase(String.valueOf(tier.get("value")));
        }
        BigDecimal min = tier.containsKey("min") ? riskSupport.asBigDecimal(tier.get("min")) : null;
        BigDecimal max = tier.containsKey("max") ? riskSupport.asBigDecimal(tier.get("max")) : null;
        boolean lower = min == null || numericValue.compareTo(min) >= 0;
        boolean upper = max == null || numericValue.compareTo(max) <= 0;
        return lower && upper;
    }

    private void validateComponentWeights(List<Map<String, Object>> components) {
        BigDecimal weightSum = components.stream()
                .map(component -> riskSupport.asBigDecimal(component.get("weight")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (weightSum.compareTo(HUNDRED) != 0) {
            throw new BusinessException("Credit score component weights must sum to 100 but were " + weightSum,
                    "INVALID_SCORE_MODEL_WEIGHTS");
        }
    }

    private Map<String, Object> resolveBand(IslamicCreditScoreModel model, int totalScore) {
        return model.getScoreBands().stream()
                .filter(band -> totalScore >= riskSupport.asInteger(band.get("minScore"))
                        && totalScore <= riskSupport.asInteger(band.get("maxScore")))
                .findFirst()
                .orElseGet(() -> model.getScoreBands().stream()
                        .max(Comparator.comparingInt(band -> riskSupport.asInteger(band.get("maxScore"))))
                        .orElse(new LinkedHashMap<>()));
    }

    private Map<String, Object> resolveBand(IslamicCreditScoreModel model, String bandCode) {
        return model.getScoreBands().stream()
                .filter(band -> bandCode.equalsIgnoreCase(stringValue(band.get("band"), "")))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Unknown score band: " + bandCode, "INVALID_SCORE_BAND"));
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveConditions(Map<String, Object> band) {
        Object value = band.get("conditions");
        if (value instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                result.add(String.valueOf(item));
            }
            return result;
        }
        return new ArrayList<>();
    }

    private BigDecimal resolveEstimatedPd(Map<String, Object> band) {
        if (band.containsKey("estimatedPd")) {
            return normalizePercentageValue(riskSupport.asBigDecimal(band.get("estimatedPd")));
        }
        String pdRange = stringValue(band.get("pdRange"), null);
        if (!StringUtils.hasText(pdRange)) {
            return BigDecimal.ZERO;
        }
        String normalized = pdRange.replace("%", "").trim();
        String first = normalized.contains("-") ? normalized.substring(0, normalized.indexOf('-')) : normalized;
        return normalizePercentageValue(riskSupport.asBigDecimal(first));
    }

    private IslamicRiskDomainEnums.ApprovalRecommendation resolveApprovalRecommendation(Map<String, Object> band) {
        String raw = stringValue(band.get("approvalAction"), IslamicRiskDomainEnums.ApprovalRecommendation.ENHANCED_REVIEW.name());
        return IslamicRiskDomainEnums.ApprovalRecommendation.valueOf(raw.toUpperCase());
    }

    private BigDecimal normalizePercentageValue(BigDecimal value) {
        if (value.compareTo(BigDecimal.ONE) > 0) {
            return value.divide(HUNDRED, 6, RoundingMode.HALF_UP);
        }
        return value.setScale(6, RoundingMode.HALF_UP);
    }

    private boolean actualDefaulted(IslamicCreditAssessment assessment) {
        Object explicitFlag = assessment.getInputData() != null ? assessment.getInputData().get("actualDefaulted") : null;
        if (explicitFlag instanceof Boolean flag) {
            return flag;
        }
        if (explicitFlag instanceof Number number) {
            return number.intValue() != 0;
        }
        return List.of("E", "F").contains(assessment.getScoreBand());
    }

    private String stringValue(Object value, String fallback) {
        return value == null ? fallback : String.valueOf(value);
    }
}
