package com.cbs.bizriskmodel.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bizriskmodel.entity.BusinessRiskAssessment;
import com.cbs.bizriskmodel.repository.BusinessRiskAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BizRiskModelService {

    private final BusinessRiskAssessmentRepository repository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_RISK_DOMAINS = Set.of(
            "CREDIT", "MARKET", "OPERATIONAL", "LIQUIDITY", "COMPLIANCE",
            "STRATEGIC", "REPUTATIONAL", "TECHNOLOGY", "LEGAL"
    );

    private static final Set<String> VALID_RISK_RATINGS = Set.of(
            "LOW", "MEDIUM", "HIGH", "CRITICAL"
    );

    private static final Set<String> VALID_CONTROL_EFFECTIVENESS = Set.of(
            "EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"
    );

    /** Risk appetite thresholds - configurable per instance */
    private int riskAppetiteWithinThreshold = 8;
    private int riskAppetiteApproachingThreshold = 15;

    @Transactional
    public BusinessRiskAssessment create(BusinessRiskAssessment a) {
        validateAssessment(a);

        // Duplicate check: same assessment name + domain + date
        List<BusinessRiskAssessment> existing = repository.findByRiskDomainAndStatusOrderByAssessmentDateDesc(
                a.getRiskDomain(), "DRAFT");
        for (BusinessRiskAssessment e : existing) {
            if (e.getAssessmentName().equalsIgnoreCase(a.getAssessmentName())
                    && e.getAssessmentDate().equals(a.getAssessmentDate())) {
                throw new BusinessException("Draft assessment already exists for domain=" + a.getRiskDomain()
                        + " name=" + a.getAssessmentName() + " date=" + a.getAssessmentDate());
            }
        }

        a.setAssessmentCode("BRA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        a.setStatus("DRAFT");

        // Auto-calculate risk rating from inherent score
        if (a.getRiskRating() == null) {
            a.setRiskRating(calculateRiskRating(a.getInherentRiskScore()));
        }

        // Set next review date if not specified (90 days for HIGH/CRITICAL, 180 for others)
        if (a.getNextReviewDate() == null) {
            int reviewDays = ("HIGH".equals(a.getRiskRating()) || "CRITICAL".equals(a.getRiskRating())) ? 90 : 180;
            a.setNextReviewDate(a.getAssessmentDate().plusDays(reviewDays));
        }

        BusinessRiskAssessment saved = repository.save(a);
        log.info("Risk assessment created by {}: code={}, domain={}, rating={}, inherentScore={}",
                actorProvider.getCurrentActor(), saved.getAssessmentCode(), saved.getRiskDomain(),
                saved.getRiskRating(), saved.getInherentRiskScore());
        return saved;
    }

    @Transactional
    public BusinessRiskAssessment complete(String code) {
        BusinessRiskAssessment a = getByCode(code);
        if (!"DRAFT".equals(a.getStatus()) && !"IN_REVIEW".equals(a.getStatus())) {
            throw new BusinessException("Only DRAFT or IN_REVIEW assessments can be completed. Current status: " + a.getStatus());
        }

        // Validate required fields for completion
        if (a.getResidualRiskScore() <= 0) {
            throw new BusinessException("Residual risk score must be set before completing assessment");
        }
        if (a.getControlEffectiveness() == null || a.getControlEffectiveness().isBlank()) {
            throw new BusinessException("Control effectiveness must be assessed before completing");
        }

        // Calculate risk appetite status using configurable thresholds
        if (a.getResidualRiskScore() <= riskAppetiteWithinThreshold) {
            a.setRiskAppetiteStatus("WITHIN");
        } else if (a.getResidualRiskScore() <= riskAppetiteApproachingThreshold) {
            a.setRiskAppetiteStatus("APPROACHING");
        } else {
            a.setRiskAppetiteStatus("EXCEEDED");
        }

        // Update risk rating based on residual score
        a.setRiskRating(calculateRiskRating(a.getResidualRiskScore()));
        a.setStatus("COMPLETED");

        log.info("Risk assessment completed by {}: code={}, residualScore={}, appetiteStatus={}, rating={}",
                actorProvider.getCurrentActor(), code, a.getResidualRiskScore(),
                a.getRiskAppetiteStatus(), a.getRiskRating());
        return repository.save(a);
    }

    /**
     * Submits a draft assessment for review.
     */
    @Transactional
    public BusinessRiskAssessment submitForReview(String code) {
        BusinessRiskAssessment a = getByCode(code);
        if (!"DRAFT".equals(a.getStatus())) {
            throw new BusinessException("Only DRAFT assessments can be submitted for review. Current: " + a.getStatus());
        }
        a.setStatus("IN_REVIEW");
        log.info("Assessment submitted for review by {}: code={}", actorProvider.getCurrentActor(), code);
        return repository.save(a);
    }

    /**
     * Adds or updates mitigation actions on an assessment.
     */
    @Transactional
    public BusinessRiskAssessment updateMitigationActions(String code, List<Map<String, Object>> mitigationActions) {
        BusinessRiskAssessment a = getByCode(code);
        if ("COMPLETED".equals(a.getStatus())) {
            throw new BusinessException("Cannot modify mitigation actions on a completed assessment");
        }

        if (mitigationActions == null || mitigationActions.isEmpty()) {
            throw new BusinessException("At least one mitigation action is required");
        }

        for (Map<String, Object> action : mitigationActions) {
            if (action.get("description") == null) {
                throw new BusinessException("Mitigation action description is required");
            }
            if (action.get("owner") == null) {
                throw new BusinessException("Mitigation action owner is required");
            }
            if (action.get("dueDate") == null) {
                throw new BusinessException("Mitigation action due date is required");
            }
            // Default status to OPEN if not provided
            action.putIfAbsent("status", "OPEN");
        }

        a.setMitigationActions(mitigationActions);
        log.info("Mitigation actions updated by {}: code={}, actionCount={}",
                actorProvider.getCurrentActor(), code, mitigationActions.size());
        return repository.save(a);
    }

    /**
     * Performs a control effectiveness assessment and recalculates residual risk.
     */
    @Transactional
    public BusinessRiskAssessment assessControlEffectiveness(String code, String effectiveness) {
        if (!VALID_CONTROL_EFFECTIVENESS.contains(effectiveness.toUpperCase())) {
            throw new BusinessException("Invalid control effectiveness: " + effectiveness
                    + ". Valid: " + VALID_CONTROL_EFFECTIVENESS);
        }

        BusinessRiskAssessment a = getByCode(code);
        if ("COMPLETED".equals(a.getStatus())) {
            throw new BusinessException("Cannot assess controls on a completed assessment");
        }

        a.setControlEffectiveness(effectiveness.toUpperCase());

        // Auto-calculate residual risk based on inherent score and control effectiveness
        double reductionFactor = switch (effectiveness.toUpperCase()) {
            case "EFFECTIVE" -> 0.40;
            case "PARTIALLY_EFFECTIVE" -> 0.20;
            case "INEFFECTIVE" -> 0.0;
            default -> 0.0;
        };

        int residualScore = (int) Math.round(a.getInherentRiskScore() * (1 - reductionFactor));
        a.setResidualRiskScore(Math.max(1, residualScore));

        log.info("Control effectiveness assessed by {}: code={}, effectiveness={}, residualScore={}",
                actorProvider.getCurrentActor(), code, effectiveness, a.getResidualRiskScore());
        return repository.save(a);
    }

    /**
     * Returns assessments that are overdue for review.
     */
    public List<BusinessRiskAssessment> getOverdueReviews() {
        List<BusinessRiskAssessment> completed = repository.findAll().stream()
                .filter(a -> "COMPLETED".equals(a.getStatus()))
                .filter(a -> a.getNextReviewDate() != null && a.getNextReviewDate().isBefore(LocalDate.now()))
                .collect(java.util.stream.Collectors.toList());

        log.info("Overdue reviews queried by {}: {} found", actorProvider.getCurrentActor(), completed.size());
        return completed;
    }

    /**
     * Updates the risk appetite thresholds.
     */
    public void configureRiskAppetiteThresholds(int withinThreshold, int approachingThreshold) {
        if (withinThreshold <= 0 || approachingThreshold <= 0) {
            throw new BusinessException("Thresholds must be positive");
        }
        if (withinThreshold >= approachingThreshold) {
            throw new BusinessException("'Within' threshold must be less than 'approaching' threshold");
        }
        this.riskAppetiteWithinThreshold = withinThreshold;
        this.riskAppetiteApproachingThreshold = approachingThreshold;
        log.info("Risk appetite thresholds updated by {}: within={}, approaching={}",
                actorProvider.getCurrentActor(), withinThreshold, approachingThreshold);
    }

    public List<BusinessRiskAssessment> getByDomain(String domain) {
        return repository.findByRiskDomainAndStatusOrderByAssessmentDateDesc(domain, "COMPLETED");
    }

    public List<BusinessRiskAssessment> getByRating(String rating) {
        return repository.findByRiskRatingOrderByAssessmentDateDesc(rating);
    }

    public BusinessRiskAssessment getByCode(String code) {
        return repository.findByAssessmentCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRiskAssessment", "assessmentCode", code));
    }

    // ---- private helpers ----

    private void validateAssessment(BusinessRiskAssessment a) {
        if (a.getAssessmentName() == null || a.getAssessmentName().isBlank()) {
            throw new BusinessException("Assessment name is required");
        }
        if (a.getRiskDomain() == null || a.getRiskDomain().isBlank()) {
            throw new BusinessException("Risk domain is required");
        }
        if (!VALID_RISK_DOMAINS.contains(a.getRiskDomain().toUpperCase())) {
            throw new BusinessException("Invalid risk domain: " + a.getRiskDomain()
                    + ". Valid: " + VALID_RISK_DOMAINS);
        }
        if (a.getAssessmentDate() == null) {
            throw new BusinessException("Assessment date is required");
        }
        if (a.getInherentRiskScore() == null || a.getInherentRiskScore() < 1 || a.getInherentRiskScore() > 25) {
            throw new BusinessException("Inherent risk score must be between 1 and 25");
        }
        if (a.getResidualRiskScore() == null) {
            a.setResidualRiskScore(a.getInherentRiskScore()); // default to inherent before controls
        }
        if (a.getRiskRating() != null && !VALID_RISK_RATINGS.contains(a.getRiskRating().toUpperCase())) {
            throw new BusinessException("Invalid risk rating: " + a.getRiskRating()
                    + ". Valid: " + VALID_RISK_RATINGS);
        }
    }

    private String calculateRiskRating(int score) {
        if (score <= 4) return "LOW";
        if (score <= 10) return "MEDIUM";
        if (score <= 18) return "HIGH";
        return "CRITICAL";
    }
}
