package com.cbs.rulesengine.repository;

import com.cbs.rulesengine.entity.BusinessRuleVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessRuleVersionRepository extends JpaRepository<BusinessRuleVersion, Long> {

    List<BusinessRuleVersion> findByRuleIdOrderByVersionNumberDesc(Long ruleId);

    Optional<BusinessRuleVersion> findByRuleIdAndVersionNumber(Long ruleId, Integer versionNumber);

    Optional<BusinessRuleVersion> findFirstByRuleIdAndEffectiveToIsNullOrderByVersionNumberDesc(Long ruleId);

    @Query("""
            select v from BusinessRuleVersion v
            where v.ruleId = :ruleId
              and v.effectiveFrom <= :asOfDate
              and (v.effectiveTo is null or v.effectiveTo > :asOfDate)
            order by v.versionNumber desc
            """)
    List<BusinessRuleVersion> findVersionsAsOf(Long ruleId, Instant asOfDate);

    long countByRuleId(Long ruleId);
}
