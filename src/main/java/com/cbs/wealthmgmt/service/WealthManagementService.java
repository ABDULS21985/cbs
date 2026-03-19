package com.cbs.wealthmgmt.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.repository.WealthManagementPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

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

    public java.util.List<WealthManagementPlan> getAllPlans() {
        return planRepository.findAll();
    }

}
