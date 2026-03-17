package com.cbs.intelligence.service;

import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BehaviourAnalyticsService {

    private final CustomerBehaviourEventRepository eventRepository;
    private final ProductRecommendationRepository recommendationRepository;

    @Transactional
    public CustomerBehaviourEvent trackEvent(CustomerBehaviourEvent event) {
        CustomerBehaviourEvent saved = eventRepository.save(event);
        log.debug("Behaviour event tracked: customer={}, type={}, channel={}", event.getCustomerId(), event.getEventType(), event.getChannel());
        return saved;
    }

    @Transactional
    public List<ProductRecommendation> generateRecommendations(Long customerId) {
        Instant last90d = Instant.now().minus(90, ChronoUnit.DAYS);
        List<CustomerBehaviourEvent> events = eventRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        long txnCount = events.stream().filter(e -> "TRANSACTION".equals(e.getEventType()) && e.getCreatedAt().isAfter(last90d)).count();
        long loginCount = events.stream().filter(e -> "LOGIN".equals(e.getEventType()) && e.getCreatedAt().isAfter(last90d)).count();
        boolean viewedLoans = events.stream().anyMatch(e -> "PRODUCT_VIEW".equals(e.getEventType()) && e.getEventData() != null && "LOAN".equals(e.getEventData().get("product_type")));
        boolean viewedCards = events.stream().anyMatch(e -> "PRODUCT_VIEW".equals(e.getEventType()) && e.getEventData() != null && "CARD".equals(e.getEventData().get("product_type")));
        boolean viewedInvestments = events.stream().anyMatch(e -> "PRODUCT_VIEW".equals(e.getEventType()) && e.getEventData() != null && "INVESTMENT".equals(e.getEventData().get("product_type")));

        List<ProductRecommendation> recommendations = new ArrayList<>();

        if (viewedLoans) {
            recommendations.add(buildRecommendation(customerId, "PERSONAL_LOAN", "CROSS_SELL", 85.0, "Customer viewed loan products multiple times"));
        }
        if (viewedCards && txnCount > 20) {
            recommendations.add(buildRecommendation(customerId, "PREMIUM_CREDIT_CARD", "UP_SELL", 78.0, "High transaction volume + card interest"));
        }
        if (viewedInvestments) {
            recommendations.add(buildRecommendation(customerId, "FIXED_DEPOSIT", "CROSS_SELL", 72.0, "Customer explored investment options"));
        }
        if (txnCount > 50 && loginCount > 30) {
            recommendations.add(buildRecommendation(customerId, "PREMIUM_ACCOUNT", "UP_SELL", 80.0, "Power user — high engagement"));
        }
        if (loginCount < 3 && txnCount < 5) {
            recommendations.add(buildRecommendation(customerId, "MOBILE_BANKING_ONBOARD", "REACTIVATION", 90.0, "Low engagement — reactivation target"));
        }

        List<ProductRecommendation> saved = recommendationRepository.saveAll(recommendations);
        log.info("Generated {} recommendations for customer {}", saved.size(), customerId);
        return saved;
    }

    public Map<String, Object> getChurnScore(Long customerId) {
        Instant last30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant last90d = Instant.now().minus(90, ChronoUnit.DAYS);

        long logins30d = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "LOGIN", last30d);
        long logins90d = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "LOGIN", last90d);
        long txns30d = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "TRANSACTION", last30d);
        long complaints = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "COMPLAINT", last90d);
        long churnSignals = eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(customerId, "CHURN_SIGNAL", last90d);

        double score = 0;
        if (logins30d == 0) score += 30;
        else if (logins30d < 3) score += 15;
        if (txns30d == 0) score += 25;
        else if (txns30d < 3) score += 10;
        if (complaints > 0) score += complaints * 10;
        if (churnSignals > 0) score += churnSignals * 15;
        if (logins90d > 0 && logins30d == 0) score += 20; // was active, now silent

        score = Math.min(100, score);
        String risk = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

        return Map.of("customer_id", customerId, "churn_score", score, "risk_level", risk,
                "logins_30d", logins30d, "transactions_30d", txns30d, "complaints_90d", complaints);
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

    private ProductRecommendation buildRecommendation(Long customerId, String product, String type, double score, String reason) {
        return ProductRecommendation.builder()
                .customerId(customerId).recommendedProduct(product).recommendationType(type)
                .score(BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP))
                .reason(reason).modelVersion("v1.0").expiresAt(Instant.now().plus(30, ChronoUnit.DAYS)).build();
    }
}
