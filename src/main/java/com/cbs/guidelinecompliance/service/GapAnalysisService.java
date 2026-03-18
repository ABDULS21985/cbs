package com.cbs.guidelinecompliance.service;

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

    @Transactional
    public ComplianceGapAnalysis identifyGap(ComplianceGapAnalysis gap) {
        gap.setAnalysisCode("GA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        gap.setStatus("IDENTIFIED");
        ComplianceGapAnalysis saved = repository.save(gap);
        log.info("Gap identified: code={}, severity={}, category={}", saved.getAnalysisCode(), saved.getGapSeverity(), saved.getGapCategory());
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
    public ComplianceGapAnalysis updateProgress(Long gapId) {
        ComplianceGapAnalysis gap = getById(gapId);
        gap.setStatus("IN_PROGRESS");
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis closeGap(Long gapId) {
        ComplianceGapAnalysis gap = getById(gapId);
        gap.setRemediationActualDate(LocalDate.now());
        gap.setStatus("REMEDIATED");
        log.info("Gap closed: code={}", gap.getAnalysisCode());
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis verifyGap(Long gapId, String verifiedBy) {
        ComplianceGapAnalysis gap = getById(gapId);
        gap.setVerifiedBy(verifiedBy);
        gap.setVerifiedAt(Instant.now());
        gap.setStatus("VERIFIED");
        log.info("Gap verified: code={}, by={}", gap.getAnalysisCode(), verifiedBy);
        return repository.save(gap);
    }

    @Transactional
    public ComplianceGapAnalysis acceptRisk(Long gapId) {
        ComplianceGapAnalysis gap = getById(gapId);
        gap.setStatus("ACCEPTED_RISK");
        log.info("Risk accepted for gap: code={}", gap.getAnalysisCode());
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
        return repository.findAll().stream()
                .filter(g -> g.getRemediationTargetDate() != null)
                .filter(g -> g.getRemediationTargetDate().isBefore(LocalDate.now()))
                .filter(g -> !"REMEDIATED".equals(g.getStatus()) && !"VERIFIED".equals(g.getStatus()) && !"ACCEPTED_RISK".equals(g.getStatus()))
                .toList();
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
