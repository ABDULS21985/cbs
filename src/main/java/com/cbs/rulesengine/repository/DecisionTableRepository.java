package com.cbs.rulesengine.repository;

import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.DecisionTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DecisionTableRepository extends JpaRepository<DecisionTable, Long> {

    List<DecisionTable> findByRuleIdOrderByCreatedAtDesc(Long ruleId);

    Optional<DecisionTable> findByRuleIdAndStatus(Long ruleId, BusinessRuleStatus status);

    List<DecisionTable> findByStatusAndTenantIdOrderByUpdatedAtDesc(BusinessRuleStatus status, Long tenantId);

    List<DecisionTable> findByStatusAndTenantIdIsNullOrderByUpdatedAtDesc(BusinessRuleStatus status);
}
