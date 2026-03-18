package com.cbs.branchnetwork.repository;
import com.cbs.branchnetwork.entity.BranchNetworkPlan; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface BranchNetworkPlanRepository extends JpaRepository<BranchNetworkPlan, Long> {
    Optional<BranchNetworkPlan> findByPlanCode(String code);
    List<BranchNetworkPlan> findByRegionOrderByPlannedStartDesc(String region);
    List<BranchNetworkPlan> findByStatusOrderByPlannedStartAsc(String status);
}
