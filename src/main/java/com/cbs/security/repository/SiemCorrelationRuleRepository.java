package com.cbs.security.repository;

import com.cbs.security.entity.SiemCorrelationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SiemCorrelationRuleRepository extends JpaRepository<SiemCorrelationRule, Long> {
    List<SiemCorrelationRule> findByIsActiveTrueOrderByRuleNameAsc();
}
