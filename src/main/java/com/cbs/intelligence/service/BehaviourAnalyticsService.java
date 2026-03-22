package com.cbs.intelligence.service;

import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import com.cbs.custbehavior.repository.CustomerBehaviorModelRepository;
import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BehaviourAnalyticsService {

    private final CustomerBehaviourEventRepository eventRepository;
    private final ProductRecommendationRepository recommendationRepository;
    private final CustomerBehaviorModelRepository behaviorModelRepository;

    // ── Event Tracking ────────────────────────────────────────────────────────

    @Transactional
    public CustomerBehaviourEvent trackEvent(CustomerBehaviourEvent event) {
        CustomerBehaviourEvent saved = eventRepository.save(event);
        log.debug("Behaviour event tracked: customer={}, type={}, channel={}",
                event.getCustomerId(), event.getEventType(), event.getChannel());
        return saved;
    }

    public List<CustomerBehaviourEvent> getAllEvents() {
        return eventRepository.findAll();
    }

    // ── Recommendations ───────────────────────────────────────────────────────

    /**
     * Generate product recommendations for a customer based on their behaviour events.
     *
     * <p>As a side-effect, this also updates three {@link CustomerBehaviorModel} records
     * for the customer:
     * <ul>
     *   <li>{@code CHURN_PREDICTION} — derived from the churn score algorithm</li>
     *   <li>{@code ENGAGEMENT_SCORE} — derived from login and transaction frequency</li>
     *   <li>{@code CROSS_SELL_PROPENSITY} — derived from the recommendations generated</li>
     * </ul>
     * All three models are marked {@code isCurrent=true}; any previous model of the same
     * type for the same customer is retired ({@code isCurrent=false}).
     */
    @Transactional
    public List<ProductRecommendation> generateRecommendations(Long customerId) {
        Instant last90d = Instant.now().minus(90, ChronoUnit.DAYS);
        List<CustomerBehaviourEvent> events = eventRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        long txnCount   = count(events, "TRANSACTION", last90d);
        long loginCount = count(events, "LOGIN", last90d);
        boolean viewedLoans       = hasProductView(events, "LOAN");
        boolean viewedCards       = hasProductView(events, "CARD");
        boolean viewedInvestments = hasProductView(events, "INVESTMENT");

        List<ProductRecommendation> recommendations = new ArrayList<>();

        if (viewedLoans) {
            recommendations.add(buildRecommendation(customerId, "PERSONAL_LOAN", "CROSS_SELL",
                    85.0, "Customer viewed loan products multiple times"));
        }
        if (viewedCards && txnCount > 20) {
            recommendations.add(buildRecommendation(customerId, "PREMIUM_CREDIT_CARD", "UP_SELL",
                    78.0, "High transaction volume + card interest"));
        }
        if (viewedInvestments) {
            recommendations.add(buildRecommendation(customerId, "FIXED_DEPOSIT", "CROSS_SELL",
                    72.0, "Customer explored investment options"));
        }
        if (txnCount > 50 && loginCount > 30) {
            recommendations.add(buildRecommendation(customerId, "PREMIUM_ACCOUNT", "UP_SELL",
                    80.0, "Power user — high engagement"));
        }
        if (loginCount < 3 && txnCount < 5) {
            recommendations.add(buildRecommendation(customerId, "MOBILE_BANKING_ONBOARD", "REACTIVATION",
                    90.0, "Low engagement — reactivation target"));
        }

        List<ProductRecommendation> saved = recommendationRepository.saveAll(recommendations);
        log.info("Generated {} recommendations for customer {}", saved.size(), customerId);

        // Persist / refresh behaviour scoring models as a side-effect
        persistBehaviorModels(customerId, events, saved);

        return saved;
    }

    public List<ProductRecommendation> getAllRecommendations(Long customerId) {
        return recommendationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<ProductRecommendation> getPendingRecommendations(Long customerId) {
        return recommendationRepository.findByCustomerIdAndStatusOrderByScoreDesc(customerId, "PENDING");
    }

    @Transactional
    public ProductRecommendation respondToRecommendation(Long recommendationId, boolean accepted) {
        ProductRecommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RuntimeException("Recommendation not found: " + recommendationId));
        rec.setStatus(accepted ? "ACCEPTED" : "REJECTED");
        rec.setRespondedAt(Instant.now());
        return recommendationRepository.save(rec);
    }

    // ── Churn Scoring ─────────────────────────────────────────────────────────

    public Map<String, Object> getChurnScore(Long customerId) {
        Instant last30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant last90d = Instant.now().minus(90, ChronoUnit.DAYS);

        long logins30d   = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "LOGIN", last30d);
        long logins90d   = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "LOGIN", last90d);
        long txns30d     = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "TRANSACTION", last30d);
        long complaints  = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "COMPLAINT", last90d);
        long churnSignals= eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "CHURN_SIGNAL", last90d);

        double score = 0;
        if (logins30d == 0)      score += 30;
        else if (logins30d < 3)  score += 15;
        if (txns30d == 0)        score += 25;
        else if (txns30d < 3)    score += 10;
        if (complaints > 0)      score += complaints * 10;
        if (churnSignals > 0)    score += churnSignals * 15;
        if (logins90d > 0 && logins30d == 0) score += 20; // was active, now silent

        score = Math.min(100, score);
        String risk = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

        return Map.of(
                "customer_id",      customerId,
                "churn_score",      score,
                "risk_level",       risk,
                "logins_30d",       logins30d,
                "transactions_30d", txns30d,
                "complaints_90d",   complaints
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Compute and persist three behaviour scoring models for the customer.
     * Previous models of the same type are retired before saving the new ones.
     *
     * @param customerId      the customer being analysed
     * @param events          all behaviour events for this customer
     * @param recommendations newly generated recommendations (used for cross-sell score)
     */
    private void persistBehaviorModels(Long customerId,
                                       List<CustomerBehaviourEvent> events,
                                       List<ProductRecommendation> recommendations) {
        Instant last30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant last90d = Instant.now().minus(90, ChronoUnit.DAYS);

        long logins30d  = count(events, "LOGIN", last30d);
        long logins90d  = count(events, "LOGIN", last90d);
        long txns30d    = count(events, "TRANSACTION", last30d);
        long complaints = count(events, "COMPLAINT", last90d);
        long churnSigs  = count(events, "CHURN_SIGNAL", last90d);

        // 1. CHURN_PREDICTION
        double churnRaw = 0;
        if (logins30d == 0)      churnRaw += 30;
        else if (logins30d < 3)  churnRaw += 15;
        if (txns30d == 0)        churnRaw += 25;
        else if (txns30d < 3)    churnRaw += 10;
        churnRaw += complaints * 10;
        churnRaw += churnSigs * 15;
        if (logins90d > 0 && logins30d == 0) churnRaw += 20;
        churnRaw = Math.min(100, churnRaw);
        String churnRisk = churnRaw >= 70 ? "HIGH" : churnRaw >= 40 ? "MEDIUM" : "LOW";

        Map<String, Object> churnInputs = new LinkedHashMap<>();
        churnInputs.put("logins_30d", logins30d);
        churnInputs.put("logins_90d", logins90d);
        churnInputs.put("transactions_30d", txns30d);
        churnInputs.put("complaints_90d", complaints);
        churnInputs.put("churn_signals_90d", churnSigs);

        Map<String, Object> churnImportance = new LinkedHashMap<>();
        churnImportance.put("login_frequency", 0.30);
        churnImportance.put("transaction_activity", 0.25);
        churnImportance.put("complaint_rate", 0.20);
        churnImportance.put("churn_signals", 0.15);
        churnImportance.put("reactivation_gap", 0.10);

        saveModel(customerId, "CHURN_PREDICTION",
                BigDecimal.valueOf(churnRaw), deriveScoreBand(churnRaw),
                BigDecimal.valueOf(events.isEmpty() ? 50.0 : 70.0),
                churnInputs, churnImportance,
                churnRisk,
                BigDecimal.valueOf(churnRaw / 100.0),
                "Reduce login gaps and resolve open complaints to lower churn risk.",
                null);

        // 2. ENGAGEMENT_SCORE (100 = highly engaged, 0 = dormant)
        double engage = Math.min(100, logins30d * 3 + txns30d * 2);
        Map<String, Object> engageInputs = new LinkedHashMap<>();
        engageInputs.put("logins_30d", logins30d);
        engageInputs.put("transactions_30d", txns30d);

        Map<String, Object> engageImportance = new LinkedHashMap<>();
        engageImportance.put("login_recency", 0.50);
        engageImportance.put("transaction_volume", 0.50);

        saveModel(customerId, "ENGAGEMENT_SCORE",
                BigDecimal.valueOf(engage), deriveScoreBand(engage),
                BigDecimal.valueOf(events.isEmpty() ? 40.0 : 75.0),
                engageInputs, engageImportance,
                engage >= 60 ? "HIGHLY_ENGAGED" : engage >= 30 ? "MODERATELY_ENGAGED" : "LOW_ENGAGEMENT",
                BigDecimal.valueOf(engage / 100.0),
                "Drive deeper product usage through targeted digital nudges.",
                null);

        // 3. CROSS_SELL_PROPENSITY (based on recommendation scores)
        double crossSell = recommendations.isEmpty() ? 0.0 :
                recommendations.stream()
                        .mapToDouble(r -> r.getScore().doubleValue())
                        .average().orElse(0.0);
        Map<String, Object> csInputs = new LinkedHashMap<>();
        csInputs.put("recommendations_generated", recommendations.size());
        csInputs.put("avg_recommendation_score", crossSell);

        Map<String, Object> csImportance = new LinkedHashMap<>();
        csImportance.put("product_view_signals", 0.60);
        csImportance.put("transaction_volume", 0.40);

        String csOutcome = recommendations.isEmpty() ? "NO_OPPORTUNITY" :
                recommendations.stream()
                        .max(Comparator.comparing(r -> r.getScore()))
                        .map(ProductRecommendation::getRecommendedProduct)
                        .orElse("UNKNOWN");

        Map<String, Object> csProducts = new LinkedHashMap<>();
        recommendations.forEach(r -> csProducts.put(r.getRecommendedProduct(),
                Map.of("type", r.getRecommendationType(), "score", r.getScore())));

        saveModel(customerId, "CROSS_SELL_PROPENSITY",
                BigDecimal.valueOf(crossSell).setScale(2, RoundingMode.HALF_UP),
                deriveScoreBand(crossSell),
                BigDecimal.valueOf(recommendations.isEmpty() ? 30.0 : 65.0),
                csInputs, csImportance,
                csOutcome,
                BigDecimal.valueOf(crossSell / 100.0).setScale(4, RoundingMode.HALF_UP),
                recommendations.isEmpty()
                        ? "Gather more behaviour signals to identify cross-sell opportunities."
                        : "Present the highest-scored product recommendation next interaction.",
                csProducts);
    }

    /** Retire any existing current model of this type for the customer, then save the new one. */
    private void saveModel(Long customerId, String modelType,
                            BigDecimal score, String scoreBand, BigDecimal confidencePct,
                            Map<String, Object> inputFeatures, Map<String, Object> featureImportance,
                            String predictedOutcome, BigDecimal predictedProbability,
                            String recommendedAction, Map<String, Object> recommendedProducts) {

        behaviorModelRepository
                .findByCustomerIdAndModelTypeAndIsCurrentTrue(customerId, modelType)
                .ifPresent(old -> {
                    old.setIsCurrent(false);
                    behaviorModelRepository.save(old);
                });

        String code = "CBM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        CustomerBehaviorModel model = CustomerBehaviorModel.builder()
                .modelCode(code)
                .customerId(customerId)
                .modelType(modelType)
                .modelVersion("v2.0-behaviour")
                .score(score)
                .scoreBand(scoreBand)
                .confidencePct(confidencePct)
                .inputFeatures(inputFeatures)
                .featureImportance(featureImportance)
                .predictedOutcome(predictedOutcome)
                .predictedProbability(predictedProbability)
                .recommendedAction(recommendedAction)
                .recommendedProducts(recommendedProducts)
                .validUntil(LocalDate.now().plusDays(30))
                .isCurrent(true)
                .build();

        behaviorModelRepository.save(model);
        log.info("Behaviour model persisted: customer={}, type={}, score={}, band={}", customerId, modelType, score, scoreBand);
    }

    private String deriveScoreBand(double score) {
        if (score >= 80) return "VERY_HIGH";
        if (score >= 60) return "HIGH";
        if (score >= 40) return "MEDIUM";
        if (score >= 20) return "LOW";
        return "VERY_LOW";
    }

    private long count(List<CustomerBehaviourEvent> events, String type, Instant since) {
        return events.stream()
                .filter(e -> type.equals(e.getEventType()) && e.getCreatedAt().isAfter(since))
                .count();
    }

    private boolean hasProductView(List<CustomerBehaviourEvent> events, String productType) {
        return events.stream().anyMatch(e ->
                "PRODUCT_VIEW".equals(e.getEventType())
                        && e.getEventData() != null
                        && productType.equals(e.getEventData().get("product_type")));
    }

    private ProductRecommendation buildRecommendation(Long customerId, String product,
                                                       String type, double score, String reason) {
        return ProductRecommendation.builder()
                .customerId(customerId)
                .recommendedProduct(product)
                .recommendationType(type)
                .score(BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP))
                .reason(reason)
                .modelVersion("v1.0")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();
    }
}
