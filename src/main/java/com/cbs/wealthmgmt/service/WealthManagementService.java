package com.cbs.wealthmgmt.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.wealthmgmt.entity.WealthAdvisor;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.repository.WealthAdvisorRepository;
import com.cbs.wealthmgmt.repository.WealthManagementPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WealthManagementService {

    private final WealthManagementPlanRepository planRepository;
    private final WealthAdvisorRepository advisorRepository;

    // ========================================================================
    // PLAN OPERATIONS
    // ========================================================================

    @Transactional
    public WealthManagementPlan create(WealthManagementPlan plan) {
        plan.setPlanCode("WMP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        plan.setStatus("DRAFT");
        WealthManagementPlan saved = planRepository.save(plan);
        log.info("Wealth plan created: {}", saved.getPlanCode());
        return saved;
    }

    @Transactional
    public WealthManagementPlan activate(String planCode) {
        WealthManagementPlan plan = getByCode(planCode);
        plan.setStatus("ACTIVE");
        plan.setActivatedDate(LocalDate.now());
        return planRepository.save(plan);
    }

    public WealthManagementPlan getByCode(String code) {
        return planRepository.findByPlanCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("WealthManagementPlan", "planCode", code));
    }

    public List<WealthManagementPlan> getByCustomer(Long customerId) {
        return planRepository.findByCustomerIdAndStatusOrderByPlanCodeAsc(customerId, "ACTIVE");
    }

    public List<WealthManagementPlan> getByAdvisor(String advisorId) {
        return planRepository.findByAdvisorIdOrderByPlanCodeAsc(advisorId);
    }

    public List<WealthManagementPlan> getAllPlans() {
        return planRepository.findAll();
    }

    @Transactional
    public WealthManagementPlan updatePlan(String code, WealthManagementPlan updates) {
        WealthManagementPlan plan = getByCode(code);
        if (updates.getPlanType() != null) plan.setPlanType(updates.getPlanType());
        if (updates.getAdvisorId() != null) plan.setAdvisorId(updates.getAdvisorId());
        if (updates.getTotalNetWorth() != null) plan.setTotalNetWorth(updates.getTotalNetWorth());
        if (updates.getTotalInvestableAssets() != null) plan.setTotalInvestableAssets(updates.getTotalInvestableAssets());
        if (updates.getAnnualIncome() != null) plan.setAnnualIncome(updates.getAnnualIncome());
        if (updates.getTaxBracketPct() != null) plan.setTaxBracketPct(updates.getTaxBracketPct());
        if (updates.getRecommendedAllocation() != null) plan.setRecommendedAllocation(updates.getRecommendedAllocation());
        if (updates.getFinancialGoals() != null) plan.setFinancialGoals(updates.getFinancialGoals());
        if (updates.getNextReviewDate() != null) plan.setNextReviewDate(updates.getNextReviewDate());
        if (updates.getEstatePlanSummary() != null) plan.setEstatePlanSummary(updates.getEstatePlanSummary());
        if (updates.getTaxStrategy() != null) plan.setTaxStrategy(updates.getTaxStrategy());
        if (updates.getCustomerName() != null) plan.setCustomerName(updates.getCustomerName());
        if (updates.getAdvisorName() != null) plan.setAdvisorName(updates.getAdvisorName());
        if (updates.getRiskProfile() != null) plan.setRiskProfile(updates.getRiskProfile());
        if (updates.getInvestmentHorizon() != null) plan.setInvestmentHorizon(updates.getInvestmentHorizon());
        if (updates.getTargetAllocation() != null) plan.setTargetAllocation(updates.getTargetAllocation());
        if (updates.getCurrentAllocation() != null) plan.setCurrentAllocation(updates.getCurrentAllocation());
        if (updates.getAllocations() != null) plan.setAllocations(updates.getAllocations());
        if (updates.getGoals() != null) plan.setGoals(updates.getGoals());
        if (updates.getLastReviewDate() != null) plan.setLastReviewDate(updates.getLastReviewDate());
        log.info("Wealth plan updated: {}", code);
        return planRepository.save(plan);
    }

    @Transactional
    public WealthManagementPlan closePlan(String code) {
        WealthManagementPlan plan = getByCode(code);
        plan.setStatus("CLOSED");
        log.info("Wealth plan closed: {}", code);
        return planRepository.save(plan);
    }

    @Transactional
    public WealthManagementPlan addGoal(String code, Map<String, Object> goal) {
        WealthManagementPlan plan = getByCode(code);
        List<Map<String, Object>> goals = plan.getFinancialGoals();
        if (goals == null) goals = new ArrayList<>();
        goal.put("id", UUID.randomUUID().toString().substring(0, 8));
        goals.add(goal);
        plan.setFinancialGoals(goals);
        log.info("Goal added to plan {}: {}", code, goal.get("name"));
        return planRepository.save(plan);
    }

    // ========================================================================
    // ADVISOR OPERATIONS (backed by wealth_advisor table)
    // ========================================================================

    public List<WealthAdvisor> getAllAdvisors() {
        return advisorRepository.findAll();
    }

    public WealthAdvisor getAdvisorByCode(String advisorCode) {
        return advisorRepository.findByAdvisorCode(advisorCode)
                .orElseThrow(() -> new ResourceNotFoundException("WealthAdvisor", "advisorCode", advisorCode));
    }

    @Transactional
    public WealthAdvisor createAdvisor(WealthAdvisor advisor) {
        advisor.setAdvisorCode("ADV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        if (advisor.getStatus() == null) advisor.setStatus("ACTIVE");
        if (advisor.getJoinDate() == null) advisor.setJoinDate(LocalDate.now());
        WealthAdvisor saved = advisorRepository.save(advisor);
        log.info("Wealth advisor created: {}", saved.getAdvisorCode());
        return saved;
    }

    @Transactional
    public WealthAdvisor updateAdvisor(String advisorCode, WealthAdvisor updates) {
        WealthAdvisor advisor = getAdvisorByCode(advisorCode);
        if (updates.getFullName() != null) advisor.setFullName(updates.getFullName());
        if (updates.getEmail() != null) advisor.setEmail(updates.getEmail());
        if (updates.getPhone() != null) advisor.setPhone(updates.getPhone());
        if (updates.getSpecializations() != null) advisor.setSpecializations(updates.getSpecializations());
        if (updates.getMaxClients() != null) advisor.setMaxClients(updates.getMaxClients());
        if (updates.getManagementFeePct() != null) advisor.setManagementFeePct(updates.getManagementFeePct());
        if (updates.getAdvisoryFeePct() != null) advisor.setAdvisoryFeePct(updates.getAdvisoryFeePct());
        if (updates.getPerformanceFeePct() != null) advisor.setPerformanceFeePct(updates.getPerformanceFeePct());
        if (updates.getStatus() != null) advisor.setStatus(updates.getStatus());
        return advisorRepository.save(advisor);
    }

    /** Compute advisor metrics from persisted plan data. */
    public Map<String, Object> computeAdvisorMetrics(String advisorCode) {
        WealthAdvisor advisor = getAdvisorByCode(advisorCode);
        List<WealthManagementPlan> plans = planRepository.findByAdvisorIdOrderByPlanCodeAsc(advisorCode);

        long activeClients = plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).map(WealthManagementPlan::getCustomerId).distinct().count();
        BigDecimal totalAum = plans.stream()
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFees = plans.stream()
                .map(p -> p.getFeesChargedYtd() != null ? p.getFeesChargedYtd() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Compute weighted average YTD return from plans with real data
        BigDecimal weightedReturn = BigDecimal.ZERO;
        BigDecimal totalWeight = BigDecimal.ZERO;
        for (WealthManagementPlan p : plans) {
            if ("ACTIVE".equals(p.getStatus()) && p.getYtdReturn() != null && p.getTotalInvestableAssets() != null) {
                BigDecimal assets = p.getTotalInvestableAssets();
                weightedReturn = weightedReturn.add(p.getYtdReturn().multiply(assets));
                totalWeight = totalWeight.add(assets);
            }
        }
        double avgReturn = totalWeight.compareTo(BigDecimal.ZERO) > 0
                ? weightedReturn.divide(totalWeight, 4, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        BigDecimal benchmarkReturn = plans.stream()
                .filter(p -> "ACTIVE".equals(p.getStatus()) && p.getBenchmarkReturn() != null)
                .map(WealthManagementPlan::getBenchmarkReturn)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long activePlanCount = plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        double avgBenchmark = activePlanCount > 0 ? benchmarkReturn.doubleValue() / activePlanCount : 0.0;

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("advisorCode", advisorCode);
        metrics.put("advisorName", advisor.getFullName());
        metrics.put("totalAum", totalAum);
        metrics.put("clientCount", activeClients);
        metrics.put("totalPlans", (long) plans.size());
        metrics.put("activePlans", activePlanCount);
        metrics.put("totalFeesYtd", totalFees);
        metrics.put("ytdReturn", Math.round(avgReturn * 100.0) / 100.0);
        metrics.put("benchmarkReturn", Math.round(avgBenchmark * 100.0) / 100.0);
        metrics.put("alpha", Math.round((avgReturn - avgBenchmark) * 100.0) / 100.0);
        metrics.put("capacityUsed", activeClients);
        metrics.put("maxClients", advisor.getMaxClients());
        return metrics;
    }

    // ========================================================================
    // ANALYTICS (real aggregation queries)
    // ========================================================================

    public BigDecimal getTotalActiveAum() {
        return planRepository.sumActiveAum();
    }

    public long getDistinctActiveClients() {
        return planRepository.countDistinctActiveClients();
    }

    public BigDecimal getTotalFeesYtd() {
        return planRepository.sumFeesChargedYtd();
    }

    public BigDecimal getTotalContributionsYtd() {
        return planRepository.sumContributionsYtd();
    }

    public BigDecimal getTotalWithdrawalsYtd() {
        return planRepository.sumWithdrawalsYtd();
    }

    public List<WealthManagementPlan> getPlansNeedingReview() {
        return planRepository.findByNextReviewDateBeforeAndStatusNot(LocalDate.now(), "CLOSED");
    }

    /** Compute AUM by wealth segment from real plan data. */
    public List<Map<String, Object>> computeAumBySegment() {
        List<WealthManagementPlan> allPlans = planRepository.findByStatus("ACTIVE");
        BigDecimal uhnwiThreshold = new BigDecimal("1000000000");
        BigDecimal hnwiThreshold = new BigDecimal("100000000");

        Map<String, List<WealthManagementPlan>> segments = allPlans.stream()
                .collect(Collectors.groupingBy(p -> {
                    BigDecimal assets = p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO;
                    if (assets.compareTo(uhnwiThreshold) > 0) return "UHNWI";
                    if (assets.compareTo(hnwiThreshold) >= 0) return "HNWI";
                    return "Mass Affluent";
                }));

        List<Map<String, Object>> result = new ArrayList<>();
        for (String segment : List.of("UHNWI", "HNWI", "Mass Affluent")) {
            List<WealthManagementPlan> plans = segments.getOrDefault(segment, List.of());
            BigDecimal segmentAum = plans.stream()
                    .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long clientCount = plans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();

            // Compute real weighted avg return for this segment
            BigDecimal wReturn = BigDecimal.ZERO;
            BigDecimal wTotal = BigDecimal.ZERO;
            for (WealthManagementPlan p : plans) {
                if (p.getYtdReturn() != null && p.getTotalInvestableAssets() != null) {
                    wReturn = wReturn.add(p.getYtdReturn().multiply(p.getTotalInvestableAssets()));
                    wTotal = wTotal.add(p.getTotalInvestableAssets());
                }
            }
            double avgReturn = wTotal.compareTo(BigDecimal.ZERO) > 0
                    ? wReturn.divide(wTotal, 4, RoundingMode.HALF_UP).doubleValue() : 0.0;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("segment", segment);
            entry.put("clientCount", clientCount);
            entry.put("totalAum", segmentAum);
            entry.put("planCount", plans.size());
            entry.put("avgReturn", Math.round(avgReturn * 100.0) / 100.0);
            result.add(entry);
        }
        return result;
    }

    /** Compute top-N client concentration from real plan data. */
    public List<Map<String, Object>> computeConcentrationRisk(int topN) {
        List<WealthManagementPlan> allPlans = planRepository.findByStatus("ACTIVE");
        BigDecimal totalAum = allPlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<Long, BigDecimal> clientAum = allPlans.stream()
                .collect(Collectors.groupingBy(
                        WealthManagementPlan::getCustomerId,
                        Collectors.reducing(BigDecimal.ZERO,
                                p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO,
                                BigDecimal::add)));

        // Find customer names
        Map<Long, String> clientNames = allPlans.stream()
                .filter(p -> p.getCustomerName() != null)
                .collect(Collectors.toMap(WealthManagementPlan::getCustomerId, WealthManagementPlan::getCustomerName, (a, b) -> a));

        return clientAum.entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(topN)
                .map(entry -> {
                    BigDecimal clientTotal = entry.getValue();
                    double pct = totalAum.compareTo(BigDecimal.ZERO) > 0
                            ? clientTotal.multiply(BigDecimal.valueOf(100)).divide(totalAum, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    long planCount = allPlans.stream().filter(p -> p.getCustomerId().equals(entry.getKey())).count();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("customerId", entry.getKey());
                    row.put("clientName", clientNames.getOrDefault(entry.getKey(), "Client " + entry.getKey()));
                    row.put("totalAum", clientTotal);
                    row.put("percentOfTotal", pct);
                    row.put("planCount", planCount);
                    return row;
                })
                .toList();
    }

    /** Compute per-advisor performance from real plan data. */
    public List<Map<String, Object>> computePerformanceAttribution() {
        List<WealthManagementPlan> allPlans = getAllPlans();
        List<WealthAdvisor> advisors = advisorRepository.findByStatus("ACTIVE");

        return advisors.stream().map(advisor -> {
            List<WealthManagementPlan> plans = allPlans.stream()
                    .filter(p -> advisor.getAdvisorCode().equals(p.getAdvisorId()))
                    .toList();

            BigDecimal aumManaged = plans.stream()
                    .filter(p -> "ACTIVE".equals(p.getStatus()))
                    .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long clientCount = plans.stream()
                    .filter(p -> "ACTIVE".equals(p.getStatus()))
                    .map(WealthManagementPlan::getCustomerId).distinct().count();
            long activePlans = plans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();

            // Weighted average return
            BigDecimal wReturn = BigDecimal.ZERO, wTotal = BigDecimal.ZERO;
            BigDecimal benchSum = BigDecimal.ZERO;
            long benchCount = 0;
            for (WealthManagementPlan p : plans) {
                if ("ACTIVE".equals(p.getStatus()) && p.getYtdReturn() != null && p.getTotalInvestableAssets() != null) {
                    wReturn = wReturn.add(p.getYtdReturn().multiply(p.getTotalInvestableAssets()));
                    wTotal = wTotal.add(p.getTotalInvestableAssets());
                }
                if ("ACTIVE".equals(p.getStatus()) && p.getBenchmarkReturn() != null) {
                    benchSum = benchSum.add(p.getBenchmarkReturn());
                    benchCount++;
                }
            }
            double portfolioReturn = wTotal.compareTo(BigDecimal.ZERO) > 0
                    ? wReturn.divide(wTotal, 4, RoundingMode.HALF_UP).doubleValue() : 0.0;
            double benchmarkReturn = benchCount > 0 ? benchSum.doubleValue() / benchCount : 0.0;

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("advisorId", advisor.getAdvisorCode());
            map.put("advisorName", advisor.getFullName());
            map.put("aumManaged", aumManaged);
            map.put("clientCount", clientCount);
            map.put("activePlans", activePlans);
            map.put("portfolioReturn", Math.round(portfolioReturn * 100.0) / 100.0);
            map.put("benchmarkReturn", Math.round(benchmarkReturn * 100.0) / 100.0);
            map.put("excessReturn", Math.round((portfolioReturn - benchmarkReturn) * 100.0) / 100.0);
            map.put("sharpeRatio", 0.0); // Requires time-series data for proper calculation
            return map;
        }).sorted((a, b) -> Double.compare(
                ((Number) b.get("excessReturn")).doubleValue(),
                ((Number) a.get("excessReturn")).doubleValue()))
        .collect(Collectors.toList());
    }

    /** Compute fee revenue from real plan-level fee data. */
    public Map<String, BigDecimal> computeFeeBreakdown() {
        List<WealthManagementPlan> activePlans = planRepository.findByStatus("ACTIVE");
        BigDecimal totalAum = activePlans.stream()
                .map(p -> p.getTotalInvestableAssets() != null ? p.getTotalInvestableAssets() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Compute fees using per-plan rates, falling back to advisor rates, then defaults
        BigDecimal advisoryFees = BigDecimal.ZERO;
        BigDecimal managementFees = BigDecimal.ZERO;
        BigDecimal performanceFees = BigDecimal.ZERO;

        for (WealthManagementPlan plan : activePlans) {
            BigDecimal aum = plan.getTotalInvestableAssets() != null ? plan.getTotalInvestableAssets() : BigDecimal.ZERO;
            BigDecimal advRate = plan.getAdvisoryFeePct() != null ? plan.getAdvisoryFeePct() : new BigDecimal("0.0075");
            BigDecimal mgtRate = plan.getManagementFeePct() != null ? plan.getManagementFeePct() : new BigDecimal("0.0125");
            BigDecimal perfRate = plan.getPerformanceFeePct() != null ? plan.getPerformanceFeePct() : new BigDecimal("0.0020");

            advisoryFees = advisoryFees.add(aum.multiply(advRate).divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP));
            managementFees = managementFees.add(aum.multiply(mgtRate).divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP));
            performanceFees = performanceFees.add(aum.multiply(perfRate).divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP));
        }

        Map<String, BigDecimal> fees = new LinkedHashMap<>();
        fees.put("advisoryFees", advisoryFees);
        fees.put("managementFees", managementFees);
        fees.put("performanceFees", performanceFees);
        fees.put("totalFees", advisoryFees.add(managementFees).add(performanceFees));
        return fees;
    }

    /** Generate insights from real data. */
    public List<Map<String, Object>> computeInsights() {
        List<WealthManagementPlan> allPlans = getAllPlans();
        long totalPlans = allPlans.size();
        long activePlans = allPlans.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        long draftPlans = allPlans.stream().filter(p -> "DRAFT".equals(p.getStatus())).count();
        long closedPlans = allPlans.stream().filter(p -> "CLOSED".equals(p.getStatus())).count();
        long clientCount = allPlans.stream().map(WealthManagementPlan::getCustomerId).distinct().count();
        long advisorCount = advisorRepository.findByStatus("ACTIVE").size();

        long plansWithoutAdvisor = allPlans.stream()
                .filter(p -> !"CLOSED".equals(p.getStatus()))
                .filter(p -> p.getAdvisorId() == null || p.getAdvisorId().isBlank())
                .count();

        List<WealthManagementPlan> overdue = getPlansNeedingReview();
        long plansNeedingReview = overdue.size();

        BigDecimal totalAum = planRepository.sumActiveAum();

        // Concentration
        List<Map<String, Object>> topClients = computeConcentrationRisk(1);
        double topClientPct = !topClients.isEmpty() ? ((Number) topClients.get(0).get("percentOfTotal")).doubleValue() : 0.0;

        List<Map<String, Object>> insights = new ArrayList<>();

        if (draftPlans > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "ACTION_REQUIRED");
            insight.put("severity", "MEDIUM");
            insight.put("title", "Pending Plan Activations");
            insight.put("description", draftPlans + " wealth plan(s) are still in DRAFT status and awaiting activation.");
            insight.put("metric", draftPlans);
            insight.put("recommendation", "Review and activate draft plans to ensure clients receive active wealth management.");
            insights.add(insight);
        }

        if (plansWithoutAdvisor > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "WARNING");
            insight.put("severity", "HIGH");
            insight.put("title", "Unassigned Plans");
            insight.put("description", plansWithoutAdvisor + " plan(s) have no assigned wealth advisor.");
            insight.put("metric", plansWithoutAdvisor);
            insight.put("recommendation", "Assign advisors to orphaned plans to maintain service quality and client satisfaction.");
            insights.add(insight);
        }

        if (topClientPct > 15.0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "RISK");
            insight.put("severity", "HIGH");
            insight.put("title", "Client Concentration Risk");
            insight.put("description", "Top client represents " + topClientPct + "% of total AUM, exceeding the 15% threshold.");
            insight.put("metric", topClientPct);
            insight.put("recommendation", "Diversify client base to reduce concentration risk exposure.");
            insights.add(insight);
        }

        if (plansNeedingReview > 0) {
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "ACTION_REQUIRED");
            insight.put("severity", "MEDIUM");
            insight.put("title", "Overdue Plan Reviews");
            insight.put("description", plansNeedingReview + " plan(s) have passed their scheduled review date.");
            insight.put("metric", plansNeedingReview);
            insight.put("recommendation", "Schedule immediate reviews for overdue plans to maintain compliance and client trust.");
            insights.add(insight);
        }

        if (advisorCount > 0 && clientCount > 0) {
            double clientsPerAdvisor = (double) clientCount / advisorCount;
            if (clientsPerAdvisor > 20) {
                Map<String, Object> insight = new LinkedHashMap<>();
                insight.put("type", "CAPACITY");
                insight.put("severity", "MEDIUM");
                insight.put("title", "Advisor Capacity Strain");
                insight.put("description", "Average advisor manages " + Math.round(clientsPerAdvisor) + " clients, which may impact service quality.");
                insight.put("metric", Math.round(clientsPerAdvisor));
                insight.put("recommendation", "Consider hiring additional wealth advisors to maintain optimal client-to-advisor ratios.");
                insights.add(insight);
            }
        }

        if (closedPlans > 0 && totalPlans > 0) {
            double attritionRate = (double) closedPlans / totalPlans * 100;
            Map<String, Object> insight = new LinkedHashMap<>();
            insight.put("type", "TREND");
            insight.put("severity", attritionRate > 10 ? "HIGH" : "LOW");
            insight.put("title", "Client Attrition");
            insight.put("description", "Plan closure rate is " + Math.round(attritionRate * 100.0) / 100.0 + "% (" + closedPlans + " of " + totalPlans + " plans).");
            insight.put("metric", Math.round(attritionRate * 100.0) / 100.0);
            insight.put("recommendation", "Analyze reasons for plan closures and implement retention strategies.");
            insights.add(insight);
        }

        Map<String, Object> aumInsight = new LinkedHashMap<>();
        aumInsight.put("type", "INFO");
        aumInsight.put("severity", "LOW");
        aumInsight.put("title", "AUM Overview");
        aumInsight.put("description", "Total AUM stands at " + totalAum.toPlainString() + " across " + clientCount + " clients and " + totalPlans + " plans.");
        aumInsight.put("metric", totalAum);
        aumInsight.put("recommendation", "Continue monitoring AUM growth and client acquisition targets.");
        insights.add(aumInsight);

        return insights;
    }
}
