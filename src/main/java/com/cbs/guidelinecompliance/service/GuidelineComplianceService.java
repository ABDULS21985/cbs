package com.cbs.guidelinecompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.guidelinecompliance.entity.GuidelineAssessment;
import com.cbs.guidelinecompliance.repository.GuidelineAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class GuidelineComplianceService {

    private final GuidelineAssessmentRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public GuidelineAssessment create(GuidelineAssessment assessment) {
        if (assessment.getTotalControls() <= 0) {
            throw new BusinessException("Total controls must be greater than 0");
        }
        if (assessment.getCompliantControls() > assessment.getTotalControls()) {
            throw new BusinessException("Compliant controls (" + assessment.getCompliantControls()
                    + ") cannot exceed total controls (" + assessment.getTotalControls() + ")");
        }
        if (assessment.getNotApplicable() > assessment.getTotalControls()) {
            throw new BusinessException("Not-applicable controls cannot exceed total controls");
        }
        assessment.setAssessmentCode("GA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        assessment.setStatus("DRAFT");
        GuidelineAssessment saved = repository.save(assessment);
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Guideline assessment created: code={}, source={}, actor={}", saved.getAssessmentCode(), saved.getGuidelineSource(), actor);
        return saved;
    }

    @Transactional
    public GuidelineAssessment complete(String assessmentCode) {
        GuidelineAssessment assessment = getByCode(assessmentCode);
        if ("COMPLETED".equals(assessment.getStatus())) {
            throw new BusinessException("Assessment " + assessmentCode + " is already COMPLETED");
        }

        int applicable = assessment.getTotalControls() - assessment.getNotApplicable();
        if (applicable > 0) {
            BigDecimal score = BigDecimal.valueOf(assessment.getCompliantControls())
                    .divide(BigDecimal.valueOf(applicable), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            assessment.setComplianceScorePct(score);

            if (score.compareTo(new BigDecimal("95")) >= 0) {
                assessment.setOverallRating("FULLY_COMPLIANT");
            } else if (score.compareTo(new BigDecimal("80")) >= 0) {
                assessment.setOverallRating("SUBSTANTIALLY_COMPLIANT");
            } else if (score.compareTo(new BigDecimal("60")) >= 0) {
                assessment.setOverallRating("PARTIALLY_COMPLIANT");
            } else {
                assessment.setOverallRating("NON_COMPLIANT");
            }
        } else {
            assessment.setComplianceScorePct(BigDecimal.ZERO);
            assessment.setOverallRating("NOT_ASSESSED");
        }

        assessment.setStatus("COMPLETED");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Guideline assessment completed: code={}, score={}, rating={}, actor={}",
                assessmentCode, assessment.getComplianceScorePct(), assessment.getOverallRating(), actor);
        return repository.save(assessment);
    }

    public List<GuidelineAssessment> getBySource(String guidelineSource) {
        return repository.findByGuidelineSourceAndStatusOrderByAssessmentDateDesc(guidelineSource, "COMPLETED");
    }

    public List<GuidelineAssessment> getByRating(String overallRating) {
        return repository.findByOverallRatingOrderByAssessmentDateDesc(overallRating);
    }

    private GuidelineAssessment getByCode(String code) {
        return repository.findByAssessmentCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("GuidelineAssessment", "assessmentCode", code));
    }
}
