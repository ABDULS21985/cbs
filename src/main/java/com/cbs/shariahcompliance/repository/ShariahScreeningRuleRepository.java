package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ScreeningCategory;
import com.cbs.shariahcompliance.entity.ShariahScreeningRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahScreeningRuleRepository extends JpaRepository<ShariahScreeningRule, Long> {

    Optional<ShariahScreeningRule> findByRuleCode(String ruleCode);

    List<ShariahScreeningRule> findByEnabledTrueOrderByPriorityAsc();

    List<ShariahScreeningRule> findByCategory(ScreeningCategory category);

    List<ShariahScreeningRule> findByCategoryAndEnabledTrue(ScreeningCategory category);
}
