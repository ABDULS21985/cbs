package com.cbs.custbehavior.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import com.cbs.custbehavior.repository.CustomerBehaviorModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustomerBehaviorService {

    private static final List<String> VALID_MODEL_TYPES = List.of(
            "CHURN", "CHURN_PREDICTION", "CROSS_SELL", "CREDIT_RISK", "CREDIT_BEHAVIOR",
            "LIFETIME_VALUE", "ENGAGEMENT", "FRAUD_PROPENSITY", "PRODUCT_AFFINITY", "ATTRITION");

    private final CustomerBehaviorModelRepository repository;
    private final CurrentActorProvider currentActorProvider;

    // ── Configurable score band thresholds ──────────────────────────────────

    @Value("${cbs.behavior.band.very-high:80}")
    private double bandVeryHigh = 80;

    @Value("${cbs.behavior.band.high:60}")
    private double bandHigh = 60;

    @Value("${cbs.behavior.band.medium:40}")
    private double bandMedium = 40;

    @Value("${cbs.behavior.band.low:20}")
    private double bandLow = 20;

    // ── Score with Feature Extraction ───────────────────────────────────────

    @Transactional
    public CustomerBehaviorModel score(CustomerBehaviorModel model) {
        // Validation
        if (model.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (!StringUtils.hasText(model.getModelType())) {
            throw new BusinessException("Model type is required", "MISSING_MODEL_TYPE");
        }
        if (!VALID_MODEL_TYPES.contains(model.getModelType())) {
            throw new BusinessException(
                    "Invalid model type: " + model.getModelType() + ". Valid: " + VALID_MODEL_TYPES,
                    "INVALID_MODEL_TYPE");
        }
        if (!StringUtils.hasText(model.getModelVersion())) {
            throw new BusinessException("Model version is required", "MISSING_MODEL_VERSION");
        }

        // If score is not provided, compute from input features
        if (model.getScore() == null) {
            if (model.getInputFeatures() == null || model.getInputFeatures().isEmpty()) {
                throw new BusinessException(
                        "Either score or inputFeatures must be provided", "MISSING_SCORE_AND_FEATURES");
            }
            BigDecimal computedScore = computeScoreFromFeatures(model.getModelType(), model.getInputFeatures());
            model.setScore(computedScore);
            log.info("Score computed from features: customer={}, type={}, score={}",
                    model.getCustomerId(), model.getModelType(), computedScore);
        }

        // Validate score range
        if (model.getScore().compareTo(BigDecimal.ZERO) < 0 || model.getScore().compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Score must be between 0 and 100", "INVALID_SCORE_RANGE");
        }

        model.setModelCode("CBM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        model.setScoreBand(deriveScoreBand(model.getScore()));
        model.setIsCurrent(true);
        model.setScoredAt(Instant.now());

        // Set default validity (90 days)
        if (model.getValidUntil() == null) {
            model.setValidUntil(LocalDate.now().plusDays(90));
        }

        // Derive predicted outcome and recommended action based on model type and score
        if (model.getPredictedOutcome() == null) {
            model.setPredictedOutcome(derivePredictedOutcome(model.getModelType(), model.getScore()));
        }
        if (model.getRecommendedAction() == null) {
            model.setRecommendedAction(deriveRecommendedAction(model.getModelType(), model.getScore()));
        }

        // Compute feature importance if input features are present
        if (model.getInputFeatures() != null && !model.getInputFeatures().isEmpty()
                && (model.getFeatureImportance() == null || model.getFeatureImportance().isEmpty())) {
            model.setFeatureImportance(computeFeatureImportance(model.getInputFeatures()));
        }

        // Mark previous model of same type for same customer as not current
        Optional<CustomerBehaviorModel> previous = repository
                .findByCustomerIdAndModelTypeAndIsCurrentTrue(model.getCustomerId(), model.getModelType());
        previous.ifPresent(prev -> {
            prev.setIsCurrent(false);
            repository.save(prev);
            log.info("Previous model marked as not current: code={}", prev.getModelCode());
        });

        CustomerBehaviorModel saved = repository.save(model);
        log.info("Behavior model scored: code={}, customer={}, type={}, score={}, band={}, actor={}",
                saved.getModelCode(), saved.getCustomerId(), saved.getModelType(),
                saved.getScore(), saved.getScoreBand(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Score from Transaction Patterns ──────────────────────────────────────

    @Transactional
    public CustomerBehaviorModel scoreFromTransactionPatterns(
            Long customerId, String modelType, String modelVersion,
            int transactionCount, BigDecimal avgTransactionAmount,
            int activeDays, BigDecimal totalBalance, int productCount) {

        Map<String, Object> features = new LinkedHashMap<>();
        features.put("transactionCount", transactionCount);
        features.put("avgTransactionAmount", avgTransactionAmount);
        features.put("activeDays", activeDays);
        features.put("totalBalance", totalBalance);
        features.put("productCount", productCount);

        // Derive additional features
        features.put("transactionsPerDay", activeDays > 0
                ? BigDecimal.valueOf(transactionCount).divide(BigDecimal.valueOf(activeDays), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        features.put("avgBalancePerProduct", productCount > 0
                ? totalBalance.divide(BigDecimal.valueOf(productCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);

        CustomerBehaviorModel model = CustomerBehaviorModel.builder()
                .customerId(customerId)
                .modelType(modelType)
                .modelVersion(modelVersion)
                .inputFeatures(features)
                .build();

        return score(model);
    }

    // ── Model Performance Tracking ──────────────────────────────────────────

    public Map<String, Object> getModelPerformance(String modelType, String modelVersion) {
        List<CustomerBehaviorModel> allModels = repository.findAll();
        List<CustomerBehaviorModel> matchingModels = allModels.stream()
                .filter(m -> m.getModelType().equals(modelType))
                .filter(m -> modelVersion == null || m.getModelVersion().equals(modelVersion))
                .toList();

        if (matchingModels.isEmpty()) {
            throw new BusinessException("No models found for type " + modelType, "NO_MODELS_FOUND");
        }

        // Compute aggregate statistics
        BigDecimal totalScore = BigDecimal.ZERO;
        BigDecimal minScore = new BigDecimal("100");
        BigDecimal maxScore = BigDecimal.ZERO;
        Map<String, Integer> bandDistribution = new LinkedHashMap<>();
        int currentCount = 0;
        int expiredCount = 0;
        BigDecimal totalConfidence = BigDecimal.ZERO;
        int confidenceCount = 0;

        for (CustomerBehaviorModel m : matchingModels) {
            totalScore = totalScore.add(m.getScore());
            if (m.getScore().compareTo(minScore) < 0) minScore = m.getScore();
            if (m.getScore().compareTo(maxScore) > 0) maxScore = m.getScore();
            bandDistribution.merge(m.getScoreBand(), 1, Integer::sum);
            if (Boolean.TRUE.equals(m.getIsCurrent())) currentCount++;
            if (m.getValidUntil() != null && m.getValidUntil().isBefore(LocalDate.now())) expiredCount++;
            if (m.getConfidencePct() != null) {
                totalConfidence = totalConfidence.add(m.getConfidencePct());
                confidenceCount++;
            }
        }

        BigDecimal avgScore = totalScore.divide(BigDecimal.valueOf(matchingModels.size()), 2, RoundingMode.HALF_UP);
        BigDecimal avgConfidence = confidenceCount > 0
                ? totalConfidence.divide(BigDecimal.valueOf(confidenceCount), 2, RoundingMode.HALF_UP)
                : null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("modelType", modelType);
        result.put("modelVersion", modelVersion);
        result.put("totalModels", matchingModels.size());
        result.put("currentModels", currentCount);
        result.put("expiredModels", expiredCount);
        result.put("avgScore", avgScore);
        result.put("minScore", minScore);
        result.put("maxScore", maxScore);
        result.put("avgConfidence", avgConfidence);
        result.put("bandDistribution", bandDistribution);
        result.put("bandThresholds", Map.of(
                "VERY_HIGH", bandVeryHigh,
                "HIGH", bandHigh,
                "MEDIUM", bandMedium,
                "LOW", bandLow));

        return result;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public List<CustomerBehaviorModel> getCurrentModels(Long customerId) {
        return repository.findByCustomerIdAndIsCurrentTrueOrderByScoreDesc(customerId);
    }

    public CustomerBehaviorModel getByType(Long customerId, String modelType) {
        return repository.findByCustomerIdAndModelTypeAndIsCurrentTrue(customerId, modelType)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CustomerBehaviorModel", "customerId/modelType", customerId + "/" + modelType));
    }

    public CustomerBehaviorModel getByCode(String modelCode) {
        return repository.findByModelCode(modelCode)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerBehaviorModel", "modelCode", modelCode));
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private String deriveScoreBand(BigDecimal score) {
        double s = score.doubleValue();
        if (s >= bandVeryHigh) return "VERY_HIGH";
        if (s >= bandHigh) return "HIGH";
        if (s >= bandMedium) return "MEDIUM";
        if (s >= bandLow) return "LOW";
        return "VERY_LOW";
    }

    /**
     * Computes a behavioral score from input features. The approach varies by model type.
     * Each feature contributes a weighted amount to the final score (0-100).
     */
    private BigDecimal computeScoreFromFeatures(String modelType, Map<String, Object> features) {
        double score = 50.0; // baseline

        switch (modelType) {
            case "CHURN" -> {
                // Higher activity = lower churn risk = lower score (inverted)
                score = 50.0;
                double txnCount = getNumericFeature(features, "transactionCount", 0);
                double activeDays = getNumericFeature(features, "activeDays", 0);
                double balance = getNumericFeature(features, "totalBalance", 0);

                // More transactions lower churn risk
                if (txnCount > 50) score -= 15;
                else if (txnCount > 20) score -= 8;
                else if (txnCount < 5) score += 20;
                else if (txnCount < 10) score += 10;

                // More active days lower churn risk
                if (activeDays > 20) score -= 10;
                else if (activeDays < 5) score += 15;

                // Higher balance lowers churn risk
                if (balance > 100000) score -= 10;
                else if (balance < 1000) score += 10;
            }
            case "CROSS_SELL", "PRODUCT_AFFINITY" -> {
                score = 30.0;
                double productCount = getNumericFeature(features, "productCount", 0);
                double balance = getNumericFeature(features, "totalBalance", 0);
                double txnCount = getNumericFeature(features, "transactionCount", 0);

                // Moderate product usage = highest cross-sell potential
                if (productCount >= 2 && productCount <= 4) score += 20;
                else if (productCount == 1) score += 10;

                // Good balance indicates capacity
                if (balance > 50000) score += 15;
                else if (balance > 10000) score += 10;

                // Active customers are better targets
                if (txnCount > 20) score += 15;
                else if (txnCount > 10) score += 10;
            }
            case "LIFETIME_VALUE" -> {
                score = 20.0;
                double balance = getNumericFeature(features, "totalBalance", 0);
                double productCount = getNumericFeature(features, "productCount", 0);
                double activeDays = getNumericFeature(features, "activeDays", 0);

                if (balance > 500000) score += 30;
                else if (balance > 100000) score += 20;
                else if (balance > 50000) score += 15;
                else if (balance > 10000) score += 10;

                if (productCount > 5) score += 15;
                else if (productCount > 3) score += 10;

                if (activeDays > 25) score += 10;
            }
            case "ENGAGEMENT" -> {
                score = 10.0;
                double txnCount = getNumericFeature(features, "transactionCount", 0);
                double activeDays = getNumericFeature(features, "activeDays", 0);

                if (txnCount > 50) score += 35;
                else if (txnCount > 30) score += 25;
                else if (txnCount > 15) score += 15;
                else if (txnCount > 5) score += 10;

                if (activeDays > 25) score += 25;
                else if (activeDays > 15) score += 15;
                else if (activeDays > 5) score += 10;
            }
            default -> {
                // Generic scoring: weighted average of normalized features
                score = 50.0;
                double txnCount = getNumericFeature(features, "transactionCount", 0);
                double balance = getNumericFeature(features, "totalBalance", 0);
                if (txnCount > 20) score += 10;
                if (balance > 50000) score += 10;
            }
        }

        // Clamp to 0-100
        score = Math.max(0, Math.min(100, score));
        return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> computeFeatureImportance(Map<String, Object> features) {
        Map<String, Object> importance = new LinkedHashMap<>();
        // Assign importance based on feature type
        for (String key : features.keySet()) {
            double weight = switch (key) {
                case "transactionCount" -> 0.25;
                case "avgTransactionAmount" -> 0.15;
                case "activeDays" -> 0.20;
                case "totalBalance" -> 0.20;
                case "productCount" -> 0.15;
                default -> 0.05;
            };
            importance.put(key, weight);
        }
        return importance;
    }

    private String derivePredictedOutcome(String modelType, BigDecimal score) {
        double s = score.doubleValue();
        return switch (modelType) {
            case "CHURN" -> s >= 60 ? "LIKELY_CHURN" : s >= 40 ? "MODERATE_RISK" : "RETAINED";
            case "CROSS_SELL" -> s >= 70 ? "HIGH_POTENTIAL" : s >= 40 ? "MODERATE_POTENTIAL" : "LOW_POTENTIAL";
            case "CREDIT_RISK" -> s >= 70 ? "HIGH_RISK" : s >= 40 ? "MODERATE_RISK" : "LOW_RISK";
            case "LIFETIME_VALUE" -> s >= 70 ? "HIGH_VALUE" : s >= 40 ? "MEDIUM_VALUE" : "LOW_VALUE";
            case "ENGAGEMENT" -> s >= 70 ? "HIGHLY_ENGAGED" : s >= 40 ? "MODERATELY_ENGAGED" : "DISENGAGED";
            case "FRAUD_PROPENSITY" -> s >= 60 ? "HIGH_FRAUD_RISK" : s >= 30 ? "MODERATE_FRAUD_RISK" : "LOW_FRAUD_RISK";
            default -> s >= 60 ? "POSITIVE" : s >= 40 ? "NEUTRAL" : "NEGATIVE";
        };
    }

    private String deriveRecommendedAction(String modelType, BigDecimal score) {
        double s = score.doubleValue();
        return switch (modelType) {
            case "CHURN" -> s >= 60
                    ? "Initiate retention campaign; offer loyalty incentives"
                    : s >= 40 ? "Monitor activity; send engagement communications"
                    : "Continue standard service";
            case "CROSS_SELL" -> s >= 70
                    ? "Prioritize for targeted product offers"
                    : s >= 40 ? "Include in next marketing campaign"
                    : "No immediate action; nurture relationship";
            case "CREDIT_RISK" -> s >= 70
                    ? "Reduce credit exposure; review facility terms"
                    : s >= 40 ? "Enhanced monitoring; standard review cycle"
                    : "Eligible for credit limit increase";
            case "LIFETIME_VALUE" -> s >= 70
                    ? "Assign relationship manager; offer premium products"
                    : s >= 40 ? "Standard relationship management"
                    : "Cost-optimize service delivery";
            case "ENGAGEMENT" -> s >= 70
                    ? "Leverage for referrals and testimonials"
                    : s >= 40 ? "Increase touchpoints; personalize communications"
                    : "Re-engagement campaign required";
            default -> "Review and take appropriate action based on score";
        };
    }

    private double getNumericFeature(Map<String, Object> features, String key, double defaultValue) {
        Object val = features.get(key);
        if (val == null) return defaultValue;
        if (val instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(val));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
