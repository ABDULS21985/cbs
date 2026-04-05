package com.cbs.msganalysis.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.msganalysis.entity.MessageAnalysis;
import com.cbs.msganalysis.repository.MessageAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MessageAnalysisService {

    private final MessageAnalysisRepository analysisRepository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_ANALYSIS_TYPES = Set.of(
            "SANCTIONS_CHECK", "FRAUD_DETECTION", "AML_SCREENING", "FORMAT_VALIDATION",
            "COMPLIANCE_CHECK", "DUPLICATE_DETECTION", "AMOUNT_THRESHOLD"
    );

    private static final Set<String> VALID_SEVERITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> VALID_RESULTS = Set.of("PASS", "FAIL", "WARNING", "INCONCLUSIVE");
    private static final Set<String> VALID_AUTO_ACTIONS = Set.of("HOLD", "REJECT", "RELEASE", "ESCALATE");

    private static final Map<String, String> SEVERITY_RULES = Map.of(
            "SANCTIONS_CHECK", "CRITICAL",
            "FRAUD_DETECTION", "HIGH",
            "AML_SCREENING", "HIGH",
            "AMOUNT_THRESHOLD", "MEDIUM",
            "FORMAT_VALIDATION", "LOW",
            "DUPLICATE_DETECTION", "MEDIUM",
            "COMPLIANCE_CHECK", "HIGH"
    );

    private static final Map<String, String> DEFAULT_ACTIONS = Map.of(
            "CRITICAL", "HOLD",
            "HIGH", "HOLD",
            "MEDIUM", "ESCALATE",
            "LOW", "RELEASE"
    );

    @Transactional
    public MessageAnalysis analyze(MessageAnalysis analysis) {
        validateAnalysisFields(analysis);

        if (analysisRepository.existsByMessageRefAndAnalysisType(analysis.getMessageRef(), analysis.getAnalysisType())) {
            log.warn("Duplicate analysis detected: messageRef={}, type={}. Proceeding with new analysis.",
                    analysis.getMessageRef(), analysis.getAnalysisType());
        }

        analysis.setAnalysisId("MA-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        analysis.setCreatedAt(Instant.now());

        // Apply rule engine: derive severity from analysis type if not explicitly set
        if (analysis.getSeverity() == null || "LOW".equals(analysis.getSeverity())) {
            String derivedSeverity = SEVERITY_RULES.getOrDefault(analysis.getAnalysisType(), "LOW");
            if ("FAIL".equals(analysis.getResult())) {
                analysis.setSeverity(derivedSeverity);
            }
        }

        // Apply auto-action based on severity for FAIL results
        if ("FAIL".equals(analysis.getResult()) && (analysis.getAutoAction() == null || analysis.getAutoAction().isBlank())) {
            String effectiveSeverity = analysis.getSeverity() != null ? analysis.getSeverity() : "LOW";
            analysis.setAutoAction(DEFAULT_ACTIONS.getOrDefault(effectiveSeverity, "RELEASE"));
        }

        // Set rule triggered if not provided
        if (analysis.getRuleTriggered() == null || analysis.getRuleTriggered().isBlank()) {
            analysis.setRuleTriggered(analysis.getAnalysisType() + "_DEFAULT_RULE");
        }

        MessageAnalysis saved = analysisRepository.save(analysis);

        if ("FAIL".equals(saved.getResult()) || "CRITICAL".equals(saved.getSeverity())) {
            log.warn("Message analysis FAIL: id={}, type={}, rule={}, severity={}, action={}",
                    saved.getAnalysisId(), saved.getAnalysisType(), saved.getRuleTriggered(),
                    saved.getSeverity(), saved.getAutoAction());
        } else {
            log.info("Message analysis completed: id={}, type={}, result={}",
                    saved.getAnalysisId(), saved.getAnalysisType(), saved.getResult());
        }

        return saved;
    }

    @Transactional
    public MessageAnalysis review(String analysisId, String decision, String reviewNotes) {
        MessageAnalysis analysis = analysisRepository.findAll().stream()
                .filter(a -> analysisId.equals(a.getAnalysisId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("MessageAnalysis", "analysisId", analysisId));

        if (analysis.getReviewedBy() != null) {
            throw new BusinessException("Analysis " + analysisId + " has already been reviewed.", "ALREADY_REVIEWED");
        }
        if (!"FAIL".equals(analysis.getResult())) {
            throw new BusinessException("Only FAIL results require review.", "REVIEW_NOT_REQUIRED");
        }
        if (decision == null || decision.isBlank()) {
            throw new BusinessException("Review decision is required.", "MISSING_DECISION");
        }
        if (!Set.of("RELEASE", "REJECT", "ESCALATE").contains(decision)) {
            throw new BusinessException("Invalid review decision: " + decision, "INVALID_DECISION");
        }

        analysis.setAutoAction(decision);
        analysis.setReviewedBy(currentActorProvider.getCurrentActor());
        analysis.setReviewedAt(Instant.now());
        if (reviewNotes != null && !reviewNotes.isBlank()) {
            String existingDetails = analysis.getDetails() != null ? analysis.getDetails() + "\n" : "";
            analysis.setDetails(existingDetails + "REVIEW: " + reviewNotes);
        }

        MessageAnalysis saved = analysisRepository.save(analysis);
        log.info("Message analysis reviewed: id={}, decision={}, by={}",
                analysisId, decision, saved.getReviewedBy());
        return saved;
    }

    public List<MessageAnalysis> getByMessage(String messageRef) {
        if (messageRef == null || messageRef.isBlank()) {
            throw new BusinessException("Message reference is required.", "INVALID_MESSAGE_REF");
        }
        return analysisRepository.findByMessageRefOrderByCreatedAtDesc(messageRef);
    }

    public List<MessageAnalysis> getActionRequired() {
        return analysisRepository.findByResultAndAutoActionOrderByCreatedAtDesc("FAIL", "HOLD");
    }

    public List<MessageAnalysis> getBySeverity(String severity) {
        if (severity == null || !VALID_SEVERITIES.contains(severity)) {
            throw new BusinessException("Invalid severity: " + severity + ". Valid: " + VALID_SEVERITIES, "INVALID_SEVERITY");
        }
        return analysisRepository.findBySeverityOrderByCreatedAtDesc(severity);
    }

    public List<MessageAnalysis> getByType(String analysisType) {
        if (analysisType == null || !VALID_ANALYSIS_TYPES.contains(analysisType)) {
            throw new BusinessException("Invalid analysis type: " + analysisType, "INVALID_TYPE");
        }
        return analysisRepository.findByAnalysisTypeOrderByCreatedAtDesc(analysisType);
    }

    private void validateAnalysisFields(MessageAnalysis analysis) {
        if (analysis.getMessageRef() == null || analysis.getMessageRef().isBlank()) {
            throw new BusinessException("Message reference is required.", "INVALID_MESSAGE_REF");
        }
        if (analysis.getAnalysisType() == null || analysis.getAnalysisType().isBlank()) {
            throw new BusinessException("Analysis type is required.", "INVALID_TYPE");
        }
        if (!VALID_ANALYSIS_TYPES.contains(analysis.getAnalysisType())) {
            throw new BusinessException(
                    "Invalid analysis type: " + analysis.getAnalysisType() + ". Valid types: " + VALID_ANALYSIS_TYPES,
                    "INVALID_TYPE"
            );
        }
        if (analysis.getResult() == null || analysis.getResult().isBlank()) {
            throw new BusinessException("Result is required.", "INVALID_RESULT");
        }
        if (!VALID_RESULTS.contains(analysis.getResult())) {
            throw new BusinessException(
                    "Invalid result: " + analysis.getResult() + ". Valid results: " + VALID_RESULTS,
                    "INVALID_RESULT"
            );
        }
        if (analysis.getAutoAction() != null && !analysis.getAutoAction().isBlank()
                && !VALID_AUTO_ACTIONS.contains(analysis.getAutoAction())) {
            throw new BusinessException(
                    "Invalid auto action: " + analysis.getAutoAction() + ". Valid actions: " + VALID_AUTO_ACTIONS,
                    "INVALID_ACTION"
            );
        }
    }
}
