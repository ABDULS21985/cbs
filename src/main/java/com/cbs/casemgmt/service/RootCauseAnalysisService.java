package com.cbs.casemgmt.service;

import com.cbs.casemgmt.entity.CasePatternInsight;
import com.cbs.casemgmt.entity.CaseRootCauseAnalysis;
import com.cbs.casemgmt.repository.CasePatternInsightRepository;
import com.cbs.casemgmt.repository.CaseRootCauseAnalysisRepository;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class RootCauseAnalysisService {

    private final CaseRootCauseAnalysisRepository rcaRepository;
    private final CasePatternInsightRepository patternRepository;

    @Transactional
    public CaseRootCauseAnalysis createRca(CaseRootCauseAnalysis rca) {
        rca.setRcaCode("RCA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        rca.setStatus("IN_PROGRESS");
        rca.setAnalysisDate(LocalDate.now());
        CaseRootCauseAnalysis saved = rcaRepository.save(rca);
        log.info("RCA created: code={}, caseId={}, method={}", saved.getRcaCode(), saved.getCaseId(), saved.getAnalysisMethod());
        return saved;
    }

    @Transactional
    public CaseRootCauseAnalysis addCorrectiveAction(Long rcaId, Map<String, Object> action) {
        CaseRootCauseAnalysis rca = getById(rcaId);
        Map<String, Object> actions = rca.getCorrectiveActions() != null ? new HashMap<>(rca.getCorrectiveActions()) : new HashMap<>();
        actions.put("action_" + (actions.size() + 1), action);
        rca.setCorrectiveActions(actions);
        log.info("Corrective action added: rcaCode={}", rca.getRcaCode());
        return rcaRepository.save(rca);
    }

    @Transactional
    public CaseRootCauseAnalysis completeAction(Long rcaId, String actionKey) {
        CaseRootCauseAnalysis rca = getById(rcaId);
        if (rca.getCorrectiveActions() != null && rca.getCorrectiveActions().containsKey(actionKey)) {
            Map<String, Object> actions = new HashMap<>(rca.getCorrectiveActions());
            Object actionObj = actions.get(actionKey);
            if (actionObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> actionMap = new HashMap<>((Map<String, Object>) actionObj);
                actionMap.put("status", "COMPLETED");
                actionMap.put("completedDate", LocalDate.now().toString());
                actions.put(actionKey, actionMap);
            }
            rca.setCorrectiveActions(actions);
        }
        return rcaRepository.save(rca);
    }

    @Transactional
    public CaseRootCauseAnalysis completeRca(Long rcaId) {
        CaseRootCauseAnalysis rca = getById(rcaId);
        rca.setStatus("COMPLETED");
        log.info("RCA completed: code={}", rca.getRcaCode());
        return rcaRepository.save(rca);
    }

    @Transactional
    public CaseRootCauseAnalysis validateRca(Long rcaId) {
        CaseRootCauseAnalysis rca = getById(rcaId);
        rca.setStatus("VALIDATED");
        log.info("RCA validated: code={}", rca.getRcaCode());
        return rcaRepository.save(rca);
    }

    @Transactional
    public List<CasePatternInsight> generatePatternInsights(LocalDate from, LocalDate to) {
        List<CaseRootCauseAnalysis> rcas = rcaRepository.findAll().stream()
                .filter(r -> r.getAnalysisDate() != null && !r.getAnalysisDate().isBefore(from) && !r.getAnalysisDate().isAfter(to))
                .toList();

        Map<String, Long> categoryCounts = rcas.stream()
                .filter(r -> r.getRootCauseCategory() != null)
                .collect(Collectors.groupingBy(CaseRootCauseAnalysis::getRootCauseCategory, Collectors.counting()));

        List<CasePatternInsight> insights = new ArrayList<>();
        categoryCounts.forEach((category, count) -> {
            if (count >= 2) {
                CasePatternInsight insight = new CasePatternInsight();
                insight.setPatternType("RECURRING_ROOT_CAUSE");
                insight.setPatternDescription("Recurring root cause: " + category + " (" + count + " cases)");
                insight.setCaseCount(count.intValue());
                insight.setDateRangeStart(from);
                insight.setDateRangeEnd(to);
                insight.setRootCauseCategory(category);
                insight.setTrendDirection(count >= 5 ? "INCREASING" : "STABLE");
                insight.setPriority(count >= 5 ? "HIGH" : "MEDIUM");
                insight.setStatus("IDENTIFIED");
                insights.add(patternRepository.save(insight));
            }
        });
        log.info("Pattern insights generated: count={}, period={} to {}", insights.size(), from, to);
        return insights;
    }

    public List<CasePatternInsight> getAllPatterns() { return patternRepository.findAll(); }

    public Map<String, Long> getRecurringRootCauses() {
        return rcaRepository.findAll().stream()
                .filter(r -> r.getRootCauseCategory() != null)
                .collect(Collectors.groupingBy(CaseRootCauseAnalysis::getRootCauseCategory, Collectors.counting()));
    }

    public Map<String, Object> getRcaDashboard() {
        List<CaseRootCauseAnalysis> all = rcaRepository.findAll();
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalRcas", all.size());
        dashboard.put("inProgress", all.stream().filter(r -> "IN_PROGRESS".equals(r.getStatus())).count());
        dashboard.put("completed", all.stream().filter(r -> "COMPLETED".equals(r.getStatus())).count());
        dashboard.put("validated", all.stream().filter(r -> "VALIDATED".equals(r.getStatus())).count());
        dashboard.put("topCategories", getRecurringRootCauses());
        return dashboard;
    }

    public CaseRootCauseAnalysis getByCode(String code) {
        return rcaRepository.findByRcaCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CaseRootCauseAnalysis", "rcaCode", code));
    }

    private CaseRootCauseAnalysis getById(Long id) {
        return rcaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CaseRootCauseAnalysis", "id", id));
    }
}
