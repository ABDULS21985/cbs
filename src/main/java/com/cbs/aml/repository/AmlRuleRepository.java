package com.cbs.aml.repository;

import com.cbs.aml.entity.AmlRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AmlRuleRepository extends JpaRepository<AmlRule, Long> {
    Optional<AmlRule> findByRuleCode(String ruleCode);
    List<AmlRule> findByIsActiveTrueOrderByRuleNameAsc();
    List<AmlRule> findAllByOrderByRuleNameAsc();
}
