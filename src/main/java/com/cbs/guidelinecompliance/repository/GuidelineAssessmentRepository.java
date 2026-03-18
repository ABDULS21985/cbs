package com.cbs.guidelinecompliance.repository;

import com.cbs.guidelinecompliance.entity.GuidelineAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GuidelineAssessmentRepository extends JpaRepository<GuidelineAssessment, Long> {
    Optional<GuidelineAssessment> findByAssessmentCode(String assessmentCode);
    List<GuidelineAssessment> findByGuidelineSourceAndStatusOrderByAssessmentDateDesc(String guidelineSource, String status);
    List<GuidelineAssessment> findByOverallRatingOrderByAssessmentDateDesc(String overallRating);
}
