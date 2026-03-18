package com.cbs.contactcenter.repository;

import com.cbs.contactcenter.entity.RoutingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutingRuleRepository extends JpaRepository<RoutingRule, Long> {
    List<RoutingRule> findByIsActiveTrueOrderByPriorityAsc();
    List<RoutingRule> findByRuleTypeAndIsActiveTrue(String ruleType);
}
