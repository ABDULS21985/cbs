package com.cbs.marketresearch.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketresearch.entity.MarketResearchProject;
import com.cbs.marketresearch.repository.MarketResearchProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketResearchService {

    private final MarketResearchProjectRepository repository;

    @Transactional
    public MarketResearchProject createProject(MarketResearchProject project) {
        project.setProjectCode("MRP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return repository.save(project);
    }

    @Transactional
    public MarketResearchProject completeProject(String projectCode, Map<String, Object> findings, Map<String, Object> recommendations) {
        MarketResearchProject project = getByCode(projectCode);
        if (findings == null || findings.isEmpty()) {
            throw new BusinessException("Project completion requires key findings");
        }
        if (recommendations == null || recommendations.isEmpty()) {
            throw new BusinessException("Project completion requires recommendations");
        }
        project.setKeyFindings(findings);
        project.setRecommendations(recommendations);
        project.setStatus("COMPLETED");
        project.setActualEndDate(LocalDate.now());
        return repository.save(project);
    }

    @Transactional
    public MarketResearchProject trackActions(String projectCode, Map<String, Object> action) {
        MarketResearchProject project = getByCode(projectCode);
        Map<String, Object> existing = project.getActionsTaken();
        if (existing == null) {
            existing = new HashMap<>();
        }
        existing.putAll(action);
        project.setActionsTaken(existing);
        return repository.save(project);
    }

    public List<MarketResearchProject> getActiveProjects() {
        return repository.findByStatusInOrderByCreatedAtDesc(List.of("APPROVED", "IN_PROGRESS", "ANALYSIS"));
    }

    public List<MarketResearchProject> getResearchLibrary(String type) {
        return repository.findByProjectTypeAndStatusOrderByCreatedAtDesc(type, "COMPLETED");
    }

    public List<MarketResearchProject> getInsightsSummary() {
        return repository.findByStatusOrderByCreatedAtDesc("COMPLETED");
    }

    private MarketResearchProject getByCode(String code) {
        return repository.findByProjectCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketResearchProject", "projectCode", code));
    }

    public java.util.List<MarketResearchProject> getAllProjects() {
        return repository.findAll();
    }

}
