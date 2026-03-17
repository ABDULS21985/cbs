package com.cbs.fraud.repository;

import com.cbs.fraud.entity.FraudRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface FraudRuleRepository extends JpaRepository<FraudRule, Long> {
    List<FraudRule> findByIsActiveTrueOrderByScoreWeightDesc();
    Optional<FraudRule> findByRuleCode(String code);
}
