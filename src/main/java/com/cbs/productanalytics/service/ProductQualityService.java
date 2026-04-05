package com.cbs.productanalytics.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productanalytics.entity.ProductQualityAssessment;
import com.cbs.productanalytics.repository.ProductQualityAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductQualityService {

    private final ProductQualityAssessmentRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProductQualityAssessment createAssessment(ProductQualityAssessment assessment) {
        if (assessment.getProductCode() == null || assessment.getProductCode().isBlank()) {
            throw new BusinessException("productCode is required", "MISSING_PRODUCT_CODE");
        }
        assessment.setAssessmentCode("PQA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        assessment.setOverallQualityRating(deriveQualityRating(assessment));
        ProductQualityAssessment saved = repository.save(assessment);
        log.info("AUDIT: Product quality assessment created by {}: code={}, product={}, rating={}",
                currentActorProvider.getCurrentActor(), saved.getAssessmentCode(), saved.getProductCode(), saved.getOverallQualityRating());
        return saved;
    }

    @Transactional
    public ProductQualityAssessment updateAssessment(Long id, ProductQualityAssessment updates) {
        ProductQualityAssessment assessment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProductQualityAssessment", "id", id));
        if ("PUBLISHED".equals(assessment.getStatus())) {
            throw new BusinessException("Cannot update a PUBLISHED assessment", "ALREADY_PUBLISHED");
        }
        if (updates.getCustomerSatisfactionScore() != null) assessment.setCustomerSatisfactionScore(updates.getCustomerSatisfactionScore());
        if (updates.getComplaintCount() != null) assessment.setComplaintCount(updates.getComplaintCount());
        if (updates.getDefectRate() != null) assessment.setDefectRate(updates.getDefectRate());
        if (updates.getSlaMeetPct() != null) assessment.setSlaMeetPct(updates.getSlaMeetPct());
        if (updates.getSlaBreachCount() != null) assessment.setSlaBreachCount(updates.getSlaBreachCount());
        assessment.setOverallQualityRating(deriveQualityRating(assessment));
        ProductQualityAssessment saved = repository.save(assessment);
        log.info("AUDIT: Product quality assessment updated by {}: code={}, newRating={}",
                currentActorProvider.getCurrentActor(), saved.getAssessmentCode(), saved.getOverallQualityRating());
        return saved;
    }

    @Transactional
    public ProductQualityAssessment publishAssessment(Long id) {
        ProductQualityAssessment assessment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProductQualityAssessment", "id", id));
        if ("PUBLISHED".equals(assessment.getStatus())) {
            throw new BusinessException("Assessment is already PUBLISHED", "ALREADY_PUBLISHED");
        }
        assessment.setStatus("PUBLISHED");
        log.info("AUDIT: Product quality assessment published by {}: code={}",
                currentActorProvider.getCurrentActor(), assessment.getAssessmentCode());
        return repository.save(assessment);
    }

    @Transactional
    public ProductQualityAssessment closeAssessment(Long id) {
        ProductQualityAssessment assessment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProductQualityAssessment", "id", id));
        assessment.setStatus("CLOSED");
        log.info("AUDIT: Product quality assessment closed by {}: code={}",
                currentActorProvider.getCurrentActor(), assessment.getAssessmentCode());
        return repository.save(assessment);
    }

    public List<ProductQualityAssessment> getQualityTrend(String productCode) {
        return repository.findByProductCodeOrderByPeriodDateDesc(productCode);
    }

    public List<ProductQualityAssessment> getQualityDashboard() {
        return repository.findByStatusOrderByPeriodDateDesc("PUBLISHED");
    }

    /**
     * Compares two products without mutating either list.
     */
    public List<ProductQualityAssessment> compareProducts(String code1, String code2) {
        List<ProductQualityAssessment> list1 = repository.findByProductCodeOrderByPeriodDateDesc(code1);
        List<ProductQualityAssessment> list2 = repository.findByProductCodeOrderByPeriodDateDesc(code2);
        List<ProductQualityAssessment> combined = new ArrayList<>(list1.size() + list2.size());
        combined.addAll(list1);
        combined.addAll(list2);
        return combined;
    }

    private String deriveQualityRating(ProductQualityAssessment a) {
        BigDecimal satisfaction = a.getCustomerSatisfactionScore() != null ? a.getCustomerSatisfactionScore() : BigDecimal.ZERO;
        BigDecimal slaMeet = a.getSlaMeetPct() != null ? a.getSlaMeetPct() : new BigDecimal("100");
        BigDecimal defect = a.getDefectRate();

        // CRITICAL: satisfaction < 3.0 OR slaMeetPct < 80
        if (satisfaction.compareTo(new BigDecimal("3.0")) < 0 && a.getCustomerSatisfactionScore() != null) {
            return "CRITICAL";
        }
        if (slaMeet.compareTo(new BigDecimal("80")) < 0 && a.getSlaMeetPct() != null) {
            return "CRITICAL";
        }

        // EXCELLENT: satisfaction >= 4.5 AND slaMeetPct >= 98 AND defectRate < 0.5
        boolean excellentSatisfaction = satisfaction.compareTo(new BigDecimal("4.5")) >= 0;
        boolean excellentSla = slaMeet.compareTo(new BigDecimal("98")) >= 0;
        boolean excellentDefect = defect == null || defect.compareTo(new BigDecimal("0.5")) < 0;

        if (excellentSatisfaction && excellentSla && excellentDefect) {
            return "EXCELLENT";
        }

        // GOOD: satisfaction >= 4.0 AND slaMeetPct >= 90
        boolean goodSatisfaction = satisfaction.compareTo(new BigDecimal("4.0")) >= 0;
        boolean goodSla = slaMeet.compareTo(new BigDecimal("90")) >= 0;

        if (goodSatisfaction && goodSla) {
            return "GOOD";
        }

        // NEEDS_IMPROVEMENT: satisfaction < 3.5 OR slaMeetPct < 85
        boolean lowSatisfaction = a.getCustomerSatisfactionScore() != null && satisfaction.compareTo(new BigDecimal("3.5")) < 0;
        boolean lowSla = a.getSlaMeetPct() != null && slaMeet.compareTo(new BigDecimal("85")) < 0;

        if (lowSatisfaction || lowSla) {
            return "NEEDS_IMPROVEMENT";
        }

        return "SATISFACTORY";
    }
}
