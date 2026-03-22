package com.cbs.wealthmgmt.repository;

import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WealthManagementPlanRepository extends JpaRepository<WealthManagementPlan, Long> {
    Optional<WealthManagementPlan> findByPlanCode(String code);
    List<WealthManagementPlan> findByCustomerIdAndStatusOrderByPlanCodeAsc(Long customerId, String status);
    List<WealthManagementPlan> findByAdvisorIdAndStatusOrderByPlanCodeAsc(String advisorId, String status);
    List<WealthManagementPlan> findByAdvisorIdOrderByPlanCodeAsc(String advisorId);

    List<WealthManagementPlan> findByStatus(String status);
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(p.totalInvestableAssets), 0) FROM WealthManagementPlan p WHERE p.status = 'ACTIVE'")
    BigDecimal sumActiveAum();

    @Query("SELECT COALESCE(SUM(p.feesChargedYtd), 0) FROM WealthManagementPlan p")
    BigDecimal sumFeesChargedYtd();

    @Query("SELECT COALESCE(SUM(p.contributionsYtd), 0) FROM WealthManagementPlan p")
    BigDecimal sumContributionsYtd();

    @Query("SELECT COALESCE(SUM(p.withdrawalsYtd), 0) FROM WealthManagementPlan p")
    BigDecimal sumWithdrawalsYtd();

    @Query("SELECT COUNT(DISTINCT p.customerId) FROM WealthManagementPlan p WHERE p.status = 'ACTIVE'")
    long countDistinctActiveClients();

    List<WealthManagementPlan> findByNextReviewDateBeforeAndStatusNot(LocalDate date, String status);
}
