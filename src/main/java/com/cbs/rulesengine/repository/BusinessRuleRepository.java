package com.cbs.rulesengine.repository;

import com.cbs.rulesengine.entity.BusinessRule;
import com.cbs.rulesengine.entity.BusinessRuleCategory;
import com.cbs.rulesengine.entity.BusinessRuleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessRuleRepository extends JpaRepository<BusinessRule, Long>, JpaSpecificationExecutor<BusinessRule> {

    Optional<BusinessRule> findByRuleCodeAndTenantId(String ruleCode, Long tenantId);

    Optional<BusinessRule> findByRuleCodeAndTenantIdIsNull(String ruleCode);

    List<BusinessRule> findByStatusAndTenantIdOrderByPriorityAscRuleCodeAsc(BusinessRuleStatus status, Long tenantId);

    List<BusinessRule> findByStatusAndTenantIdIsNullOrderByPriorityAscRuleCodeAsc(BusinessRuleStatus status);

    List<BusinessRule> findByCategoryAndStatusAndTenantIdOrderByPriorityAscRuleCodeAsc(
            BusinessRuleCategory category, BusinessRuleStatus status, Long tenantId);

    List<BusinessRule> findByCategoryAndStatusAndTenantIdIsNullOrderByPriorityAscRuleCodeAsc(
            BusinessRuleCategory category, BusinessRuleStatus status);

    List<BusinessRule> findBySubCategoryAndTenantIdOrderByPriorityAscRuleCodeAsc(String subCategory, Long tenantId);

    List<BusinessRule> findBySubCategoryAndTenantIdIsNullOrderByPriorityAscRuleCodeAsc(String subCategory);

    long countByStatusAndTenantId(BusinessRuleStatus status, Long tenantId);

    long countByStatusAndTenantIdIsNull(BusinessRuleStatus status);
}
