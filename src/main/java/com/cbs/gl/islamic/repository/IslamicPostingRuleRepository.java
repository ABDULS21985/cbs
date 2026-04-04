package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.IslamicPostingRule;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicPostingRuleRepository extends JpaRepository<IslamicPostingRule, Long> {
    Optional<IslamicPostingRule> findByRuleCode(String ruleCode);
    List<IslamicPostingRule> findByContractTypeCodeIgnoreCaseOrderByPriorityDescRuleCodeAsc(String contractTypeCode);
    List<IslamicPostingRule> findByTransactionTypeOrderByPriorityDescRuleCodeAsc(IslamicTransactionType transactionType);

    List<IslamicPostingRule> findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
            IslamicTransactionType transactionType, LocalDate effectiveFrom);
}
