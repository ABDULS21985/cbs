package com.cbs.governance.repository;

import com.cbs.governance.entity.SystemParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface SystemParameterRepository extends JpaRepository<SystemParameter, Long> {
    @Query("SELECT p FROM SystemParameter p WHERE p.paramKey = :key AND p.isActive = true AND p.approvalStatus = 'APPROVED' AND (p.tenantId IS NULL OR p.tenantId = :tenantId) ORDER BY p.tenantId DESC NULLS LAST, p.effectiveFrom DESC")
    List<SystemParameter> findEffective(String key, Long tenantId);

    List<SystemParameter> findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc(String category);
    List<SystemParameter> findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
    Optional<SystemParameter> findByParamKeyAndTenantIdIsNullAndIsActiveTrue(String key);
}
