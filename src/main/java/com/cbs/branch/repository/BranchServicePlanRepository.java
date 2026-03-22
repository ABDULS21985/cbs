package com.cbs.branch.repository;

import com.cbs.branch.entity.BranchServicePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BranchServicePlanRepository extends JpaRepository<BranchServicePlan, Long> {
    List<BranchServicePlan> findByBranchId(Long branchId);
    List<BranchServicePlan> findByBranchIdAndStatus(Long branchId, String status);
    List<BranchServicePlan> findByStatusOrderByPeriodStartDesc(String status);
}
