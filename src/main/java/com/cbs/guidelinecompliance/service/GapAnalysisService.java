package com.cbs.guidelinecompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.guidelinecompliance.entity.ComplianceGapAnalysis;
import com.cbs.guidelinecompliance.repository.ComplianceGapAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class GapAnalysisService {

    private final ComplianceGapAnalysisRepository repository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_SEVERITIES = Set.of("CRITICAL", "HIGH", "MEDIUM", "LOW");
    private static final Set<String> TERMINAL_STATUSES = Set.of("REMEDIATED", "VERIFIED", "ACCEPTED_RISK");

    @Transactional
    public ComplianceGapAnalysis identifyGap(ComplianceGapAnalysis gap) {
        if (gap.getGapCategory() == null || gap.getGapCategory().isBlank()) {
            throw new BusinessException("Gap category is required");
        }
        if (gap.getGapSeverity() == null || gap.getGapSeverity().isBlank()) {
            throw new BusinessException("Gap severity is required");
        }
        if (!VALID_SEVERITIES.contains(gap.getGapSeverity())) {
            throw new BusinessException("Invalid severity: " + gap.getGapSeverity() + ". Must be one of " + VALID_SEVERITIES);
        }
        if (gap.getGapDescription() == null || gap.getGapDescription().isBlank()) {
            throw new BusinessException("Gap description is required");
        }
        gap.setAnalysisCode("GA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        gap.setStatus("IDENTIFIED");
        ComplianceGapAnalysis saved = repository.save(gap);
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Gap identified: code={}, severity={}, category={}, actor={}", saved.getAnalysisCode(), saved.getGapSeverity(), saved.getGapCategory(), actor);
        return saved;
    }

    @Transactional
    public ComplianceGapAnalysis planRemediation(Long gapId, String owner, String description, LocalDate targetDate) {
        ComplianceGapAnalysis gap = getById(gapId);
        gap.setRemediationOwner(owner);
        gap.setRemediationDescription(description);
        gap.setRemediationTargetDate(targetDate);
        gap.setRemediationStartDate(LocalDate.now());
        gap.setStatus("REMEDIATION_PLANNED");
        log.info("Remediation planned: code={}, owner={}, target={}", gap.getAnalysisCode(), owner, targetDate);
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis updateProgress(Long gapId, int percentageComplete, String progressNotes) {
        ComplianceGapAnalysis gap = getById(gapId);
        if (TERMINAL_STATUSES.contains(gap.getStatus())) {
            throw new BusinessException("Cannot update progress on gap " + gap.getAnalysisCode() + " in terminal status: " + gap.getStatus());
        }
        if (percentageComplete < 0 || percentageComplete > 100) {
            throw new BusinessException("Percentage must be between 0 and 100");
        }
        if (progressNotes == null || progressNotes.isBlank()) {
            throw new BusinessException("Progress notes are required when updating progress");
        }
        gap.setStatus("IN_PROGRESS");
        // Store progress in milestones map
        Map<String, Object> milestones = gap.getRemediationMilestones() != null
                ? new java.util.HashMap<>(gap.getRemediationMilestones()) : new java.util.HashMap<>();
        milestones.put("percentageComplete", percentageComplete);
        milestones.put("lastProgressNotes", progressNotes);
        milestones.put("lastProgressAt", java.time.Instant.now().toString());
        gap.setRemediationMilestones(milestones);
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Gap progress updated: code={}, progress={}%, actor={}", gap.getAnalysisCode(), percentageComplete, actor);
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis closeGap(Long gapId) {
        ComplianceGapAnalysis gap = getById(gapId);
        if (TERMINAL_STATUSES.contains(gap.getStatus())) {
            throw new BusinessException("Gap " + gap.getAnalysisCode() + " is already in terminal status: " + gap.getStatus());
        }
        if (!"IN_PROGRESS".equals(gap.getStatus()) && !"REMEDIATION_PLANNED".equals(gap.getStatus())) {
            throw new BusinessException("Gap " + gap.getAnalysisCode() + " must be IN_PROGRESS or REMEDIATION_PLANNED to close; current: " + gap.getStatus());
        }
        gap.setRemediationActualDate(LocalDate.now());
        gap.setStatus("REMEDIATED");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Gap closed: code={}, actor={}", gap.getAnalysisCode(), actor);
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis verifyGap(Long gapId, String verifiedBy) {
        ComplianceGapAnalysis gap = getById(gapId);
        if (!"REMEDIATED".equals(gap.getStatus())) {
            throw new BusinessException("Gap " + gap.getAnalysisCode() + " must be REMEDIATED to verify; current: " + gap.getStatus());
        }
        gap.setVerifiedBy(verifiedBy);
        gap.setVerifiedAt(Instant.now());
        gap.setStatus("VERIFIED");
        log.info("AUDIT: Gap verified: code={}, by={}", gap.getAnalysisCode(), verifiedBy);
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis acceptRisk(Long gapId) {
        ComplianceGapAnalysis gap = getById(gapId);
        if (TERMINAL_STATUSES.contains(gap.getStatus())) {
            throw new BusinessException("Gap " + gap.getAnalysisCode() + " is already in terminal status: " + gap.getStatus());
        }
        gap.setStatus("ACCEPTED_RISK");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Risk accepted for gap: code={}, actor={}", gap.getAnalysisCode(), actor);
        return repository.save(gap);
    }

    public Map<String, Object> getGapDashboard() {
        List<ComplianceGapAnalysis> all = repository.findAll();
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalGaps", all.size());
        dashboard.put("bySeverity", all.stream().filter(g -> g.getGapSeverity() != null).collect(Collectors.groupingBy(ComplianceGapAnalysis::getGapSeverity, Collectors.counting())));
        dashboard.put("byCategory", all.stream().filter(g -> g.getGapCategory() != null).collect(Collectors.groupingBy(ComplianceGapAnalysis::getGapCategory, Collectors.counting())));
        dashboard.put("byStatus", all.stream().collect(Collectors.groupingBy(ComplianceGapAnalysis::getStatus, Collectors.counting())));
        dashboard.put("overdueCount", getOverdueRemediations().size());
        return dashboard;
    }

    public List<ComplianceGapAnalysis> getOverdueRemediations() {
        return repository.findByRemediationTargetDateBeforeAndStatusNotIn(
                LocalDate.now(),
                List.of("REMEDIATED", "VERIFIED", "ACCEPTED_RISK"));
    }

    public ComplianceGapAnalysis getByCode(String code) {
        return repository.findByAnalysisCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceGapAnalysis", "analysisCode", code));
    }

    private ComplianceGapAnalysis getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceGapAnalysis", "id", id));
    }
}
