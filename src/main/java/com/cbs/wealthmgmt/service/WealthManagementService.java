package com.cbs.wealthmgmt.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.repository.WealthManagementPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WealthManagementService {

    private final WealthManagementPlanRepository planRepository;

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
        return planRepository.findByAdvisorIdAndStatusOrderByPlanCodeAsc(advisorId, "ACTIVE");
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
}
