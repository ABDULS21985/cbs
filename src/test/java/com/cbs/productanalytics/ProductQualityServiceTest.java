package com.cbs.productanalytics;

import com.cbs.productanalytics.entity.ProductQualityAssessment;
import com.cbs.productanalytics.repository.ProductQualityAssessmentRepository;
import com.cbs.productanalytics.service.ProductQualityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductQualityServiceTest {

    @Mock
    private ProductQualityAssessmentRepository repository;

    @InjectMocks
    private ProductQualityService service;

    @Test
    @DisplayName("EXCELLENT rating when satisfaction >= 4.5 AND SLA >= 98% AND defectRate < 0.5")
    void excellentRatingDerived() {
        ProductQualityAssessment assessment = new ProductQualityAssessment();
        assessment.setProductCode("SAVINGS-001");
        assessment.setAssessmentPeriod("QUARTERLY");
        assessment.setCustomerSatisfactionScore(new BigDecimal("4.7"));
        assessment.setSlaMeetPct(new BigDecimal("99.5"));
        assessment.setDefectRate(new BigDecimal("0.2"));

        when(repository.save(any(ProductQualityAssessment.class))).thenAnswer(i -> i.getArgument(0));

        ProductQualityAssessment result = service.createAssessment(assessment);

        assertThat(result.getAssessmentCode()).startsWith("PQA-");
        assertThat(result.getOverallQualityRating()).isEqualTo("EXCELLENT");
    }

    @Test
    @DisplayName("CRITICAL rating when satisfaction < 3.0")
    void criticalRatingWhenLowSatisfaction() {
        ProductQualityAssessment assessment = new ProductQualityAssessment();
        assessment.setProductCode("LOAN-001");
        assessment.setAssessmentPeriod("MONTHLY");
        assessment.setCustomerSatisfactionScore(new BigDecimal("2.5"));
        assessment.setSlaMeetPct(new BigDecimal("95.0"));
        assessment.setDefectRate(new BigDecimal("1.0"));

        when(repository.save(any(ProductQualityAssessment.class))).thenAnswer(i -> i.getArgument(0));

        ProductQualityAssessment result = service.createAssessment(assessment);

        assertThat(result.getOverallQualityRating()).isEqualTo("CRITICAL");
    }
}
