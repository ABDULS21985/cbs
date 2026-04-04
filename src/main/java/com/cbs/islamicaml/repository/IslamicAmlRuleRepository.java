package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.IslamicAmlRule;
import com.cbs.islamicaml.entity.IslamicAmlRuleCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicAmlRuleRepository extends JpaRepository<IslamicAmlRule, Long> {

    Optional<IslamicAmlRule> findByRuleCode(String ruleCode);

    List<IslamicAmlRule> findByEnabledTrueOrderByPriorityAsc();

    List<IslamicAmlRule> findByCategory(IslamicAmlRuleCategory category);

    List<IslamicAmlRule> findByCategoryAndEnabledTrue(IslamicAmlRuleCategory category);
}
