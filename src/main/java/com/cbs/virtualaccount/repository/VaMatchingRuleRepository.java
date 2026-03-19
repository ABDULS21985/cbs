package com.cbs.virtualaccount.repository;

import com.cbs.virtualaccount.entity.VaMatchingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VaMatchingRuleRepository extends JpaRepository<VaMatchingRule, Long> {
    List<VaMatchingRule> findByVaIdOrderByPriorityAsc(Long vaId);
    void deleteByVaId(Long vaId);
}
