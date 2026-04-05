package com.cbs.zakat.repository;

import com.cbs.zakat.entity.ZakatClassificationRule;
import com.cbs.zakat.entity.ZakatDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ZakatClassificationRuleRepository extends JpaRepository<ZakatClassificationRule, UUID> {

    Optional<ZakatClassificationRule> findByRuleCode(String ruleCode);

    List<ZakatClassificationRule> findByMethodologyCodeOrderByPriorityDescRuleCodeAsc(String methodologyCode);

    List<ZakatClassificationRule> findByMethodologyCodeAndStatusOrderByPriorityDescRuleCodeAsc(
            String methodologyCode,
            ZakatDomainEnums.RuleStatus status);

    List<ZakatClassificationRule> findByDebatedTrueOrderByMethodologyCodeAscPriorityDescRuleCodeAsc();

    List<ZakatClassificationRule> findByMethodologyCodeAndStatusAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
            String methodologyCode,
            ZakatDomainEnums.RuleStatus status,
            LocalDate effectiveFrom);
}