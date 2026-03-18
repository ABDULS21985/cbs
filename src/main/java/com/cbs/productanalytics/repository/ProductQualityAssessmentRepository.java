package com.cbs.productanalytics.repository;

import com.cbs.productanalytics.entity.ProductQualityAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductQualityAssessmentRepository extends JpaRepository<ProductQualityAssessment, Long> {
    Optional<ProductQualityAssessment> findByAssessmentCode(String assessmentCode);
    List<ProductQualityAssessment> findByProductCodeOrderByPeriodDateDesc(String productCode);
    List<ProductQualityAssessment> findByStatusOrderByPeriodDateDesc(String status);
}
