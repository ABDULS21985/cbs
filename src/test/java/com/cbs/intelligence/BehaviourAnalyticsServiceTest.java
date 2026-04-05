package com.cbs.intelligence;

import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.repository.*;
import com.cbs.intelligence.service.BehaviourAnalyticsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BehaviourAnalyticsServiceTest {

    @Mock private CustomerBehaviourEventRepository eventRepository;
    @Mock private ProductRecommendationRepository recommendationRepository;
    @Mock private com.cbs.intelligence.repository.CustomerBehaviorModelRepository behaviorModelRepository;
    @InjectMocks private BehaviourAnalyticsService service;

    @Test
    @DisplayName("Low-engagement customer gets high churn score")
    void highChurnScore() {
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(1L), eq("LOGIN"), any())).thenReturn(0L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(1L), eq("TRANSACTION"), any())).thenReturn(0L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(1L), eq("COMPLAINT"), any())).thenReturn(1L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(1L), eq("CHURN_SIGNAL"), any())).thenReturn(0L);

        Map<String, Object> result = service.getChurnScore(1L);
        assertThat((double) result.get("churn_score")).isGreaterThanOrEqualTo(60);
        assertThat(result.get("risk_level")).isIn("MEDIUM", "HIGH");
    }

    @Test
    @DisplayName("Active customer gets low churn score")
    void lowChurnScore() {
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(2L), eq("LOGIN"), any())).thenReturn(20L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(2L), eq("TRANSACTION"), any())).thenReturn(30L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(2L), eq("COMPLAINT"), any())).thenReturn(0L);
        when(eventRepository.countByCustomerIdAndEventTypeAndCreatedAtAfter(eq(2L), eq("CHURN_SIGNAL"), any())).thenReturn(0L);

        Map<String, Object> result = service.getChurnScore(2L);
        assertThat((double) result.get("churn_score")).isLessThanOrEqualTo(10);
        assertThat(result.get("risk_level")).isEqualTo("LOW");
    }

    @Test
    @DisplayName("Recommendations generated for loan-viewing customer")
    void recommendationsForLoanViewer() {
        CustomerBehaviourEvent loanView = CustomerBehaviourEvent.builder()
                .customerId(3L).eventType("PRODUCT_VIEW").channel("MOBILE")
                .eventData(Map.of("product_type", "LOAN"))
                .createdAt(Instant.now().minus(5, ChronoUnit.DAYS)).build();

        when(eventRepository.findByCustomerIdOrderByCreatedAtDesc(3L)).thenReturn(List.of(loanView));
        when(recommendationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<ProductRecommendation> recs = service.generateRecommendations(3L);
        assertThat(recs).anyMatch(r -> "PERSONAL_LOAN".equals(r.getRecommendedProduct()));
    }
}
