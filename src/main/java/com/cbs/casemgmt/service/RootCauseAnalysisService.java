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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
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
        if (from == null) {
            from = LocalDate.now().minusDays(90);
        }
        if (to == null) {
            to = LocalDate.now();
        }

        final LocalDate effectiveFrom = from;
        final LocalDate effectiveTo = to;

        List<CaseRootCauseAnalysis> rcas = rcaRepository.findByAnalysisDateBetween(effectiveFrom, effectiveTo);

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
                insight.setDateRangeStart(effectiveFrom);
                insight.setDateRangeEnd(effectiveTo);
                insight.setRootCauseCategory(category);
                insight.setTrendDirection(count >= 5 ? "INCREASING" : "STABLE");
                insight.setPriority(count >= 5 ? "HIGH" : "MEDIUM");
                insight.setStatus("IDENTIFIED");
                insights.add(patternRepository.save(insight));
            }
        });
        log.info("Pattern insights generated: count={}, period={} to {}", insights.size(), effectiveFrom, effectiveTo);
        return insights;
    }

    public List<CasePatternInsight> getAllPatterns() { return patternRepository.findAll(); }

    public List<Map<String, Object>> getRecurringRootCauses() {
        // Use date-filtered query instead of loading all RCAs into memory.
        // Default to last 12 months to bound data volume.
        LocalDate fromDate = LocalDate.now().minusMonths(12);
        LocalDate toDate = LocalDate.now();
        List<CaseRootCauseAnalysis> all = rcaRepository.findByAnalysisDateBetween(fromDate, toDate);

        Map<String, List<CaseRootCauseAnalysis>> byCategory = all.stream()
                .filter(r -> r.getRootCauseCategory() != null)
                .collect(Collectors.groupingBy(CaseRootCauseAnalysis::getRootCauseCategory));

        List<Map<String, Object>> result = new ArrayList<>();
        byCategory.forEach((category, rcas) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("category", category);

            String subCategory = rcas.stream()
                    .map(CaseRootCauseAnalysis::getRootCauseSubCategory)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            entry.put("subCategory", subCategory);
            entry.put("occurrenceCount", (long) rcas.size());
            entry.put("affectedCases", rcas.stream().map(CaseRootCauseAnalysis::getCaseId).distinct().count());

            long recentCount = rcas.stream()
                    .filter(r -> r.getAnalysisDate() != null && r.getAnalysisDate().isAfter(LocalDate.now().minusDays(30)))
                    .count();
            long olderCount = rcas.size() - recentCount;
            String trend = recentCount > olderCount ? "INCREASING" : recentCount == olderCount ? "STABLE" : "DECREASING";
            entry.put("trend", trend);

            Optional<LocalDate> firstSeen = rcas.stream()
                    .map(CaseRootCauseAnalysis::getAnalysisDate)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder());
            Optional<LocalDate> lastSeen = rcas.stream()
                    .map(CaseRootCauseAnalysis::getAnalysisDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder());
            entry.put("firstSeen", firstSeen.orElse(null));
            entry.put("lastSeen", lastSeen.orElse(null));

            double avgDays = 0.0;
            List<CaseRootCauseAnalysis> completed = rcas.stream()
                    .filter(r -> "COMPLETED".equals(r.getStatus()) || "VALIDATED".equals(r.getStatus()))
                    .filter(r -> r.getAnalysisDate() != null && r.getUpdatedAt() != null)
                    .toList();
            if (!completed.isEmpty()) {
                avgDays = completed.stream()
                        .mapToLong(r -> ChronoUnit.DAYS.between(r.getAnalysisDate(), r.getUpdatedAt().atZone(ZoneId.systemDefault()).toLocalDate()))
                        .average()
                        .orElse(0.0);
            }
            entry.put("avgResolutionDays", Math.round(avgDays * 100.0) / 100.0);

            result.add(entry);
        });

        return result;
    }

    public Map<String, Object> getRcaDashboard() {
        List<CaseRootCauseAnalysis> all = rcaRepository.findAll();
        Map<String, Object> dashboard = new LinkedHashMap<>();

        long pending = all.stream().filter(r -> "IN_PROGRESS".equals(r.getStatus())).count();
        long completed = all.stream().filter(r -> "COMPLETED".equals(r.getStatus())).count();
        long validated = all.stream().filter(r -> "VALIDATED".equals(r.getStatus())).count();

        dashboard.put("totalAnalyses", (long) all.size());
        dashboard.put("pendingAnalyses", pending);
        dashboard.put("completedAnalyses", completed);
        dashboard.put("validatedAnalyses", validated);

        Map<String, Long> byCategory = all.stream()
                .filter(r -> r.getRootCauseCategory() != null)
                .collect(Collectors.groupingBy(CaseRootCauseAnalysis::getRootCauseCategory, Collectors.counting()));
        dashboard.put("byCategory", byCategory);

        Map<String, Long> byStatus = all.stream()
                .filter(r -> r.getStatus() != null)
                .collect(Collectors.groupingBy(CaseRootCauseAnalysis::getStatus, Collectors.counting()));
        dashboard.put("byStatus", byStatus);

        List<CaseRootCauseAnalysis> finishedRcas = all.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()) || "VALIDATED".equals(r.getStatus()))
                .filter(r -> r.getAnalysisDate() != null && r.getUpdatedAt() != null)
                .toList();
        double avgDaysToComplete = 0.0;
        if (!finishedRcas.isEmpty()) {
            avgDaysToComplete = finishedRcas.stream()
                    .mapToLong(r -> ChronoUnit.DAYS.between(r.getAnalysisDate(), r.getUpdatedAt().atZone(ZoneId.systemDefault()).toLocalDate()))
                    .average()
                    .orElse(0.0);
        }
        dashboard.put("avgDaysToComplete", Math.round(avgDaysToComplete * 100.0) / 100.0);

        long totalCasesWithRca = all.stream()
                .map(CaseRootCauseAnalysis::getCaseId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        dashboard.put("totalCasesWithRca", totalCasesWithRca);

        BigDecimal financialImpactTotal = all.stream()
                .map(CaseRootCauseAnalysis::getFinancialImpact)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dashboard.put("financialImpactTotal", financialImpactTotal);

        return dashboard;
    }

    public CaseRootCauseAnalysis getByCode(String code) {
        return rcaRepository.findByRcaCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CaseRootCauseAnalysis", "rcaCode", code));
    }

    public List<CaseRootCauseAnalysis> getByCaseId(Long caseId) {
        return rcaRepository.findByCaseId(caseId);
    }

    private CaseRootCauseAnalysis getById(Long id) {
        return rcaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CaseRootCauseAnalysis", "id", id));
    }
}
