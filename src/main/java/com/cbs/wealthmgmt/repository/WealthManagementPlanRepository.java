package com.cbs.wealthmgmt.repository;

import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WealthManagementPlanRepository extends JpaRepository<WealthManagementPlan, Long> {
    Optional<WealthManagementPlan> findByPlanCode(String code);
    List<WealthManagementPlan> findByCustomerIdAndStatusOrderByPlanCodeAsc(Long customerId, String status);
    List<WealthManagementPlan> findByAdvisorIdAndStatusOrderByPlanCodeAsc(String advisorId, String status);
}
