package com.cbs.marketresearch.service;

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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketResearchService {

    private final MarketResearchProjectRepository repository;

    @Transactional
    public MarketResearchProject create(MarketResearchProject project) {
        project.setProjectCode("MRP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        project.setStatus("ACTIVE");
        project.setCreatedAt(Instant.now());
        return repository.save(project);
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

    @Transactional
    public MarketResearchProject complete(String projectCode,
                                          String findings,
                                          List<String> keyInsights,
                                          List<String> actionItems) {
        MarketResearchProject project = getByCode(projectCode);
        if ("COMPLETED".equals(project.getStatus())) {
            throw new BusinessException("Project " + projectCode + " is already completed.");
        }
        project.setStatus("COMPLETED");
        project.setFindings(findings);
        project.setKeyInsights(keyInsights);
        project.setActionItems(actionItems);
        project.setCompletedAt(Instant.now());
        return repository.save(project);
    }

    @Transactional
    public MarketResearchProject trackActions(String projectCode, Map<String, Object> data) {
        MarketResearchProject project = getByCode(projectCode);
        if (data.containsKey("actionItems")) {
            @SuppressWarnings("unchecked")
            List<String> items = (List<String>) data.get("actionItems");
            project.setActionItems(items);
        }
        return repository.save(project);
    }

    public Map<String, Object> getInsights() {
        long total = repository.count();
        long completedThisMonth = repository.countCompletedSince(
                Instant.now().minus(30, ChronoUnit.DAYS));

        List<MarketResearchProject> all = repository.findAll();
        List<String> keyThemes = all.stream()
                .filter(p -> p.getProjectType() != null)
                .map(MarketResearchProject::getProjectType)
                .distinct()
                .map(t -> t.replace('_', ' '))
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
                "keyThemes", keyThemes,
                "recommendations", recommendations
        );
    }

    private MarketResearchProject getByCode(String code) {
        return repository.findByProjectCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketResearchProject", "projectCode", code));
    }
}
