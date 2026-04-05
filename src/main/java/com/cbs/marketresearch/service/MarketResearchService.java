package com.cbs.marketresearch.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketresearch.entity.MarketResearchProject;
import com.cbs.marketresearch.repository.MarketResearchProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketResearchService {

    private final MarketResearchProjectRepository repository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_PROJECT_TYPES = Set.of(
            "CUSTOMER_SURVEY", "COMPETITIVE_ANALYSIS", "PRODUCT_STUDY", "MARKET_SIZING"
    );

    @Transactional
    public MarketResearchProject create(MarketResearchProject project) {
        validateProjectFields(project);

        if (repository.existsByTitleAndProjectType(project.getTitle(), project.getProjectType())) {
            throw new BusinessException(
                    "A research project with title '" + project.getTitle() + "' and type '" + project.getProjectType() + "' already exists.",
                    "DUPLICATE_PROJECT"
            );
        }

        project.setProjectCode("MRP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        project.setStatus("ACTIVE");
        project.setCreatedAt(Instant.now());
        project.setCreatedBy(currentActorProvider.getCurrentActor());

        MarketResearchProject saved = repository.save(project);
        log.info("Research project created: code={}, type={}, by={}",
                saved.getProjectCode(), saved.getProjectType(), saved.getCreatedBy());
        return saved;
    }

    @Transactional
    public MarketResearchProject submitForReview(String projectCode) {
        MarketResearchProject project = getByCode(projectCode);
        if (!"ACTIVE".equals(project.getStatus())) {
            throw new BusinessException(
                    "Project must be ACTIVE to submit for review. Current status: " + project.getStatus(),
                    "INVALID_STATUS"
            );
        }
        if (project.getFindings() == null || project.getFindings().isBlank()) {
            throw new BusinessException("Findings are required before submitting for review.", "MISSING_FINDINGS");
        }
        project.setStatus("IN_REVIEW");
        MarketResearchProject saved = repository.save(project);
        log.info("Research project submitted for review: code={}, by={}", projectCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketResearchProject approve(String projectCode) {
        MarketResearchProject project = getByCode(projectCode);
        if (!"IN_REVIEW".equals(project.getStatus())) {
            throw new BusinessException(
                    "Project must be IN_REVIEW to approve. Current status: " + project.getStatus(),
                    "INVALID_STATUS"
            );
        }
        String approver = currentActorProvider.getCurrentActor();
        if (approver.equals(project.getCreatedBy())) {
            throw new BusinessException("The project creator cannot approve their own project.", "SELF_APPROVAL");
        }
        project.setStatus("APPROVED");
        MarketResearchProject saved = repository.save(project);
        log.info("Research project approved: code={}, by={}", projectCode, approver);
        return saved;
    }

    public List<MarketResearchProject> getActive() {
        return repository.findByStatusOrderByCreatedAtDesc("ACTIVE");
    }

    public List<MarketResearchProject> getLibrary(String type) {
        if (type != null && !type.isBlank()) {
            return repository.findByProjectTypeOrderByCreatedAtDesc(type);
        }
        return repository.findAll();
    }

    public List<MarketResearchProject> search(String title) {
        if (title == null || title.isBlank()) {
            throw new BusinessException("Search title is required.", "INVALID_TITLE");
        }
        return repository.findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(title);
    }

    @Transactional
    public MarketResearchProject complete(String projectCode,
                                          String findings,
                                          List<String> keyInsights,
                                          List<String> actionItems) {
        MarketResearchProject project = getByCode(projectCode);
        if ("COMPLETED".equals(project.getStatus())) {
            throw new BusinessException("Project " + projectCode + " is already completed.");
        }
        if (!"ACTIVE".equals(project.getStatus()) && !"APPROVED".equals(project.getStatus())) {
            throw new BusinessException(
                    "Project must be ACTIVE or APPROVED to complete. Current status: " + project.getStatus(),
                    "INVALID_STATUS"
            );
        }
        if (findings == null || findings.isBlank()) {
            throw new BusinessException("Findings are required to complete a project.", "MISSING_FINDINGS");
        }

        project.setStatus("COMPLETED");
        project.setFindings(findings);
        project.setKeyInsights(keyInsights);
        project.setActionItems(actionItems);
        project.setCompletedAt(Instant.now());

        MarketResearchProject saved = repository.save(project);
        log.info("Research project completed: code={}, by={}", projectCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketResearchProject trackActions(String projectCode, Map<String, Object> data) {
        MarketResearchProject project = getByCode(projectCode);
        if (data.containsKey("actionItems")) {
            @SuppressWarnings("unchecked")
            List<String> items = (List<String>) data.get("actionItems");
            if (items == null || items.isEmpty()) {
                throw new BusinessException("Action items list cannot be empty.", "EMPTY_ACTION_ITEMS");
            }
            project.setActionItems(items);
        }
        log.info("Action items updated for project: code={}, by={}", projectCode, currentActorProvider.getCurrentActor());
        return repository.save(project);
    }

    public Map<String, Object> getInsights() {
        long total = repository.count();
        long completedThisMonth = repository.countCompletedSince(
                Instant.now().minus(30, ChronoUnit.DAYS));

        List<MarketResearchProject> all = repository.findAll();

        Map<String, Long> typeDistribution = all.stream()
                .filter(p -> p.getProjectType() != null)
                .collect(Collectors.groupingBy(MarketResearchProject::getProjectType, Collectors.counting()));

        List<String> keyThemes = all.stream()
                .filter(p -> p.getProjectType() != null)
                .map(MarketResearchProject::getProjectType)
                .distinct()
                .map(t -> t.replace('_', ' '))
                .collect(Collectors.toList());

        List<String> topInsights = all.stream()
                .filter(p -> "COMPLETED".equals(p.getStatus()) && p.getKeyInsights() != null)
                .flatMap(p -> p.getKeyInsights().stream())
                .limit(10)
                .collect(Collectors.toList());

        List<String> pendingActions = all.stream()
                .filter(p -> "COMPLETED".equals(p.getStatus()) && p.getActionItems() != null)
                .flatMap(p -> p.getActionItems().stream())
                .limit(10)
                .collect(Collectors.toList());

        List<String> recommendations = all.stream()
                .filter(p -> "COMPLETED".equals(p.getStatus()) && p.getFindings() != null)
                .map(MarketResearchProject::getFindings)
                .filter(f -> f.length() <= 200)
                .limit(5)
                .collect(Collectors.toList());

        return Map.of(
                "totalProjects", total,
                "completedThisMonth", completedThisMonth,
                "typeDistribution", typeDistribution,
                "keyThemes", keyThemes,
                "topInsights", topInsights,
                "pendingActions", pendingActions,
                "recommendations", recommendations
        );
    }

    private MarketResearchProject getByCode(String code) {
        return repository.findByProjectCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketResearchProject", "projectCode", code));
    }

    private void validateProjectFields(MarketResearchProject project) {
        if (project.getTitle() == null || project.getTitle().isBlank()) {
            throw new BusinessException("Project title is required.", "INVALID_TITLE");
        }
        if (project.getTitle().length() > 300) {
            throw new BusinessException("Project title must not exceed 300 characters.", "TITLE_TOO_LONG");
        }
        if (project.getProjectType() == null || project.getProjectType().isBlank()) {
            throw new BusinessException("Project type is required.", "INVALID_TYPE");
        }
        if (!VALID_PROJECT_TYPES.contains(project.getProjectType())) {
            throw new BusinessException(
                    "Invalid project type: " + project.getProjectType() + ". Valid types: " + VALID_PROJECT_TYPES,
                    "INVALID_TYPE"
            );
        }
        if (project.getDescription() == null || project.getDescription().isBlank()) {
            throw new BusinessException("Project description is required.", "MISSING_DESCRIPTION");
        }
    }
}
