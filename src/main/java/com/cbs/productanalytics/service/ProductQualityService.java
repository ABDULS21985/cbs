package com.cbs.productanalytics.service;

import com.cbs.productanalytics.entity.ProductQualityAssessment;
import com.cbs.productanalytics.repository.ProductQualityAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductQualityService {

    private final ProductQualityAssessmentRepository repository;

    @Transactional
    public ProductQualityAssessment createAssessment(ProductQualityAssessment assessment) {
        assessment.setAssessmentCode("PQA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        assessment.setOverallQualityRating(deriveQualityRating(assessment));
        return repository.save(assessment);
    }

    public List<ProductQualityAssessment> getQualityTrend(String productCode) {
        return repository.findByProductCodeOrderByPeriodDateDesc(productCode);
    }

    public List<ProductQualityAssessment> getQualityDashboard() {
        return repository.findByStatusOrderByPeriodDateDesc("PUBLISHED");
    }

    public List<ProductQualityAssessment> compareProducts(String code1, String code2) {
        List<ProductQualityAssessment> list1 = repository.findByProductCodeOrderByPeriodDateDesc(code1);
        List<ProductQualityAssessment> list2 = repository.findByProductCodeOrderByPeriodDateDesc(code2);
        list1.addAll(list2);
        return list1;
    }

    private String deriveQualityRating(ProductQualityAssessment a) {
        BigDecimal satisfaction = a.getCustomerSatisfactionScore();
        BigDecimal slaMeet = a.getSlaMeetPct();
        BigDecimal defect = a.getDefectRate();

        // CRITICAL: satisfaction < 3.0 OR slaMeetPct < 80
        if (satisfaction != null && satisfaction.compareTo(new BigDecimal("3.0")) < 0) {
            return "CRITICAL";
        }
        if (slaMeet != null && slaMeet.compareTo(new BigDecimal("80")) < 0) {
            return "CRITICAL";
        }

        // EXCELLENT: satisfaction >= 4.5 AND slaMeetPct >= 98 AND defectRate < 0.5
        boolean excellentSatisfaction = satisfaction != null && satisfaction.compareTo(new BigDecimal("4.5")) >= 0;
        boolean excellentSla = slaMeet != null && slaMeet.compareTo(new BigDecimal("98")) >= 0;
        boolean excellentDefect = defect == null || defect.compareTo(new BigDecimal("0.5")) < 0;

        if (excellentSatisfaction && excellentSla && excellentDefect) {
            return "EXCELLENT";
        }

        // GOOD: satisfaction >= 4.0 AND slaMeetPct >= 90
        boolean goodSatisfaction = satisfaction != null && satisfaction.compareTo(new BigDecimal("4.0")) >= 0;
        boolean goodSla = slaMeet != null && slaMeet.compareTo(new BigDecimal("90")) >= 0;

        if (goodSatisfaction && goodSla) {
            return "GOOD";
        }

        // NEEDS_IMPROVEMENT: satisfaction < 3.5 OR slaMeetPct < 85
        boolean lowSatisfaction = satisfaction != null && satisfaction.compareTo(new BigDecimal("3.5")) < 0;
        boolean lowSla = slaMeet != null && slaMeet.compareTo(new BigDecimal("85")) < 0;

        if (lowSatisfaction || lowSla) {
            return "NEEDS_IMPROVEMENT";
        }

        return "SATISFACTORY";
    }
}
